-- =============================================================================
-- Core Database Schema Creation Script
-- Cerebra-MD Healthcare Analytics Platform
-- =============================================================================

USE CerebraMD;
GO

-- =============================================================================
-- 1. PATIENT MANAGEMENT TABLES
-- =============================================================================

-- Patients table with HIPAA compliance
CREATE TABLE dbo.Patients (
    PatientID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    MRN VARCHAR(20) NOT NULL UNIQUE,
    FirstName NVARCHAR(50) NOT NULL,
    LastName NVARCHAR(50) NOT NULL,
    DateOfBirth DATE NOT NULL,
    Gender CHAR(1) CHECK (Gender IN ('M', 'F', 'U', 'O')),
    SSN VARBINARY(256) NULL, -- Encrypted field
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
    
    -- Clinical Information
    PrimaryCareProviderID UNIQUEIDENTIFIER NULL,
    PreferredLanguage VARCHAR(10) DEFAULT 'EN',
    RaceEthnicity VARCHAR(50) NULL,
    MaritalStatus VARCHAR(20) NULL,
    
    -- Emergency Contact
    EmergencyContactName NVARCHAR(100) NULL,
    EmergencyContactPhone VARCHAR(15) NULL,
    EmergencyContactRelationship VARCHAR(50) NULL,
    
    -- System Fields
    Status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (Status IN ('ACTIVE', 'INACTIVE', 'DECEASED', 'MERGED')),
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    ModifiedDate DATETIME2 DEFAULT GETUTCDATE(),
    ModifiedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    IsDeleted BIT DEFAULT 0,
    DeletedDate DATETIME2 NULL,
    DeletedBy NVARCHAR(50) NULL,
    
    -- Audit and versioning
    RowVersion ROWVERSION,
    DataHash AS HASHBYTES('SHA2_256', 
        CONCAT(MRN, FirstName, LastName, CAST(DateOfBirth AS VARCHAR(10)))),
    
    -- Indexes
    INDEX IX_Patients_MRN (MRN) WHERE IsDeleted = 0,
    INDEX IX_Patients_LastName_FirstName (LastName, FirstName) WHERE IsDeleted = 0,
    INDEX IX_Patients_DOB (DateOfBirth) WHERE IsDeleted = 0,
    INDEX IX_Patients_Status (Status) WHERE Status = 'ACTIVE',
    INDEX IX_Patients_CreatedDate (CreatedDate),
    INDEX IX_Patients_Hash (DataHash)
);

-- Patient audit trail
CREATE TABLE dbo.PatientAuditTrail (
    AuditID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    PatientID UNIQUEIDENTIFIER NOT NULL,
    Operation VARCHAR(10) NOT NULL CHECK (Operation IN ('INSERT', 'UPDATE', 'DELETE')),
    FieldName VARCHAR(50) NOT NULL,
    OldValue NVARCHAR(MAX) NULL,
    NewValue NVARCHAR(MAX) NULL,
    ChangedBy NVARCHAR(50) NOT NULL,
    ChangedDate DATETIME2 DEFAULT GETUTCDATE(),
    UserIPAddress VARCHAR(45) NULL,
    ApplicationName VARCHAR(100) NULL,
    
    INDEX IX_PatientAudit_Patient (PatientID),
    INDEX IX_PatientAudit_Date (ChangedDate),
    INDEX IX_PatientAudit_User (ChangedBy)
);

-- =============================================================================
-- 2. PROVIDER AND FACILITY MANAGEMENT
-- =============================================================================

-- Facilities table
CREATE TABLE dbo.Facilities (
    FacilityID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    FacilityCode VARCHAR(10) NOT NULL UNIQUE,
    FacilityName NVARCHAR(100) NOT NULL,
    FacilityType VARCHAR(30) NOT NULL 
        CHECK (FacilityType IN ('HOSPITAL', 'CLINIC', 'ASC', 'OFFICE', 'URGENT_CARE', 'IMAGING_CENTER', 'LAB')),
    NPI VARCHAR(10) NOT NULL UNIQUE,
    TaxID VARCHAR(12) NOT NULL,
    
    -- Address Information
    AddressLine1 NVARCHAR(100) NOT NULL,
    AddressLine2 NVARCHAR(100) NULL,
    City NVARCHAR(50) NOT NULL,
    State VARCHAR(2) NOT NULL,
    ZipCode VARCHAR(10) NOT NULL,
    Country VARCHAR(2) DEFAULT 'US',
    Phone VARCHAR(15) NOT NULL,
    Fax VARCHAR(15) NULL,
    Email NVARCHAR(100) NULL,
    Website NVARCHAR(200) NULL,
    
    -- Operational Information
    LicenseNumber VARCHAR(50) NOT NULL,
    LicenseState VARCHAR(2) NOT NULL,
    AccreditationBody VARCHAR(50) NULL,
    AccreditationNumber VARCHAR(50) NULL,
    AccreditationExpiry DATE NULL,
    
    -- Financial Information
    CostCenter VARCHAR(20) NULL,
    BillingEntity VARCHAR(100) NULL,
    
    -- Operational Hours
    OperatingHoursJSON NVARCHAR(1000) NULL, -- JSON format for flexible scheduling
    TimeZone VARCHAR(50) DEFAULT 'Eastern Standard Time',
    
    -- System Fields
    IsActive BIT DEFAULT 1,
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    ModifiedDate DATETIME2 DEFAULT GETUTCDATE(),
    ModifiedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    
    INDEX IX_Facilities_Code (FacilityCode),
    INDEX IX_Facilities_Name (FacilityName),
    INDEX IX_Facilities_Type (FacilityType),
    INDEX IX_Facilities_State (State),
    INDEX IX_Facilities_Active (IsActive) WHERE IsActive = 1,
    INDEX IX_Facilities_NPI (NPI)
);

-- Providers table
CREATE TABLE dbo.Providers (
    ProviderID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ProviderCode VARCHAR(10) NOT NULL UNIQUE,
    NPI VARCHAR(10) NOT NULL UNIQUE,
    FirstName NVARCHAR(50) NOT NULL,
    LastName NVARCHAR(50) NOT NULL,
    MiddleName NVARCHAR(50) NULL,
    Credentials NVARCHAR(50) NULL,
    
    -- Professional Information
    PrimarySpecialty VARCHAR(50) NOT NULL,
    SubSpecialty VARCHAR(50) NULL,
    BoardCertification VARCHAR(100) NULL,
    MedicalSchool NVARCHAR(100) NULL,
    ResidencyProgram NVARCHAR(100) NULL,
    
    -- License Information
    PrimaryLicenseNumber VARCHAR(20) NOT NULL,
    PrimaryLicenseState VARCHAR(2) NOT NULL,
    LicenseExpiry DATE NOT NULL,
    DEANumber VARCHAR(15) NULL,
    DEAExpiry DATE NULL,
    
    -- Contact Information
    Phone VARCHAR(15) NULL,
    Email NVARCHAR(100) NULL,
    PreferredContactMethod VARCHAR(20) DEFAULT 'EMAIL',
    
    -- Employment Information
    PrimaryFacilityID UNIQUEIDENTIFIER NOT NULL,
    HireDate DATE NOT NULL,
    TerminationDate DATE NULL,
    EmploymentType VARCHAR(20) DEFAULT 'EMPLOYEE' 
        CHECK (EmploymentType IN ('EMPLOYEE', 'CONTRACTOR', 'LOCUM', 'VOLUNTEER')),
    EmploymentStatus VARCHAR(20) DEFAULT 'ACTIVE' 
        CHECK (EmploymentStatus IN ('ACTIVE', 'INACTIVE', 'TERMINATED', 'SUSPENDED', 'ON_LEAVE')),
    
    -- Financial Information
    HourlyRate DECIMAL(10,2) NULL,
    SalaryAmount DECIMAL(12,2) NULL,
    CommissionRate DECIMAL(5,4) NULL,
    BonusEligible BIT DEFAULT 0,
    
    -- Performance Tracking
    ProductivityTarget DECIMAL(8,2) NULL, -- RVU target
    QualityScoreTarget DECIMAL(5,4) NULL,
    PatientSatisfactionTarget DECIMAL(5,4) NULL,
    
    -- System Fields
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    ModifiedDate DATETIME2 DEFAULT GETUTCDATE(),
    ModifiedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    IsDeleted BIT DEFAULT 0,
    
    FOREIGN KEY (PrimaryFacilityID) REFERENCES dbo.Facilities(FacilityID),
    
    INDEX IX_Providers_Code (ProviderCode),
    INDEX IX_Providers_NPI (NPI),
    INDEX IX_Providers_Name (LastName, FirstName),
    INDEX IX_Providers_Specialty (PrimarySpecialty),
    INDEX IX_Providers_Status (EmploymentStatus) WHERE EmploymentStatus = 'ACTIVE',
    INDEX IX_Providers_Facility (PrimaryFacilityID),
    INDEX IX_Providers_HireDate (HireDate)
);

-- Provider-Facility relationships (many-to-many)
CREATE TABLE dbo.ProviderFacilities (
    ProviderFacilityID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ProviderID UNIQUEIDENTIFIER NOT NULL,
    FacilityID UNIQUEIDENTIFIER NOT NULL,
    IsPrimary BIT DEFAULT 0,
    EffectiveDate DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    EndDate DATE NULL,
    
    -- Scheduling Information
    ScheduledDaysPerWeek DECIMAL(3,1) NULL,
    ScheduledHoursPerWeek DECIMAL(5,2) NULL,
    
    -- Financial Information
    CompensationModel VARCHAR(20) NULL CHECK (CompensationModel IN ('SALARY', 'HOURLY', 'RVU_BASED', 'HYBRID')),
    RVURate DECIMAL(8,4) NULL,
    
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    
    FOREIGN KEY (ProviderID) REFERENCES dbo.Providers(ProviderID),
    FOREIGN KEY (FacilityID) REFERENCES dbo.Facilities(FacilityID),
    
    INDEX IX_ProviderFacilities_Provider (ProviderID),
    INDEX IX_ProviderFacilities_Facility (FacilityID),
    INDEX IX_ProviderFacilities_Primary (ProviderID, IsPrimary) WHERE IsPrimary = 1,
    
    UNIQUE (ProviderID, FacilityID, EffectiveDate)
);

-- =============================================================================
-- 3. INSURANCE AND PAYER MANAGEMENT
-- =============================================================================

-- Insurance Companies/Payers
CREATE TABLE dbo.InsuranceCompanies (
    PayerID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    PayerCode VARCHAR(20) NOT NULL UNIQUE,
    PayerName NVARCHAR(100) NOT NULL,
    PayerType VARCHAR(20) NOT NULL 
        CHECK (PayerType IN ('COMMERCIAL', 'MEDICARE', 'MEDICAID', 'TRICARE', 'WORKERS_COMP', 'SELF_PAY', 'OTHER')),
    
    -- Contact Information
    BillingAddress NVARCHAR(200) NULL,
    ClaimsAddress NVARCHAR(200) NULL,
    Phone VARCHAR(15) NULL,
    FaxNumber VARCHAR(15) NULL,
    Website NVARCHAR(200) NULL,
    
    -- Electronic Claims Information
    ClearinghouseID VARCHAR(20) NULL,
    ElectronicPayerID VARCHAR(20) NULL,
    EDIContactInfo NVARCHAR(500) NULL,
    
    -- Financial Information
    AverageDaysToPayment INT NULL,
    PaymentMethod VARCHAR(20) DEFAULT 'EFT' 
        CHECK (PaymentMethod IN ('EFT', 'CHECK', 'ACH', 'WIRE')),
    
    -- Performance Metrics
    DenialRate DECIMAL(5,4) NULL,
    AppealSuccessRate DECIMAL(5,4) NULL,
    CollectionRate DECIMAL(5,4) NULL,
    
    -- System Fields
    IsActive BIT DEFAULT 1,
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    ModifiedDate DATETIME2 DEFAULT GETUTCDATE(),
    ModifiedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    
    INDEX IX_InsuranceCompanies_Code (PayerCode),
    INDEX IX_InsuranceCompanies_Name (PayerName),
    INDEX IX_InsuranceCompanies_Type (PayerType),
    INDEX IX_InsuranceCompanies_Active (IsActive) WHERE IsActive = 1
);

-- Insurance Plans
CREATE TABLE dbo.InsurancePlans (
    InsuranceID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    PayerID UNIQUEIDENTIFIER NOT NULL,
    PatientID UNIQUEIDENTIFIER NOT NULL,
    
    -- Policy Information
    PolicyNumber VARCHAR(50) NOT NULL,
    GroupNumber VARCHAR(50) NULL,
    PlanName NVARCHAR(100) NOT NULL,
    PlanType VARCHAR(20) NOT NULL 
        CHECK (PlanType IN ('HMO', 'PPO', 'EPO', 'POS', 'HDHP', 'INDEMNITY', 'MEDICARE_ADVANTAGE', 'MEDIGAP')),
    
    -- Coverage Information
    EffectiveDate DATE NOT NULL,
    TerminationDate DATE NULL,
    CopayAmount DECIMAL(10,2) NULL,
    CoinsurancePercent DECIMAL(5,4) NULL,
    DeductibleAmount DECIMAL(10,2) NULL,
    OutOfPocketMax DECIMAL(10,2) NULL,
    
    -- Prior Authorization Requirements
    RequiresPriorAuth BIT DEFAULT 0,
    PriorAuthPhone VARCHAR(15) NULL,
    PriorAuthWebsite NVARCHAR(200) NULL,
    
    -- Eligibility Information
    LastEligibilityCheck DATETIME2 NULL,
    EligibilityStatus VARCHAR(20) DEFAULT 'ACTIVE' 
        CHECK (EligibilityStatus IN ('ACTIVE', 'INACTIVE', 'PENDING', 'EXPIRED')),
    
    -- System Fields
    IsActive BIT DEFAULT 1,
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    ModifiedDate DATETIME2 DEFAULT GETUTCDATE(),
    ModifiedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    
    FOREIGN KEY (PayerID) REFERENCES dbo.InsuranceCompanies(PayerID),
    FOREIGN KEY (PatientID) REFERENCES dbo.Patients(PatientID),
    
    INDEX IX_InsurancePlans_Payer (PayerID),
    INDEX IX_InsurancePlans_Patient (PatientID),
    INDEX IX_InsurancePlans_Policy (PolicyNumber),
    INDEX IX_InsurancePlans_Effective (EffectiveDate),
    INDEX IX_InsurancePlans_Active (IsActive) WHERE IsActive = 1,
    
    UNIQUE (PatientID, PayerID, PolicyNumber, EffectiveDate)
);

-- =============================================================================
-- 4. CLINICAL ENCOUNTER MANAGEMENT
-- =============================================================================

-- Encounters table
CREATE TABLE dbo.Encounters (
    EncounterID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    EncounterNumber VARCHAR(20) NOT NULL UNIQUE,
    PatientID UNIQUEIDENTIFIER NOT NULL,
    ProviderID UNIQUEIDENTIFIER NOT NULL,
    FacilityID UNIQUEIDENTIFIER NOT NULL,
    
    -- Encounter Details
    EncounterDate DATE NOT NULL,
    EncounterTime TIME NOT NULL,
    EncounterType VARCHAR(20) NOT NULL 
        CHECK (EncounterType IN ('OFFICE', 'INPATIENT', 'OUTPATIENT', 'EMERGENCY', 'URGENT', 'TELEHEALTH', 'SURGERY', 'PROCEDURE')),
    
    -- Visit Classification
    VisitType VARCHAR(30) NOT NULL 
        CHECK (VisitType IN ('NEW_PATIENT', 'ESTABLISHED_PATIENT', 'CONSULTATION', 'FOLLOW_UP', 'EMERGENCY', 'ANNUAL_PHYSICAL')),
    AppointmentType VARCHAR(30) NULL,
    
    -- Clinical Information
    ChiefComplaint NVARCHAR(500) NULL,
    PresentingProblem NVARCHAR(1000) NULL,
    ClinicalNotes NVARCHAR(MAX) NULL,
    
    -- Diagnosis Information
    PrimaryDiagnosisCode VARCHAR(10) NOT NULL,
    PrimaryDiagnosis NVARCHAR(200) NOT NULL,
    SecondaryDiagnosesJSON NVARCHAR(MAX) NULL, -- JSON array of additional diagnoses
    
    -- Visit Timing
    CheckInTime DATETIME2 NULL,
    ProviderStartTime DATETIME2 NULL,
    ProviderEndTime DATETIME2 NULL,
    CheckOutTime DATETIME2 NULL,
    VisitDurationMinutes AS DATEDIFF(MINUTE, ProviderStartTime, ProviderEndTime),
    TotalTimeMinutes AS DATEDIFF(MINUTE, CheckInTime, CheckOutTime),
    
    -- Status Tracking
    EncounterStatus VARCHAR(20) DEFAULT 'SCHEDULED' 
        CHECK (EncounterStatus IN ('SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED')),
    CompletionDate DATETIME2 NULL,
    
    -- Financial Information
    ExpectedCharges DECIMAL(12,2) NULL,
    ActualCharges DECIMAL(12,2) NULL,
    PatientResponsibility DECIMAL(12,2) NULL,
    CopayCollected DECIMAL(10,2) NULL DEFAULT 0,
    
    -- Quality Metrics
    DocumentationScore DECIMAL(5,4) NULL,
    PatientSatisfactionScore DECIMAL(5,4) NULL,
    CodingAccuracy DECIMAL(5,4) NULL,
    
    -- System Fields
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    ModifiedDate DATETIME2 DEFAULT GETUTCDATE(),
    ModifiedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    IsDeleted BIT DEFAULT 0,
    
    FOREIGN KEY (PatientID) REFERENCES dbo.Patients(PatientID),
    FOREIGN KEY (ProviderID) REFERENCES dbo.Providers(ProviderID),
    FOREIGN KEY (FacilityID) REFERENCES dbo.Facilities(FacilityID),
    
    INDEX IX_Encounters_Number (EncounterNumber),
    INDEX IX_Encounters_Patient (PatientID, EncounterDate DESC),
    INDEX IX_Encounters_Provider (ProviderID, EncounterDate DESC),
    INDEX IX_Encounters_Facility (FacilityID, EncounterDate DESC),
    INDEX IX_Encounters_Date (EncounterDate),
    INDEX IX_Encounters_Status (EncounterStatus),
    INDEX IX_Encounters_Type (EncounterType),
    INDEX IX_Encounters_Composite (FacilityID, ProviderID, EncounterDate)
);

-- =============================================================================
-- 5. REFERENCE DATA TABLES
-- =============================================================================

-- CPT Codes
CREATE TABLE dbo.CPTCodes (
    CPTCodeID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    CPTCode VARCHAR(5) NOT NULL UNIQUE,
    ShortDescription NVARCHAR(200) NOT NULL,
    FullDescription NVARCHAR(500) NOT NULL,
    Category VARCHAR(50) NOT NULL,
    Section VARCHAR(100) NOT NULL,
    
    -- RVU Information (CMS data)
    WorkRVU DECIMAL(8,4) NULL,
    PracticeExpenseRVU_Facility DECIMAL(8,4) NULL,
    PracticeExpenseRVU_NonFacility DECIMAL(8,4) NULL,
    MalpracticeRVU DECIMAL(8,4) NULL,
    TotalRVU_Facility AS (WorkRVU + PracticeExpenseRVU_Facility + MalpracticeRVU),
    TotalRVU_NonFacility AS (WorkRVU + PracticeExpenseRVU_NonFacility + MalpracticeRVU),
    
    -- Pricing Information
    MedicareAmount_Facility DECIMAL(10,2) NULL,
    MedicareAmount_NonFacility DECIMAL(10,2) NULL,
    
    -- Billing Information
    BillingUnits VARCHAR(10) DEFAULT 'UNITS',
    ModifiersAllowed NVARCHAR(100) NULL,
    GlobalPeriod VARCHAR(3) NULL,
    
    -- Status Information
    IsActive BIT DEFAULT 1,
    EffectiveDate DATE NOT NULL,
    EndDate DATE NULL,
    LastUpdated DATETIME2 DEFAULT GETUTCDATE(),
    
    INDEX IX_CPTCodes_Code (CPTCode),
    INDEX IX_CPTCodes_Category (Category),
    INDEX IX_CPTCodes_Section (Section),
    INDEX IX_CPTCodes_Active (IsActive) WHERE IsActive = 1,
    INDEX IX_CPTCodes_RVU (TotalRVU_NonFacility DESC)
);

-- ICD-10 Codes
CREATE TABLE dbo.ICDCodes (
    ICDCodeID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ICDCode VARCHAR(10) NOT NULL,
    ICDVersion VARCHAR(10) NOT NULL DEFAULT 'ICD-10-CM',
    ShortDescription NVARCHAR(200) NOT NULL,
    FullDescription NVARCHAR(500) NOT NULL,
    Category VARCHAR(50) NOT NULL,
    Chapter VARCHAR(100) NOT NULL,
    
    -- Classification Information
    IsCC BIT DEFAULT 0, -- Complication/Comorbidity
    IsMCC BIT DEFAULT 0, -- Major Complication/Comorbidity
    IsHAC BIT DEFAULT 0, -- Hospital Acquired Condition
    
    -- DRG Information
    DRGWeight DECIMAL(6,4) NULL,
    DRGCategory VARCHAR(50) NULL,
    
    -- Quality Reporting
    IsQualityMeasure BIT DEFAULT 0,
    QualityMeasureName VARCHAR(100) NULL,
    
    -- Status Information
    IsActive BIT DEFAULT 1,
    EffectiveDate DATE NOT NULL,
    EndDate DATE NULL,
    LastUpdated DATETIME2 DEFAULT GETUTCDATE(),
    
    INDEX IX_ICDCodes_Code_Version (ICDCode, ICDVersion),
    INDEX IX_ICDCodes_Category (Category),
    INDEX IX_ICDCodes_Chapter (Chapter),
    INDEX IX_ICDCodes_Active (IsActive) WHERE IsActive = 1,
    INDEX IX_ICDCodes_CC (IsCC) WHERE IsCC = 1,
    INDEX IX_ICDCodes_MCC (IsMCC) WHERE IsMCC = 1,
    
    UNIQUE (ICDCode, ICDVersion, EffectiveDate)
);

-- Add check constraints
ALTER TABLE dbo.Patients 
ADD CONSTRAINT CK_Patients_Gender CHECK (Gender IN ('M', 'F', 'U', 'O'));

ALTER TABLE dbo.Providers 
ADD CONSTRAINT CK_Providers_NPI_Format CHECK (LEN(NPI) = 10 AND ISNUMERIC(NPI) = 1);

ALTER TABLE dbo.Facilities 
ADD CONSTRAINT CK_Facilities_NPI_Format CHECK (LEN(NPI) = 10 AND ISNUMERIC(NPI) = 1);

-- Add default values and computed columns
ALTER TABLE dbo.Encounters 
ADD CONSTRAINT DF_Encounters_CreatedDate DEFAULT GETUTCDATE() FOR CreatedDate;

-- Create sequence for encounter numbers
CREATE SEQUENCE dbo.EncounterNumberSequence
    START WITH 1000000
    INCREMENT BY 1
    MINVALUE 1000000
    MAXVALUE 9999999999
    CYCLE;

-- Add trigger for encounter number generation
CREATE TRIGGER tr_Encounters_GenerateNumber
ON dbo.Encounters
INSTEAD OF INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO dbo.Encounters (
        EncounterID, EncounterNumber, PatientID, ProviderID, FacilityID,
        EncounterDate, EncounterTime, EncounterType, VisitType,
        ChiefComplaint, PrimaryDiagnosisCode, PrimaryDiagnosis,
        EncounterStatus, CreatedBy
    )
    SELECT 
        COALESCE(i.EncounterID, NEWID()),
        COALESCE(i.EncounterNumber, 'ENC' + CAST(NEXT VALUE FOR dbo.EncounterNumberSequence AS VARCHAR(10))),
        i.PatientID, i.ProviderID, i.FacilityID,
        i.EncounterDate, i.EncounterTime, i.EncounterType, i.VisitType,
        i.ChiefComplaint, i.PrimaryDiagnosisCode, i.PrimaryDiagnosis,
        COALESCE(i.EncounterStatus, 'SCHEDULED'),
        COALESCE(i.CreatedBy, SYSTEM_USER)
    FROM INSERTED i;
END;

GO

PRINT 'Core tables created successfully';