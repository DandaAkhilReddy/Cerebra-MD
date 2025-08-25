-- =============================================================================
-- Billing and Claims Management Tables
-- Cerebra-MD Healthcare Analytics Platform  
-- =============================================================================

USE CerebraMD;
GO

-- =============================================================================
-- 6. DIAGNOSIS AND PROCEDURE TRACKING
-- =============================================================================

-- Diagnoses table for encounters
CREATE TABLE dbo.Diagnoses (
    DiagnosisID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    EncounterID UNIQUEIDENTIFIER NOT NULL,
    
    -- Diagnosis Information
    DiagnosisCode VARCHAR(10) NOT NULL,
    DiagnosisDescription NVARCHAR(200) NOT NULL,
    DiagnosisType VARCHAR(20) NOT NULL 
        CHECK (DiagnosisType IN ('PRIMARY', 'SECONDARY', 'ADMITTING', 'DISCHARGE', 'RULE_OUT', 'DIFFERENTIAL')),
    DiagnosisOrder TINYINT NOT NULL DEFAULT 1,
    
    -- ICD Information
    ICDVersion VARCHAR(10) NOT NULL DEFAULT 'ICD-10-CM',
    ICDCategory VARCHAR(50) NULL,
    
    -- Clinical Details
    PresentOnAdmission CHAR(1) NULL CHECK (PresentOnAdmission IN ('Y', 'N', 'U', 'W', '1')),
    ChronicCondition BIT DEFAULT 0,
    Severity VARCHAR(20) NULL CHECK (Severity IN ('MILD', 'MODERATE', 'SEVERE', 'CRITICAL')),
    
    -- Quality and Coding
    CodingAccuracy DECIMAL(5,4) NULL,
    DocumentationQuality VARCHAR(20) NULL CHECK (DocumentationQuality IN ('EXCELLENT', 'GOOD', 'ADEQUATE', 'POOR')),
    CodingNotes NVARCHAR(500) NULL,
    
    -- System Fields
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    ModifiedDate DATETIME2 DEFAULT GETUTCDATE(),
    ModifiedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    
    FOREIGN KEY (EncounterID) REFERENCES dbo.Encounters(EncounterID),
    
    INDEX IX_Diagnoses_Encounter (EncounterID),
    INDEX IX_Diagnoses_Code (DiagnosisCode),
    INDEX IX_Diagnoses_Type (DiagnosisType),
    INDEX IX_Diagnoses_Category (ICDCategory),
    INDEX IX_Diagnoses_Order (EncounterID, DiagnosisOrder),
    INDEX IX_Diagnoses_Chronic (ChronicCondition) WHERE ChronicCondition = 1
);

-- Procedures table for encounters
CREATE TABLE dbo.Procedures (
    ProcedureID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    EncounterID UNIQUEIDENTIFIER NOT NULL,
    
    -- Procedure Information
    ProcedureCode VARCHAR(10) NOT NULL,
    ProcedureDescription NVARCHAR(200) NOT NULL,
    ProcedureDate DATE NOT NULL,
    ProcedureTime TIME NULL,
    
    -- CPT Information
    CPTCode VARCHAR(5) NULL,
    CPTDescription NVARCHAR(200) NULL,
    ModifierCode1 VARCHAR(2) NULL,
    ModifierCode2 VARCHAR(2) NULL,
    ModifierCode3 VARCHAR(2) NULL,
    ModifierCode4 VARCHAR(2) NULL,
    
    -- Procedure Details
    PerformingProviderID UNIQUEIDENTIFIER NULL,
    AssistingProviderID UNIQUEIDENTIFIER NULL,
    AnesthesiaProviderID UNIQUEIDENTIFIER NULL,
    ProcedureLocation VARCHAR(50) NULL,
    
    -- Quantity and Units
    Quantity DECIMAL(8,2) DEFAULT 1,
    Units VARCHAR(10) DEFAULT 'UNITS',
    ServiceUnits INT DEFAULT 1,
    
    -- Financial Information
    ChargeAmount DECIMAL(10,2) NOT NULL,
    AllowedAmount DECIMAL(10,2) NULL,
    ContractualAdjustment DECIMAL(10,2) NULL DEFAULT 0,
    
    -- RVU Information
    WorkRVU DECIMAL(8,4) NULL,
    PracticeExpenseRVU DECIMAL(8,4) NULL,
    MalpracticeRVU DECIMAL(8,4) NULL,
    TotalRVU DECIMAL(8,4) NULL,
    
    -- Quality Metrics
    CodingAccuracy DECIMAL(5,4) NULL,
    DocumentationScore DECIMAL(5,4) NULL,
    ComplianceScore DECIMAL(5,4) NULL,
    
    -- Status Information
    ProcedureStatus VARCHAR(20) DEFAULT 'COMPLETED' 
        CHECK (ProcedureStatus IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED')),
    
    -- System Fields
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    ModifiedDate DATETIME2 DEFAULT GETUTCDATE(),
    ModifiedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    
    FOREIGN KEY (EncounterID) REFERENCES dbo.Encounters(EncounterID),
    FOREIGN KEY (PerformingProviderID) REFERENCES dbo.Providers(ProviderID),
    FOREIGN KEY (AssistingProviderID) REFERENCES dbo.Providers(ProviderID),
    FOREIGN KEY (AnesthesiaProviderID) REFERENCES dbo.Providers(ProviderID),
    
    INDEX IX_Procedures_Encounter (EncounterID),
    INDEX IX_Procedures_Code (ProcedureCode),
    INDEX IX_Procedures_CPT (CPTCode),
    INDEX IX_Procedures_Date (ProcedureDate),
    INDEX IX_Procedures_Provider (PerformingProviderID),
    INDEX IX_Procedures_Amount (ChargeAmount DESC),
    INDEX IX_Procedures_RVU (TotalRVU DESC)
);

-- =============================================================================
-- 7. CLAIMS MANAGEMENT
-- =============================================================================

-- Claims table
CREATE TABLE dbo.Claims (
    ClaimID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ClaimNumber VARCHAR(30) NOT NULL UNIQUE,
    EncounterID UNIQUEIDENTIFIER NOT NULL,
    PatientID UNIQUEIDENTIFIER NOT NULL,
    ProviderID UNIQUEIDENTIFIER NOT NULL,
    FacilityID UNIQUEIDENTIFIER NOT NULL,
    PrimaryInsuranceID UNIQUEIDENTIFIER NOT NULL,
    SecondaryInsuranceID UNIQUEIDENTIFIER NULL,
    
    -- Claim Identification
    OriginalClaimNumber VARCHAR(30) NULL, -- For resubmissions
    ClaimType VARCHAR(20) NOT NULL 
        CHECK (ClaimType IN ('ORIGINAL', 'CORRECTED', 'VOID', 'REPLACEMENT', 'REVERSAL')),
    ClaimForm VARCHAR(10) DEFAULT 'CMS1500' CHECK (ClaimForm IN ('CMS1500', 'UB04', 'ADA')),
    
    -- Service Period
    ServiceDateFrom DATE NOT NULL,
    ServiceDateTo DATE NOT NULL,
    
    -- Claim Dates
    SubmissionDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ReceivedDate DATETIME2 NULL,
    ProcessedDate DATETIME2 NULL,
    PaidDate DATETIME2 NULL,
    
    -- Financial Information
    BilledAmount DECIMAL(12,2) NOT NULL,
    AllowedAmount DECIMAL(12,2) NULL,
    PaidAmount DECIMAL(12,2) NULL DEFAULT 0,
    PatientResponsibility DECIMAL(12,2) NULL,
    DeductibleAmount DECIMAL(12,2) NULL DEFAULT 0,
    CoinsuranceAmount DECIMAL(12,2) NULL DEFAULT 0,
    CopayAmount DECIMAL(12,2) NULL DEFAULT 0,
    AdjustmentAmount DECIMAL(12,2) NULL DEFAULT 0,
    WriteOffAmount DECIMAL(12,2) NULL DEFAULT 0,
    
    -- Status Information
    ClaimStatus VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED'
        CHECK (ClaimStatus IN ('DRAFT', 'SUBMITTED', 'PENDING', 'PROCESSED', 'PAID', 'DENIED', 'PARTIAL', 'APPEALED', 'CLOSED')),
    ClaimStatusDate DATETIME2 DEFAULT GETUTCDATE(),
    
    -- Processing Information
    ClearinghouseID VARCHAR(20) NULL,
    ClearinghouseBatchID VARCHAR(30) NULL,
    PayerClaimNumber VARCHAR(50) NULL,
    SubmissionAttempts INT DEFAULT 1,
    LastSubmissionDate DATETIME2 NULL,
    
    -- Electronic Processing
    EDITransactionID VARCHAR(50) NULL,
    EDI837BatchID VARCHAR(30) NULL,
    EDI835BatchID VARCHAR(30) NULL,
    
    -- Performance Metrics
    DaysToProcessing AS DATEDIFF(DAY, SubmissionDate, ProcessedDate),
    DaysToPayment AS DATEDIFF(DAY, SubmissionDate, PaidDate),
    CollectionRate AS (PaidAmount / NULLIF(BilledAmount, 0)),
    
    -- Notes and Comments
    SubmissionNotes NVARCHAR(1000) NULL,
    ProcessingNotes NVARCHAR(1000) NULL,
    InternalNotes NVARCHAR(1000) NULL,
    
    -- System Fields
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    ModifiedDate DATETIME2 DEFAULT GETUTCDATE(),
    ModifiedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    IsDeleted BIT DEFAULT 0,
    
    FOREIGN KEY (EncounterID) REFERENCES dbo.Encounters(EncounterID),
    FOREIGN KEY (PatientID) REFERENCES dbo.Patients(PatientID),
    FOREIGN KEY (ProviderID) REFERENCES dbo.Providers(ProviderID),
    FOREIGN KEY (FacilityID) REFERENCES dbo.Facilities(FacilityID),
    FOREIGN KEY (PrimaryInsuranceID) REFERENCES dbo.InsurancePlans(InsuranceID),
    FOREIGN KEY (SecondaryInsuranceID) REFERENCES dbo.InsurancePlans(InsuranceID),
    
    INDEX IX_Claims_Number (ClaimNumber),
    INDEX IX_Claims_Encounter (EncounterID),
    INDEX IX_Claims_Patient (PatientID, SubmissionDate DESC),
    INDEX IX_Claims_Provider (ProviderID, SubmissionDate DESC),
    INDEX IX_Claims_Facility (FacilityID, SubmissionDate DESC),
    INDEX IX_Claims_Status (ClaimStatus, SubmissionDate DESC),
    INDEX IX_Claims_Submission (SubmissionDate),
    INDEX IX_Claims_Processing (ProcessedDate) WHERE ProcessedDate IS NOT NULL,
    INDEX IX_Claims_Payment (PaidDate) WHERE PaidDate IS NOT NULL,
    INDEX IX_Claims_Insurance (PrimaryInsuranceID, ClaimStatus),
    INDEX IX_Claims_Amount (BilledAmount DESC),
    INDEX IX_Claims_Outstanding (ClaimStatus, SubmissionDate) WHERE ClaimStatus IN ('SUBMITTED', 'PENDING')
);

-- Claim Line Items
CREATE TABLE dbo.ClaimLineItems (
    ClaimLineID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ClaimID UNIQUEIDENTIFIER NOT NULL,
    ProcedureID UNIQUEIDENTIFIER NOT NULL,
    LineNumber INT NOT NULL,
    
    -- Service Information
    ServiceDate DATE NOT NULL,
    PlaceOfService VARCHAR(2) NOT NULL,
    TypeOfService VARCHAR(2) NULL,
    
    -- Procedure Codes
    CPTCode VARCHAR(5) NOT NULL,
    ModifierCode1 VARCHAR(2) NULL,
    ModifierCode2 VARCHAR(2) NULL,
    ModifierCode3 VARCHAR(2) NULL,
    ModifierCode4 VARCHAR(2) NULL,
    
    -- Diagnosis Pointers
    DiagnosisPointer1 TINYINT NULL,
    DiagnosisPointer2 TINYINT NULL,
    DiagnosisPointer3 TINYINT NULL,
    DiagnosisPointer4 TINYINT NULL,
    
    -- Units and Charges
    ServiceUnits DECIMAL(8,2) NOT NULL DEFAULT 1,
    ChargeAmount DECIMAL(10,2) NOT NULL,
    AllowedAmount DECIMAL(10,2) NULL,
    PaidAmount DECIMAL(10,2) NULL DEFAULT 0,
    AdjustmentAmount DECIMAL(10,2) NULL DEFAULT 0,
    
    -- Line Item Status
    LineStatus VARCHAR(20) DEFAULT 'SUBMITTED'
        CHECK (LineStatus IN ('SUBMITTED', 'PROCESSED', 'PAID', 'DENIED', 'ADJUSTED')),
    
    -- Reason Codes
    ReasonCode1 VARCHAR(5) NULL,
    ReasonCode2 VARCHAR(5) NULL,
    ReasonCode3 VARCHAR(5) NULL,
    ReasonCode4 VARCHAR(5) NULL,
    
    -- System Fields
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    
    FOREIGN KEY (ClaimID) REFERENCES dbo.Claims(ClaimID),
    FOREIGN KEY (ProcedureID) REFERENCES dbo.Procedures(ProcedureID),
    
    INDEX IX_ClaimLineItems_Claim (ClaimID, LineNumber),
    INDEX IX_ClaimLineItems_Procedure (ProcedureID),
    INDEX IX_ClaimLineItems_CPT (CPTCode),
    INDEX IX_ClaimLineItems_Status (LineStatus),
    INDEX IX_ClaimLineItems_Amount (ChargeAmount DESC),
    
    UNIQUE (ClaimID, LineNumber)
);

-- =============================================================================
-- 8. DENIALS MANAGEMENT
-- =============================================================================

-- Denials table
CREATE TABLE dbo.Denials (
    DenialID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ClaimID UNIQUEIDENTIFIER NOT NULL,
    ClaimLineID UNIQUEIDENTIFIER NULL, -- NULL if entire claim is denied
    
    -- Denial Information
    DenialDate DATE NOT NULL,
    DenialReasonCode VARCHAR(10) NOT NULL,
    DenialReasonDescription NVARCHAR(500) NOT NULL,
    SecondaryReasonCode VARCHAR(10) NULL,
    SecondaryReasonDescription NVARCHAR(500) NULL,
    
    -- Denial Classification
    DenialCategory VARCHAR(30) NOT NULL 
        CHECK (DenialCategory IN (
            'AUTHORIZATION', 'ELIGIBILITY', 'CODING', 'DOCUMENTATION', 
            'TIMELY_FILING', 'DUPLICATE', 'NON_COVERED_SERVICE', 
            'MEDICAL_NECESSITY', 'BUNDLING', 'MODIFIER', 'OTHER'
        )),
    DenialType VARCHAR(20) NOT NULL 
        CHECK (DenialType IN ('HARD_DENIAL', 'SOFT_DENIAL', 'INFORMATION_REQUEST', 'TECHNICAL_DENIAL')),
    
    -- Financial Impact
    DeniedAmount DECIMAL(12,2) NOT NULL,
    RecoverableAmount DECIMAL(12,2) NULL,
    WriteOffAmount DECIMAL(12,2) NULL DEFAULT 0,
    
    -- Root Cause Analysis
    RootCause VARCHAR(50) NULL 
        CHECK (RootCause IN (
            'PROVIDER_ERROR', 'BILLING_ERROR', 'AUTHORIZATION_ISSUE', 
            'ELIGIBILITY_ISSUE', 'PAYER_ERROR', 'SYSTEM_ERROR', 'PATIENT_ISSUE'
        )),
    IsPreventable BIT NULL,
    PreventionStrategy NVARCHAR(500) NULL,
    
    -- Assignment and Workflow
    DenialStatus VARCHAR(20) DEFAULT 'OPEN' 
        CHECK (DenialStatus IN ('OPEN', 'IN_PROGRESS', 'APPEALED', 'RESOLVED', 'WRITTEN_OFF', 'CLOSED')),
    AssignedTo NVARCHAR(50) NULL,
    AssignedDate DATETIME2 NULL,
    DueDate DATE NULL,
    Priority VARCHAR(10) DEFAULT 'NORMAL' 
        CHECK (Priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    
    -- Resolution Tracking
    ResolutionDate DATE NULL,
    ResolutionAmount DECIMAL(12,2) NULL,
    ResolutionType VARCHAR(30) NULL 
        CHECK (ResolutionType IN (
            'CORRECTED_RESUBMISSION', 'SUCCESSFUL_APPEAL', 'PARTIAL_PAYMENT', 
            'WRITE_OFF', 'PATIENT_PAYMENT', 'SECONDARY_INSURANCE'
        )),
    ResolutionNotes NVARCHAR(1000) NULL,
    
    -- Appeal Information
    AppealDate DATE NULL,
    AppealLevel TINYINT NULL DEFAULT 1,
    AppealNumber VARCHAR(30) NULL,
    AppealStatus VARCHAR(20) NULL 
        CHECK (AppealStatus IN ('SUBMITTED', 'PENDING', 'APPROVED', 'DENIED', 'PARTIAL', 'WITHDRAWN')),
    AppealAmount DECIMAL(12,2) NULL,
    AppealDeadline DATE NULL,
    
    -- Performance Metrics
    DaysToResolution AS DATEDIFF(DAY, DenialDate, ResolutionDate),
    DaysOutstanding AS CASE 
        WHEN DenialStatus IN ('RESOLVED', 'CLOSED') THEN DATEDIFF(DAY, DenialDate, ResolutionDate)
        ELSE DATEDIFF(DAY, DenialDate, GETDATE())
    END,
    RecoveryRate AS (ResolutionAmount / NULLIF(DeniedAmount, 0)),
    
    -- Related Denials
    RelatedDenialID UNIQUEIDENTIFIER NULL, -- For tracking recurring issues
    IsRecurringIssue BIT DEFAULT 0,
    RecurrenceCount INT DEFAULT 1,
    
    -- System Fields
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    ModifiedDate DATETIME2 DEFAULT GETUTCDATE(),
    ModifiedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    
    FOREIGN KEY (ClaimID) REFERENCES dbo.Claims(ClaimID),
    FOREIGN KEY (ClaimLineID) REFERENCES dbo.ClaimLineItems(ClaimLineID),
    FOREIGN KEY (RelatedDenialID) REFERENCES dbo.Denials(DenialID),
    
    INDEX IX_Denials_Claim (ClaimID),
    INDEX IX_Denials_ClaimLine (ClaimLineID),
    INDEX IX_Denials_Date (DenialDate),
    INDEX IX_Denials_Status (DenialStatus, DenialDate DESC),
    INDEX IX_Denials_Category (DenialCategory, DenialDate DESC),
    INDEX IX_Denials_Assigned (AssignedTo, DenialStatus) WHERE AssignedTo IS NOT NULL,
    INDEX IX_Denials_Outstanding (DenialStatus, DaysOutstanding DESC) WHERE DenialStatus IN ('OPEN', 'IN_PROGRESS'),
    INDEX IX_Denials_Amount (DeniedAmount DESC),
    INDEX IX_Denials_Priority (Priority, DueDate) WHERE DueDate IS NOT NULL,
    INDEX IX_Denials_Recurring (IsRecurringIssue, RecurrenceCount DESC) WHERE IsRecurringIssue = 1
);

-- Denial Actions table for tracking all actions taken
CREATE TABLE dbo.DenialActions (
    ActionID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    DenialID UNIQUEIDENTIFIER NOT NULL,
    
    -- Action Information
    ActionType VARCHAR(30) NOT NULL 
        CHECK (ActionType IN (
            'ASSIGNED', 'STATUS_CHANGE', 'APPEAL_SUBMITTED', 'DOCUMENTATION_REQUESTED',
            'CORRECTED_CLAIM', 'FOLLOW_UP_CALL', 'WRITTEN_OFF', 'RESOLVED', 'NOTE_ADDED'
        )),
    ActionDescription NVARCHAR(1000) NOT NULL,
    ActionDate DATETIME2 DEFAULT GETUTCDATE(),
    
    -- User Information
    PerformedBy NVARCHAR(50) NOT NULL,
    UserRole VARCHAR(30) NULL,
    
    -- Status Changes
    OldStatus VARCHAR(20) NULL,
    NewStatus VARCHAR(20) NULL,
    OldAssignedTo NVARCHAR(50) NULL,
    NewAssignedTo NVARCHAR(50) NULL,
    
    -- Financial Impact
    FinancialImpact DECIMAL(12,2) NULL,
    
    -- Follow-up Information
    FollowUpRequired BIT DEFAULT 0,
    FollowUpDate DATE NULL,
    FollowUpNotes NVARCHAR(500) NULL,
    
    -- System Fields
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    
    FOREIGN KEY (DenialID) REFERENCES dbo.Denials(DenialID),
    
    INDEX IX_DenialActions_Denial (DenialID, ActionDate DESC),
    INDEX IX_DenialActions_Type (ActionType, ActionDate DESC),
    INDEX IX_DenialActions_User (PerformedBy, ActionDate DESC),
    INDEX IX_DenialActions_FollowUp (FollowUpRequired, FollowUpDate) WHERE FollowUpRequired = 1
);

-- =============================================================================
-- 9. PAYMENTS MANAGEMENT
-- =============================================================================

-- Payments table
CREATE TABLE dbo.Payments (
    PaymentID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ClaimID UNIQUEIDENTIFIER NOT NULL,
    
    -- Payment Information
    PaymentDate DATE NOT NULL,
    PaymentAmount DECIMAL(12,2) NOT NULL,
    PaymentType VARCHAR(20) NOT NULL 
        CHECK (PaymentType IN ('INSURANCE', 'PATIENT', 'SECONDARY_INSURANCE', 'TERTIARY_INSURANCE', 'REFUND', 'ADJUSTMENT')),
    PaymentMethod VARCHAR(20) NOT NULL 
        CHECK (PaymentMethod IN ('EFT', 'CHECK', 'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'MONEY_ORDER', 'WIRE')),
    
    -- Remittance Information
    RemittanceNumber VARCHAR(30) NULL,
    RemittanceDate DATE NULL,
    CheckNumber VARCHAR(20) NULL,
    EFTTraceNumber VARCHAR(30) NULL,
    ConfirmationNumber VARCHAR(30) NULL,
    
    -- Payer Information
    PayerID UNIQUEIDENTIFIER NULL,
    PayerName NVARCHAR(100) NOT NULL,
    PayerType VARCHAR(20) NULL,
    
    -- Adjustment Information
    AdjustmentAmount DECIMAL(12,2) DEFAULT 0,
    AdjustmentType VARCHAR(20) NULL 
        CHECK (AdjustmentType IN ('CONTRACTUAL', 'WRITE_OFF', 'CORRECTION', 'REFUND', 'DISCOUNT')),
    AdjustmentReason NVARCHAR(200) NULL,
    
    -- Processing Information
    DepositDate DATE NULL,
    BankAccount VARCHAR(20) NULL,
    BatchID VARCHAR(30) NULL,
    ProcessingNotes NVARCHAR(500) NULL,
    
    -- ERA Information (Electronic Remittance Advice)
    ERANumber VARCHAR(30) NULL,
    ERADate DATE NULL,
    ERAAmount DECIMAL(12,2) NULL,
    
    -- Reconciliation
    IsReconciled BIT DEFAULT 0,
    ReconciledDate DATE NULL,
    ReconciledBy NVARCHAR(50) NULL,
    VarianceAmount DECIMAL(12,2) NULL,
    
    -- Performance Metrics
    DaysFromService AS DATEDIFF(DAY, 
        (SELECT ServiceDateFrom FROM dbo.Claims c WHERE c.ClaimID = dbo.Payments.ClaimID), 
        PaymentDate),
    DaysFromSubmission AS DATEDIFF(DAY, 
        (SELECT SubmissionDate FROM dbo.Claims c WHERE c.ClaimID = dbo.Payments.ClaimID), 
        PaymentDate),
    
    -- System Fields
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    ModifiedDate DATETIME2 DEFAULT GETUTCDATE(),
    ModifiedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    
    FOREIGN KEY (ClaimID) REFERENCES dbo.Claims(ClaimID),
    FOREIGN KEY (PayerID) REFERENCES dbo.InsuranceCompanies(PayerID),
    
    INDEX IX_Payments_Claim (ClaimID, PaymentDate DESC),
    INDEX IX_Payments_Date (PaymentDate),
    INDEX IX_Payments_Payer (PayerID, PaymentDate DESC),
    INDEX IX_Payments_Amount (PaymentAmount DESC),
    INDEX IX_Payments_Method (PaymentMethod, PaymentDate DESC),
    INDEX IX_Payments_Type (PaymentType, PaymentDate DESC),
    INDEX IX_Payments_Batch (BatchID) WHERE BatchID IS NOT NULL,
    INDEX IX_Payments_Reconciliation (IsReconciled, PaymentDate) WHERE IsReconciled = 0,
    INDEX IX_Payments_ERA (ERANumber) WHERE ERANumber IS NOT NULL
);

-- Payment Line Items for detailed payment allocation
CREATE TABLE dbo.PaymentLineItems (
    PaymentLineID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    PaymentID UNIQUEIDENTIFIER NOT NULL,
    ClaimLineID UNIQUEIDENTIFIER NOT NULL,
    
    -- Line Payment Details
    LinePaymentAmount DECIMAL(10,2) NOT NULL,
    LineAdjustmentAmount DECIMAL(10,2) DEFAULT 0,
    LineWriteOffAmount DECIMAL(10,2) DEFAULT 0,
    
    -- Reason Codes
    PaymentReasonCode VARCHAR(5) NULL,
    AdjustmentReasonCode VARCHAR(5) NULL,
    RemarkCode VARCHAR(5) NULL,
    
    -- Line Status
    PaymentStatus VARCHAR(20) DEFAULT 'POSTED'
        CHECK (PaymentStatus IN ('PENDING', 'POSTED', 'REVERSED', 'ADJUSTED')),
    
    -- System Fields
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    
    FOREIGN KEY (PaymentID) REFERENCES dbo.Payments(PaymentID),
    FOREIGN KEY (ClaimLineID) REFERENCES dbo.ClaimLineItems(ClaimLineID),
    
    INDEX IX_PaymentLineItems_Payment (PaymentID),
    INDEX IX_PaymentLineItems_ClaimLine (ClaimLineID),
    INDEX IX_PaymentLineItems_Status (PaymentStatus),
    INDEX IX_PaymentLineItems_Amount (LinePaymentAmount DESC),
    
    UNIQUE (PaymentID, ClaimLineID)
);

-- Create sequence for claim numbers
CREATE SEQUENCE dbo.ClaimNumberSequence
    START WITH 2024000001
    INCREMENT BY 1
    MINVALUE 2024000001
    MAXVALUE 2024999999
    CYCLE;

-- Create trigger for claim number generation
CREATE TRIGGER tr_Claims_GenerateNumber
ON dbo.Claims
INSTEAD OF INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO dbo.Claims (
        ClaimID, ClaimNumber, EncounterID, PatientID, ProviderID, FacilityID,
        PrimaryInsuranceID, SecondaryInsuranceID, ClaimType, ServiceDateFrom, ServiceDateTo,
        BilledAmount, ClaimStatus, CreatedBy
    )
    SELECT 
        COALESCE(i.ClaimID, NEWID()),
        COALESCE(i.ClaimNumber, 'CLM' + CAST(NEXT VALUE FOR dbo.ClaimNumberSequence AS VARCHAR(10))),
        i.EncounterID, i.PatientID, i.ProviderID, i.FacilityID,
        i.PrimaryInsuranceID, i.SecondaryInsuranceID,
        COALESCE(i.ClaimType, 'ORIGINAL'),
        i.ServiceDateFrom, i.ServiceDateTo,
        i.BilledAmount,
        COALESCE(i.ClaimStatus, 'DRAFT'),
        COALESCE(i.CreatedBy, SYSTEM_USER)
    FROM INSERTED i;
END;

GO

PRINT 'Billing and claims tables created successfully';