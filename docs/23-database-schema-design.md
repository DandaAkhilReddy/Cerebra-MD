# Database Schema Design - Cerebra-MD Platform

## Overview
Complete database schema design for the Cerebra-MD healthcare analytics platform, including all tables, relationships, indexes, constraints, and SQL implementation code.

## Database Architecture Overview

### Technology Stack
- **Primary Database**: Azure SQL Database (Premium P2 tier)
- **Analytics Database**: Azure Databricks with Delta Lake
- **Cache Layer**: Azure Redis Cache
- **Search Engine**: Azure Cognitive Search
- **Time-Series Data**: Azure Time Series Insights

### Schema Design Principles
1. **HIPAA Compliance**: All PHI data encrypted and access-controlled
2. **Normalization**: 3NF for transactional data, denormalized for analytics
3. **Audit Trail**: Complete audit logging for all data changes
4. **Soft Deletes**: Maintain data integrity with logical deletes
5. **Temporal Data**: Track historical changes with effective dating
6. **Performance**: Optimized for read-heavy analytics workloads

## Core Database Schema (Azure SQL Database)

### 1. Patient Management Tables

#### Patients Table
```sql
-- Core patient demographics and information
CREATE TABLE dbo.Patients (
    PatientID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    MRN VARCHAR(20) NOT NULL UNIQUE,
    FirstName NVARCHAR(50) NOT NULL,
    LastName NVARCHAR(50) NOT NULL,
    DateOfBirth DATE NOT NULL,
    Gender CHAR(1) CHECK (Gender IN ('M', 'F', 'U')),
    SSN VARCHAR(11) NULL, -- Encrypted column
    PhoneNumber VARCHAR(15) NULL,
    Email NVARCHAR(100) NULL,
    
    -- Address Information
    AddressLine1 NVARCHAR(100) NULL,
    AddressLine2 NVARCHAR(100) NULL,
    City NVARCHAR(50) NULL,
    State VARCHAR(2) NULL,
    ZipCode VARCHAR(10) NULL,
    Country VARCHAR(2) DEFAULT 'US',
    
    -- Insurance Information
    PrimaryInsuranceID UNIQUEIDENTIFIER NULL,
    SecondaryInsuranceID UNIQUEIDENTIFIER NULL,
    
    -- System Fields
    Status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (Status IN ('ACTIVE', 'INACTIVE', 'DECEASED')),
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(50) NOT NULL,
    ModifiedDate DATETIME2 DEFAULT GETUTCDATE(),
    ModifiedBy NVARCHAR(50) NOT NULL,
    IsDeleted BIT DEFAULT 0,
    DeletedDate DATETIME2 NULL,
    DeletedBy NVARCHAR(50) NULL,
    
    -- Audit fields
    RowVersion ROWVERSION,
    
    -- Indexes
    INDEX IX_Patients_MRN (MRN),
    INDEX IX_Patients_LastName_FirstName (LastName, FirstName),
    INDEX IX_Patients_DOB (DateOfBirth),
    INDEX IX_Patients_Status (Status) WHERE Status = 'ACTIVE'
);

-- Add encryption for sensitive fields
ALTER TABLE dbo.Patients 
ADD CONSTRAINT CK_SSN_Format CHECK (SSN LIKE '[0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9][0-9][0-9]' OR SSN IS NULL);

-- Create encrypted column for SSN
ALTER TABLE dbo.Patients ALTER COLUMN SSN ADD ENCRYPTED WITH (
    COLUMN_ENCRYPTION_KEY = CerebraMD_CEK,
    ENCRYPTION_TYPE = DETERMINISTIC,
    ALGORITHM = 'AEAD_AES_256_CBC_HMAC_SHA_256'
);
```

#### Insurance Plans Table
```sql
-- Insurance plan information
CREATE TABLE dbo.InsurancePlans (
    InsuranceID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    PayerID VARCHAR(20) NOT NULL,
    PayerName NVARCHAR(100) NOT NULL,
    PlanName NVARCHAR(100) NOT NULL,
    PlanType VARCHAR(20) NOT NULL CHECK (PlanType IN ('HMO', 'PPO', 'EPO', 'POS', 'HDHP', 'INDEMNITY')),
    PolicyNumber VARCHAR(50) NOT NULL,
    GroupNumber VARCHAR(50) NULL,
    
    -- Contact Information
    PayerPhone VARCHAR(15) NULL,
    PayerAddress NVARCHAR(200) NULL,
    ClaimsAddress NVARCHAR(200) NULL,
    
    -- Coverage Information
    EffectiveDate DATE NOT NULL,
    TerminationDate DATE NULL,
    CopayAmount DECIMAL(10,2) NULL,
    DeductibleAmount DECIMAL(10,2) NULL,
    OutOfPocketMax DECIMAL(10,2) NULL,
    
    -- System Fields
    IsActive BIT DEFAULT 1,
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(50) NOT NULL,
    ModifiedDate DATETIME2 DEFAULT GETUTCDATE(),
    ModifiedBy NVARCHAR(50) NOT NULL,
    
    INDEX IX_Insurance_PayerID (PayerID),
    INDEX IX_Insurance_PayerName (PayerName),
    INDEX IX_Insurance_Active (IsActive) WHERE IsActive = 1
);
```

### 2. Provider and Facility Management

#### Providers Table
```sql
-- Healthcare provider information
CREATE TABLE dbo.Providers (
    ProviderID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    NPI VARCHAR(10) NOT NULL UNIQUE,
    FirstName NVARCHAR(50) NOT NULL,
    LastName NVARCHAR(50) NOT NULL,
    Credentials NVARCHAR(50) NULL,
    
    -- Professional Information
    Specialty VARCHAR(50) NOT NULL,
    SubSpecialty VARCHAR(50) NULL,
    LicenseNumber VARCHAR(20) NOT NULL,
    LicenseState VARCHAR(2) NOT NULL,
    DEANumber VARCHAR(15) NULL,
    
    -- Contact Information
    Phone VARCHAR(15) NULL,
    Email NVARCHAR(100) NULL,
    FacilityID UNIQUEIDENTIFIER NOT NULL,
    
    -- Employment Information
    HireDate DATE NOT NULL,
    TerminationDate DATE NULL,
    EmploymentStatus VARCHAR(20) DEFAULT 'ACTIVE' 
        CHECK (EmploymentStatus IN ('ACTIVE', 'INACTIVE', 'TERMINATED', 'SUSPENDED')),
    
    -- Financial Information
    HourlyRate DECIMAL(10,2) NULL,
    SalaryAmount DECIMAL(12,2) NULL,
    CommissionRate DECIMAL(5,4) NULL,
    
    -- System Fields
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(50) NOT NULL,
    ModifiedDate DATETIME2 DEFAULT GETUTCDATE(),
    ModifiedBy NVARCHAR(50) NOT NULL,
    IsDeleted BIT DEFAULT 0,
    
    INDEX IX_Providers_NPI (NPI),
    INDEX IX_Providers_Specialty (Specialty),
    INDEX IX_Providers_Status (EmploymentStatus) WHERE EmploymentStatus = 'ACTIVE',
    INDEX IX_Providers_Facility (FacilityID)
);

-- Add constraint for NPI format validation
ALTER TABLE dbo.Providers 
ADD CONSTRAINT CK_NPI_Format CHECK (LEN(NPI) = 10 AND ISNUMERIC(NPI) = 1);
```

#### Facilities Table
```sql
-- Healthcare facility information
CREATE TABLE dbo.Facilities (
    FacilityID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    FacilityName NVARCHAR(100) NOT NULL,
    FacilityType VARCHAR(30) NOT NULL 
        CHECK (FacilityType IN ('HOSPITAL', 'CLINIC', 'ASC', 'OFFICE', 'URGENT_CARE')),
    NPI VARCHAR(10) NOT NULL UNIQUE,
    TaxID VARCHAR(12) NOT NULL,
    
    -- Address Information
    AddressLine1 NVARCHAR(100) NOT NULL,
    AddressLine2 NVARCHAR(100) NULL,
    City NVARCHAR(50) NOT NULL,
    State VARCHAR(2) NOT NULL,
    ZipCode VARCHAR(10) NOT NULL,
    Phone VARCHAR(15) NOT NULL,
    
    -- Operational Information
    LicenseNumber VARCHAR(50) NOT NULL,
    AccreditationBody VARCHAR(50) NULL,
    AccreditationExpiry DATE NULL,
    
    -- System Fields
    IsActive BIT DEFAULT 1,
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(50) NOT NULL,
    ModifiedDate DATETIME2 DEFAULT GETUTCDATE(),
    ModifiedBy NVARCHAR(50) NOT NULL,
    
    INDEX IX_Facilities_Name (FacilityName),
    INDEX IX_Facilities_Type (FacilityType),
    INDEX IX_Facilities_Active (IsActive) WHERE IsActive = 1
);
```

### 3. Clinical Encounter Management

#### Encounters Table
```sql
-- Patient encounters and visits
CREATE TABLE dbo.Encounters (
    EncounterID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    PatientID UNIQUEIDENTIFIER NOT NULL,
    ProviderID UNIQUEIDENTIFIER NOT NULL,
    FacilityID UNIQUEIDENTIFIER NOT NULL,
    
    -- Encounter Details
    EncounterNumber VARCHAR(20) NOT NULL UNIQUE,
    EncounterDate DATE NOT NULL,
    EncounterTime TIME NOT NULL,
    EncounterType VARCHAR(20) NOT NULL 
        CHECK (EncounterType IN ('OFFICE', 'INPATIENT', 'OUTPATIENT', 'EMERGENCY', 'URGENT', 'TELEHEALTH')),
    
    -- Clinical Information
    ChiefComplaint NVARCHAR(500) NULL,
    PrimaryDiagnosisCode VARCHAR(10) NOT NULL,
    PrimaryDiagnosis NVARCHAR(200) NOT NULL,
    
    -- Visit Information
    CheckInTime DATETIME2 NULL,
    CheckOutTime DATETIME2 NULL,
    VisitDuration AS DATEDIFF(MINUTE, CheckInTime, CheckOutTime),
    
    -- Status Tracking
    EncounterStatus VARCHAR(20) DEFAULT 'SCHEDULED' 
        CHECK (EncounterStatus IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
    
    -- Financial Information
    ExpectedCharges DECIMAL(12,2) NULL,
    ActualCharges DECIMAL(12,2) NULL,
    PatientResponsibility DECIMAL(12,2) NULL,
    
    -- System Fields
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(50) NOT NULL,
    ModifiedDate DATETIME2 DEFAULT GETUTCDATE(),
    ModifiedBy NVARCHAR(50) NOT NULL,
    IsDeleted BIT DEFAULT 0,
    
    -- Foreign Keys
    FOREIGN KEY (PatientID) REFERENCES dbo.Patients(PatientID),
    FOREIGN KEY (ProviderID) REFERENCES dbo.Providers(ProviderID),
    FOREIGN KEY (FacilityID) REFERENCES dbo.Facilities(FacilityID),
    
    -- Indexes
    INDEX IX_Encounters_Patient (PatientID),
    INDEX IX_Encounters_Provider (ProviderID),
    INDEX IX_Encounters_Date (EncounterDate),
    INDEX IX_Encounters_Status (EncounterStatus),
    INDEX IX_Encounters_Composite (FacilityID, EncounterDate, ProviderID)
);
```

#### Diagnoses Table
```sql
-- Diagnosis codes for encounters
CREATE TABLE dbo.Diagnoses (
    DiagnosisID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    EncounterID UNIQUEIDENTIFIER NOT NULL,
    
    -- Diagnosis Information
    DiagnosisCode VARCHAR(10) NOT NULL,
    DiagnosisDescription NVARCHAR(200) NOT NULL,
    DiagnosisType VARCHAR(20) NOT NULL 
        CHECK (DiagnosisType IN ('PRIMARY', 'SECONDARY', 'ADMITTING', 'DISCHARGE')),
    DiagnosisOrder TINYINT NOT NULL DEFAULT 1,
    
    -- ICD Information
    ICDVersion VARCHAR(10) NOT NULL DEFAULT 'ICD-10-CM',
    ICDCategory VARCHAR(50) NULL,
    
    -- Present on Admission
    POAIndicator CHAR(1) NULL CHECK (POAIndicator IN ('Y', 'N', 'U', 'W')),
    
    -- System Fields
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(50) NOT NULL,
    
    FOREIGN KEY (EncounterID) REFERENCES dbo.Encounters(EncounterID),
    
    INDEX IX_Diagnoses_Encounter (EncounterID),
    INDEX IX_Diagnoses_Code (DiagnosisCode),
    INDEX IX_Diagnoses_Type (DiagnosisType)
);
```

#### Procedures Table
```sql
-- Procedure codes for encounters
CREATE TABLE dbo.Procedures (
    ProcedureID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    EncounterID UNIQUEIDENTIFIER NOT NULL,
    
    -- Procedure Information
    ProcedureCode VARCHAR(10) NOT NULL,
    ProcedureDescription NVARCHAR(200) NOT NULL,
    ProcedureDate DATE NOT NULL,
    
    -- CPT Information
    CPTCode VARCHAR(5) NULL,
    CPTDescription NVARCHAR(200) NULL,
    ModifierCode VARCHAR(2) NULL,
    
    -- Quantity and Units
    Quantity DECIMAL(8,2) DEFAULT 1,
    Units VARCHAR(10) NULL,
    
    -- Financial Information
    ChargeAmount DECIMAL(10,2) NOT NULL,
    AllowedAmount DECIMAL(10,2) NULL,
    
    -- System Fields
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(50) NOT NULL,
    
    FOREIGN KEY (EncounterID) REFERENCES dbo.Encounters(EncounterID),
    
    INDEX IX_Procedures_Encounter (EncounterID),
    INDEX IX_Procedures_Code (ProcedureCode),
    INDEX IX_Procedures_CPT (CPTCode),
    INDEX IX_Procedures_Date (ProcedureDate)
);
```

### 4. Billing and Claims Management

#### Claims Table
```sql
-- Insurance claims processing
CREATE TABLE dbo.Claims (
    ClaimID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    EncounterID UNIQUEIDENTIFIER NOT NULL,
    PatientID UNIQUEIDENTIFIER NOT NULL,
    InsuranceID UNIQUEIDENTIFIER NOT NULL,
    
    -- Claim Identification
    ClaimNumber VARCHAR(30) NOT NULL UNIQUE,
    OriginalClaimNumber VARCHAR(30) NULL, -- For resubmissions
    ClaimType VARCHAR(20) NOT NULL 
        CHECK (ClaimType IN ('ORIGINAL', 'CORRECTED', 'VOID', 'REPLACEMENT')),
    
    -- Claim Dates
    ServiceDateFrom DATE NOT NULL,
    ServiceDateTo DATE NOT NULL,
    SubmissionDate DATETIME2 NOT NULL,
    ReceivedDate DATETIME2 NULL,
    ProcessedDate DATETIME2 NULL,
    
    -- Financial Information
    BilledAmount DECIMAL(12,2) NOT NULL,
    AllowedAmount DECIMAL(12,2) NULL,
    PaidAmount DECIMAL(12,2) NULL,
    PatientResponsibility DECIMAL(12,2) NULL,
    AdjustmentAmount DECIMAL(12,2) NULL DEFAULT 0,
    
    -- Status Information
    ClaimStatus VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED'
        CHECK (ClaimStatus IN ('DRAFT', 'SUBMITTED', 'PENDING', 'PAID', 'DENIED', 'PARTIAL', 'APPEALED')),
    
    -- Processing Information
    ClearinghouseID VARCHAR(20) NULL,
    BatchID VARCHAR(30) NULL,
    SubmissionAttempts INT DEFAULT 1,
    
    -- System Fields
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(50) NOT NULL,
    ModifiedDate DATETIME2 DEFAULT GETUTCDATE(),
    ModifiedBy NVARCHAR(50) NOT NULL,
    
    FOREIGN KEY (EncounterID) REFERENCES dbo.Encounters(EncounterID),
    FOREIGN KEY (PatientID) REFERENCES dbo.Patients(PatientID),
    FOREIGN KEY (InsuranceID) REFERENCES dbo.InsurancePlans(InsuranceID),
    
    INDEX IX_Claims_Status (ClaimStatus),
    INDEX IX_Claims_Submission (SubmissionDate),
    INDEX IX_Claims_Patient (PatientID),
    INDEX IX_Claims_Insurance (InsuranceID),
    INDEX IX_Claims_Number (ClaimNumber)
);
```

#### Denials Table
```sql
-- Claim denials and rejection tracking
CREATE TABLE dbo.Denials (
    DenialID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ClaimID UNIQUEIDENTIFIER NOT NULL,
    
    -- Denial Information
    DenialDate DATE NOT NULL,
    DenialReasonCode VARCHAR(10) NOT NULL,
    DenialReasonDescription NVARCHAR(500) NOT NULL,
    DenialCategory VARCHAR(30) NOT NULL 
        CHECK (DenialCategory IN ('AUTHORIZATION', 'ELIGIBILITY', 'CODING', 'DOCUMENTATION', 'TIMELY_FILING', 'DUPLICATE', 'OTHER')),
    
    -- Financial Impact
    DeniedAmount DECIMAL(12,2) NOT NULL,
    RecoverableAmount DECIMAL(12,2) NULL,
    
    -- Resolution Tracking
    DenialStatus VARCHAR(20) DEFAULT 'OPEN' 
        CHECK (DenialStatus IN ('OPEN', 'IN_PROGRESS', 'APPEALED', 'RESOLVED', 'WRITTEN_OFF')),
    AssignedTo NVARCHAR(50) NULL,
    DueDate DATE NULL,
    
    -- Appeal Information
    AppealDate DATE NULL,
    AppealNumber VARCHAR(30) NULL,
    AppealStatus VARCHAR(20) NULL 
        CHECK (AppealStatus IN ('SUBMITTED', 'PENDING', 'APPROVED', 'DENIED', 'PARTIAL')),
    AppealAmount DECIMAL(12,2) NULL,
    
    -- Resolution
    ResolutionDate DATE NULL,
    ResolutionAmount DECIMAL(12,2) NULL,
    ResolutionNotes NVARCHAR(1000) NULL,
    
    -- System Fields
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(50) NOT NULL,
    ModifiedDate DATETIME2 DEFAULT GETUTCDATE(),
    ModifiedBy NVARCHAR(50) NOT NULL,
    
    FOREIGN KEY (ClaimID) REFERENCES dbo.Claims(ClaimID),
    
    INDEX IX_Denials_Claim (ClaimID),
    INDEX IX_Denials_Status (DenialStatus),
    INDEX IX_Denials_Category (DenialCategory),
    INDEX IX_Denials_Date (DenialDate),
    INDEX IX_Denials_Assigned (AssignedTo) WHERE AssignedTo IS NOT NULL
);
```

#### Payments Table
```sql
-- Payment and remittance tracking
CREATE TABLE dbo.Payments (
    PaymentID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ClaimID UNIQUEIDENTIFIER NOT NULL,
    
    -- Payment Information
    PaymentDate DATE NOT NULL,
    PaymentAmount DECIMAL(12,2) NOT NULL,
    PaymentMethod VARCHAR(20) NOT NULL 
        CHECK (PaymentMethod IN ('EFT', 'CHECK', 'CASH', 'CREDIT_CARD', 'DEBIT_CARD')),
    
    -- Remittance Information
    RemittanceNumber VARCHAR(30) NULL,
    CheckNumber VARCHAR(20) NULL,
    EFTTraceNumber VARCHAR(30) NULL,
    
    -- Payer Information
    PayerID VARCHAR(20) NOT NULL,
    PayerName NVARCHAR(100) NOT NULL,
    
    -- Adjustment Information
    AdjustmentAmount DECIMAL(12,2) DEFAULT 0,
    AdjustmentReason NVARCHAR(200) NULL,
    
    -- Processing Information
    DepositDate DATE NULL,
    BankAccount VARCHAR(20) NULL,
    BatchID VARCHAR(30) NULL,
    
    -- System Fields
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(50) NOT NULL,
    ModifiedDate DATETIME2 DEFAULT GETUTCDATE(),
    ModifiedBy NVARCHAR(50) NOT NULL,
    
    FOREIGN KEY (ClaimID) REFERENCES dbo.Claims(ClaimID),
    
    INDEX IX_Payments_Claim (ClaimID),
    INDEX IX_Payments_Date (PaymentDate),
    INDEX IX_Payments_Payer (PayerID),
    INDEX IX_Payments_Amount (PaymentAmount),
    INDEX IX_Payments_Method (PaymentMethod)
);
```

### 5. Reference and Configuration Tables

#### CPT Codes Table
```sql
-- Current Procedural Terminology codes
CREATE TABLE dbo.CPTCodes (
    CPTCodeID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    CPTCode VARCHAR(5) NOT NULL UNIQUE,
    Description NVARCHAR(500) NOT NULL,
    Category VARCHAR(50) NOT NULL,
    Section VARCHAR(100) NOT NULL,
    
    -- RVU Information
    WorkRVU DECIMAL(8,4) NULL,
    PracticeExpenseRVU DECIMAL(8,4) NULL,
    MalpracticeRVU DECIMAL(8,4) NULL,
    TotalRVU DECIMAL(8,4) NULL,
    
    -- Pricing Information
    MedicareAmount DECIMAL(10,2) NULL,
    FacilityAmount DECIMAL(10,2) NULL,
    NonFacilityAmount DECIMAL(10,2) NULL,
    
    -- Status Information
    IsActive BIT DEFAULT 1,
    EffectiveDate DATE NOT NULL,
    EndDate DATE NULL,
    
    -- System Fields
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(50) NOT NULL,
    ModifiedDate DATETIME2 DEFAULT GETUTCDATE(),
    ModifiedBy NVARCHAR(50) NOT NULL,
    
    INDEX IX_CPT_Code (CPTCode),
    INDEX IX_CPT_Category (Category),
    INDEX IX_CPT_Active (IsActive) WHERE IsActive = 1
);
```

#### ICD Codes Table
```sql
-- International Classification of Diseases codes
CREATE TABLE dbo.ICDCodes (
    ICDCodeID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ICDCode VARCHAR(10) NOT NULL,
    ICDVersion VARCHAR(10) NOT NULL DEFAULT 'ICD-10-CM',
    Description NVARCHAR(500) NOT NULL,
    Category VARCHAR(50) NOT NULL,
    Chapter VARCHAR(100) NOT NULL,
    
    -- Classification Information
    IsCC BIT DEFAULT 0, -- Complication/Comorbidity
    IsMCC BIT DEFAULT 0, -- Major Complication/Comorbidity
    DRGWeight DECIMAL(6,4) NULL,
    
    -- Status Information
    IsActive BIT DEFAULT 1,
    EffectiveDate DATE NOT NULL,
    EndDate DATE NULL,
    
    -- System Fields
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(50) NOT NULL,
    
    INDEX IX_ICD_Code_Version (ICDCode, ICDVersion),
    INDEX IX_ICD_Category (Category),
    INDEX IX_ICD_Active (IsActive) WHERE IsActive = 1,
    
    UNIQUE (ICDCode, ICDVersion)
);
```

## Analytics Schema (Databricks Delta Lake)

### Bronze Layer (Raw Data)
```sql
-- Raw encounters from AdvancedMD
CREATE TABLE bronze.raw_encounters (
    encounter_id STRING,
    patient_mrn STRING,
    provider_npi STRING,
    facility_id STRING,
    encounter_date DATE,
    encounter_type STRING,
    chief_complaint STRING,
    primary_diagnosis_code STRING,
    total_charges DECIMAL(12,2),
    extraction_timestamp TIMESTAMP,
    source_system STRING DEFAULT 'AdvancedMD',
    file_name STRING,
    batch_id STRING
) USING DELTA
PARTITIONED BY (encounter_date)
LOCATION 'abfss://bronze@cerebradata.dfs.core.windows.net/encounters/'
TBLPROPERTIES (
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact' = 'true'
);

-- Raw claims data
CREATE TABLE bronze.raw_claims (
    claim_id STRING,
    encounter_id STRING,
    claim_number STRING,
    submission_date DATE,
    payer_id STRING,
    billed_amount DECIMAL(12,2),
    claim_status STRING,
    extraction_timestamp TIMESTAMP,
    source_system STRING DEFAULT 'AdvancedMD',
    batch_id STRING
) USING DELTA
PARTITIONED BY (submission_date)
LOCATION 'abfss://bronze@cerebradata.dfs.core.windows.net/claims/';
```

### Silver Layer (Cleansed Data)
```sql
-- Cleansed encounters with business rules applied
CREATE TABLE silver.encounters (
    encounter_id STRING NOT NULL,
    patient_id STRING NOT NULL,
    provider_id STRING NOT NULL,
    facility_id STRING NOT NULL,
    encounter_date DATE NOT NULL,
    encounter_type STRING NOT NULL,
    
    -- Clinical information
    primary_diagnosis_code STRING NOT NULL,
    primary_diagnosis_description STRING,
    procedure_codes ARRAY<STRING>,
    
    -- Financial information
    total_charges DECIMAL(12,2) NOT NULL,
    expected_reimbursement DECIMAL(12,2),
    patient_responsibility DECIMAL(12,2),
    
    -- Calculated fields
    charge_per_rvu DECIMAL(10,2),
    case_complexity_score INT,
    
    -- Data quality
    data_quality_score DOUBLE,
    validation_errors ARRAY<STRING>,
    
    -- Audit fields
    created_timestamp TIMESTAMP DEFAULT current_timestamp(),
    updated_timestamp TIMESTAMP DEFAULT current_timestamp(),
    created_by STRING DEFAULT 'ETL_PROCESS'
) USING DELTA
PARTITIONED BY (encounter_date)
LOCATION 'abfss://silver@cerebradata.dfs.core.windows.net/encounters/'
TBLPROPERTIES (
  'delta.constraints.valid_encounter_date' = 'encounter_date IS NOT NULL AND encounter_date >= "2020-01-01"',
  'delta.constraints.positive_charges' = 'total_charges > 0'
);

-- Cleansed claims with standardized statuses
CREATE TABLE silver.claims (
    claim_id STRING NOT NULL,
    encounter_id STRING NOT NULL,
    patient_id STRING NOT NULL,
    payer_id STRING NOT NULL,
    
    -- Claim information
    claim_number STRING NOT NULL,
    claim_type STRING NOT NULL,
    submission_date DATE NOT NULL,
    service_date_from DATE NOT NULL,
    service_date_to DATE NOT NULL,
    
    -- Financial data
    billed_amount DECIMAL(12,2) NOT NULL,
    allowed_amount DECIMAL(12,2),
    paid_amount DECIMAL(12,2),
    patient_responsibility DECIMAL(12,2),
    adjustment_amount DECIMAL(12,2),
    
    -- Status tracking
    claim_status STRING NOT NULL,
    days_outstanding INT,
    submission_attempts INT DEFAULT 1,
    
    -- Calculated metrics
    collection_rate DECIMAL(5,4),
    days_to_payment INT,
    is_denied BOOLEAN,
    is_paid BOOLEAN,
    
    -- Data lineage
    created_timestamp TIMESTAMP DEFAULT current_timestamp(),
    updated_timestamp TIMESTAMP DEFAULT current_timestamp(),
    source_file STRING,
    batch_id STRING
) USING DELTA
PARTITIONED BY (submission_date)
LOCATION 'abfss://silver@cerebradata.dfs.core.windows.net/claims/';

-- Denial analysis table
CREATE TABLE silver.denials (
    denial_id STRING NOT NULL,
    claim_id STRING NOT NULL,
    encounter_id STRING NOT NULL,
    patient_id STRING NOT NULL,
    provider_id STRING NOT NULL,
    facility_id STRING NOT NULL,
    payer_id STRING NOT NULL,
    
    -- Denial information
    denial_date DATE NOT NULL,
    denial_reason_code STRING NOT NULL,
    denial_reason_description STRING,
    denial_category STRING NOT NULL,
    denied_amount DECIMAL(12,2) NOT NULL,
    
    -- Classification
    is_preventable BOOLEAN,
    complexity_category STRING,
    responsibility_party STRING, -- PROVIDER, PAYER, PATIENT, SYSTEM
    
    -- Resolution tracking
    denial_status STRING NOT NULL,
    assigned_to STRING,
    due_date DATE,
    days_to_resolution INT,
    
    -- Appeal information
    appeal_date DATE,
    appeal_status STRING,
    appeal_amount DECIMAL(12,2),
    recovery_amount DECIMAL(12,2),
    
    -- Analytics fields
    is_recurring_issue BOOLEAN,
    related_denials_count INT,
    financial_impact_score DOUBLE,
    
    created_timestamp TIMESTAMP DEFAULT current_timestamp(),
    updated_timestamp TIMESTAMP DEFAULT current_timestamp()
) USING DELTA
PARTITIONED BY (denial_date)
LOCATION 'abfss://silver@cerebradata.dfs.core.windows.net/denials/';
```

### Gold Layer (Business Metrics)
```sql
-- Daily financial KPIs
CREATE TABLE gold.daily_financial_kpis (
    business_date DATE NOT NULL,
    facility_id STRING NOT NULL,
    facility_name STRING NOT NULL,
    
    -- Volume metrics
    total_encounters INT NOT NULL,
    total_new_patients INT NOT NULL,
    total_return_patients INT NOT NULL,
    
    -- Revenue metrics
    total_charges DECIMAL(12,2) NOT NULL,
    total_collections DECIMAL(12,2) NOT NULL,
    total_adjustments DECIMAL(12,2) NOT NULL,
    net_revenue DECIMAL(12,2) NOT NULL,
    
    -- Collection metrics
    net_collection_rate DECIMAL(5,4) NOT NULL,
    gross_collection_rate DECIMAL(5,4) NOT NULL,
    days_in_ar DECIMAL(8,2) NOT NULL,
    
    -- Denial metrics
    total_denials INT NOT NULL,
    denial_rate DECIMAL(5,4) NOT NULL,
    denied_amount DECIMAL(12,2) NOT NULL,
    
    -- Efficiency metrics
    cost_to_collect DECIMAL(10,2),
    revenue_per_encounter DECIMAL(10,2),
    encounters_per_provider DECIMAL(8,2),
    
    -- Benchmarking
    collection_rate_benchmark DECIMAL(5,4),
    denial_rate_benchmark DECIMAL(5,4),
    performance_score DECIMAL(8,4),
    
    created_timestamp TIMESTAMP DEFAULT current_timestamp()
) USING DELTA
PARTITIONED BY (business_date)
LOCATION 'abfss://gold@cerebradata.dfs.core.windows.net/daily_kpis/'
TBLPROPERTIES (
  'delta.constraints.valid_rates' = 'net_collection_rate BETWEEN 0 AND 1 AND denial_rate BETWEEN 0 AND 1'
);

-- Provider performance analytics
CREATE TABLE gold.provider_performance (
    analysis_month DATE NOT NULL,
    provider_id STRING NOT NULL,
    provider_name STRING NOT NULL,
    specialty STRING NOT NULL,
    facility_id STRING NOT NULL,
    
    -- Productivity metrics
    total_encounters INT NOT NULL,
    total_procedures INT NOT NULL,
    total_work_rvus DECIMAL(12,4) NOT NULL,
    encounters_per_day DECIMAL(8,2) NOT NULL,
    
    -- Financial performance
    total_charges DECIMAL(12,2) NOT NULL,
    total_collections DECIMAL(12,2) NOT NULL,
    revenue_per_rvu DECIMAL(10,2) NOT NULL,
    collection_rate DECIMAL(5,4) NOT NULL,
    
    -- Quality metrics
    documentation_score DECIMAL(5,4),
    coding_accuracy_rate DECIMAL(5,4),
    denial_rate DECIMAL(5,4),
    patient_satisfaction_score DECIMAL(5,4),
    
    -- Comparative analysis
    peer_group_ranking INT,
    percentile_rank DECIMAL(5,4),
    benchmark_variance DECIMAL(8,4),
    
    -- Trends
    mom_change_encounters DECIMAL(8,4),
    mom_change_revenue DECIMAL(8,4),
    yoy_change_encounters DECIMAL(8,4),
    yoy_change_revenue DECIMAL(8,4),
    
    created_timestamp TIMESTAMP DEFAULT current_timestamp()
) USING DELTA
PARTITIONED BY (analysis_month)
LOCATION 'abfss://gold@cerebradata.dfs.core.windows.net/provider_performance/';

-- AR aging analysis
CREATE TABLE gold.ar_aging_summary (
    snapshot_date DATE NOT NULL,
    facility_id STRING NOT NULL,
    payer_id STRING,
    payer_name STRING,
    
    -- AR buckets
    current_0_30 DECIMAL(12,2) NOT NULL DEFAULT 0,
    days_31_60 DECIMAL(12,2) NOT NULL DEFAULT 0,
    days_61_90 DECIMAL(12,2) NOT NULL DEFAULT 0,
    days_91_120 DECIMAL(12,2) NOT NULL DEFAULT 0,
    days_over_120 DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_ar DECIMAL(12,2) NOT NULL,
    
    -- Percentages
    current_percent DECIMAL(5,4),
    days_31_60_percent DECIMAL(5,4),
    days_61_90_percent DECIMAL(5,4),
    days_91_120_percent DECIMAL(5,4),
    days_over_120_percent DECIMAL(5,4),
    
    -- Metrics
    average_days_outstanding DECIMAL(8,2),
    median_days_outstanding DECIMAL(8,2),
    weighted_average_age DECIMAL(8,2),
    
    -- Trends
    trend_7_days DECIMAL(8,4),
    trend_30_days DECIMAL(8,4),
    trend_90_days DECIMAL(8,4),
    
    created_timestamp TIMESTAMP DEFAULT current_timestamp()
) USING DELTA
PARTITIONED BY (snapshot_date)
LOCATION 'abfss://gold@cerebradata.dfs.core.windows.net/ar_aging/';
```

## Data Quality and Constraints

### Data Quality Framework
```sql
-- Great Expectations data quality suite implementation
CREATE TABLE bronze.data_quality_checks (
    check_id STRING NOT NULL,
    table_name STRING NOT NULL,
    column_name STRING,
    expectation_type STRING NOT NULL,
    expectation_config MAP<STRING, STRING>,
    check_timestamp TIMESTAMP NOT NULL,
    
    -- Results
    success BOOLEAN NOT NULL,
    result_details MAP<STRING, STRING>,
    unexpected_count BIGINT,
    unexpected_percent DECIMAL(5,4),
    
    batch_id STRING NOT NULL
) USING DELTA
PARTITIONED BY (DATE(check_timestamp))
LOCATION 'abfss://bronze@cerebradata.dfs.core.windows.net/quality_checks/';

-- Data validation rules
INSERT INTO bronze.data_quality_checks VALUES
('encounter_completeness', 'silver.encounters', 'encounter_id', 'expect_column_values_to_not_be_null', 
 map('column', 'encounter_id'), current_timestamp(), true, map(), 0, 0.0, 'batch_001'),
('charge_amount_positive', 'silver.encounters', 'total_charges', 'expect_column_values_to_be_between',
 map('min_value', '0.01', 'max_value', '1000000'), current_timestamp(), true, map(), 0, 0.0, 'batch_001'),
('encounter_date_valid', 'silver.encounters', 'encounter_date', 'expect_column_values_to_be_between',
 map('min_value', '2020-01-01', 'max_value', '2030-12-31'), current_timestamp(), true, map(), 0, 0.0, 'batch_001');
```

### Performance Indexes and Optimization
```sql
-- Optimize Delta tables for query performance
OPTIMIZE silver.encounters ZORDER BY (facility_id, provider_id, encounter_date);
OPTIMIZE silver.claims ZORDER BY (payer_id, claim_status, submission_date);
OPTIMIZE silver.denials ZORDER BY (facility_id, denial_category, denial_date);

-- Vacuum old files to improve performance
VACUUM silver.encounters RETAIN 168 HOURS; -- 7 days
VACUUM silver.claims RETAIN 168 HOURS;
VACUUM silver.denials RETAIN 168 HOURS;

-- Create bloom filter indexes for frequently filtered columns
CREATE BLOOMFILTER INDEX idx_encounters_patient_id ON silver.encounters (patient_id) OPTIONS (fpp=0.1);
CREATE BLOOMFILTER INDEX idx_claims_claim_number ON silver.claims (claim_number) OPTIONS (fpp=0.1);
```

## Stored Procedures and Functions

### Key Business Logic Procedures
```sql
-- Calculate denial rates by provider
CREATE OR REPLACE FUNCTION calculate_denial_rate(
    provider_id STRING,
    start_date DATE,
    end_date DATE
) RETURNS DECIMAL(5,4)
LANGUAGE SQL
DETERMINISTIC
COMMENT 'Calculate denial rate for a provider within date range'
RETURN (
    SELECT 
        COALESCE(
            (SELECT COUNT(*) FROM silver.denials d 
             JOIN silver.claims c ON d.claim_id = c.claim_id 
             WHERE c.provider_id = provider_id 
             AND d.denial_date BETWEEN start_date AND end_date) 
            / 
            NULLIF((SELECT COUNT(*) FROM silver.claims 
                    WHERE provider_id = provider_id 
                    AND submission_date BETWEEN start_date AND end_date), 0)
            , 0.0
        )
);

-- Calculate net collection rate
CREATE OR REPLACE FUNCTION calculate_net_collection_rate(
    facility_id STRING,
    month_date DATE
) RETURNS DECIMAL(5,4)
LANGUAGE SQL
DETERMINISTIC
COMMENT 'Calculate net collection rate for facility by month'
RETURN (
    WITH monthly_data AS (
        SELECT 
            SUM(c.paid_amount) as total_payments,
            SUM(c.billed_amount - c.adjustment_amount) as net_charges
        FROM silver.claims c
        JOIN silver.encounters e ON c.encounter_id = e.encounter_id
        WHERE e.facility_id = facility_id
        AND DATE_TRUNC('month', c.submission_date) = DATE_TRUNC('month', month_date)
    )
    SELECT 
        COALESCE(total_payments / NULLIF(net_charges, 0), 0.0)
    FROM monthly_data
);

-- Generate comprehensive KPI report
CREATE OR REPLACE PROCEDURE generate_monthly_kpi_report(
    report_month DATE,
    facility_id STRING
)
LANGUAGE SQL
AS
BEGIN
    -- Calculate and insert monthly KPIs
    INSERT INTO gold.monthly_kpi_summary
    SELECT 
        report_month,
        facility_id,
        COUNT(DISTINCT e.encounter_id) as total_encounters,
        COUNT(DISTINCT e.patient_id) as unique_patients,
        SUM(e.total_charges) as total_charges,
        SUM(COALESCE(p.payment_amount, 0)) as total_collections,
        calculate_net_collection_rate(facility_id, report_month) as net_collection_rate,
        calculate_denial_rate(null, 
            DATE_TRUNC('month', report_month), 
            LAST_DAY(report_month)) as overall_denial_rate,
        AVG(DATEDIFF(p.payment_date, c.submission_date)) as avg_days_to_payment,
        current_timestamp()
    FROM silver.encounters e
    LEFT JOIN silver.claims c ON e.encounter_id = c.encounter_id
    LEFT JOIN silver.payments p ON c.claim_id = p.claim_id
    WHERE e.facility_id = facility_id
    AND DATE_TRUNC('month', e.encounter_date) = DATE_TRUNC('month', report_month)
    GROUP BY report_month, facility_id;
    
    -- Update provider performance metrics
    INSERT INTO gold.provider_performance
    SELECT 
        report_month,
        e.provider_id,
        pr.provider_name,
        pr.specialty,
        e.facility_id,
        COUNT(e.encounter_id) as total_encounters,
        SUM(CASE WHEN p.procedure_code IS NOT NULL THEN 1 ELSE 0 END) as total_procedures,
        SUM(COALESCE(cpt.work_rvu, 0)) as total_work_rvus,
        COUNT(e.encounter_id) / COUNT(DISTINCT DATE(e.encounter_date)) as encounters_per_day,
        SUM(e.total_charges) as total_charges,
        SUM(COALESCE(pay.payment_amount, 0)) as total_collections,
        AVG(e.total_charges / NULLIF(cpt.work_rvu, 0)) as revenue_per_rvu,
        SUM(COALESCE(pay.payment_amount, 0)) / NULLIF(SUM(e.total_charges), 0) as collection_rate,
        current_timestamp()
    FROM silver.encounters e
    JOIN dbo.providers pr ON e.provider_id = pr.provider_id
    LEFT JOIN silver.procedures p ON e.encounter_id = p.encounter_id
    LEFT JOIN dbo.cptcodes cpt ON p.procedure_code = cpt.cpt_code
    LEFT JOIN silver.claims c ON e.encounter_id = c.encounter_id
    LEFT JOIN silver.payments pay ON c.claim_id = pay.claim_id
    WHERE e.facility_id = facility_id
    AND DATE_TRUNC('month', e.encounter_date) = DATE_TRUNC('month', report_month)
    GROUP BY report_month, e.provider_id, pr.provider_name, pr.specialty, e.facility_id;
END;
```

---

*Complete Database Schema Design for Cerebra-MD Healthcare Analytics Platform*