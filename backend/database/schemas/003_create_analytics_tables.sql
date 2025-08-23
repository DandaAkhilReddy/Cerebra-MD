-- =============================================================================
-- Analytics and Reporting Tables
-- Cerebra-MD Healthcare Analytics Platform
-- =============================================================================

USE CerebraMD;
GO

-- =============================================================================
-- 10. SYSTEM AND CONFIGURATION TABLES
-- =============================================================================

-- Application Users and Roles
CREATE TABLE dbo.ApplicationUsers (
    UserID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Username NVARCHAR(50) NOT NULL UNIQUE,
    Email NVARCHAR(100) NOT NULL UNIQUE,
    FirstName NVARCHAR(50) NOT NULL,
    LastName NVARCHAR(50) NOT NULL,
    
    -- Authentication
    AzureADObjectID UNIQUEIDENTIFIER NULL UNIQUE,
    LastLoginDate DATETIME2 NULL,
    LoginAttempts INT DEFAULT 0,
    IsLockedOut BIT DEFAULT 0,
    LockoutEndDate DATETIME2 NULL,
    
    -- Authorization
    PrimaryRole VARCHAR(30) NOT NULL 
        CHECK (PrimaryRole IN ('ADMIN', 'FINANCE_MANAGER', 'BILLING_SPECIALIST', 'PHYSICIAN', 'NURSE', 'CODER', 'ANALYST')),
    SecondaryRoles NVARCHAR(200) NULL,
    
    -- Data Access Control
    FacilityAccessJSON NVARCHAR(1000) NULL, -- JSON array of facility IDs
    ProviderAccessJSON NVARCHAR(1000) NULL, -- JSON array of provider IDs
    DataAccessLevel VARCHAR(20) DEFAULT 'FACILITY' 
        CHECK (DataAccessLevel IN ('SYSTEM', 'ORGANIZATION', 'FACILITY', 'PROVIDER', 'SELF_ONLY')),
    
    -- Preferences
    DefaultFacilityID UNIQUEIDENTIFIER NULL,
    TimeZone VARCHAR(50) DEFAULT 'Eastern Standard Time',
    LanguagePreference VARCHAR(10) DEFAULT 'EN',
    
    -- System Fields
    IsActive BIT DEFAULT 1,
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    ModifiedDate DATETIME2 DEFAULT GETUTCDATE(),
    ModifiedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    
    INDEX IX_ApplicationUsers_Username (Username),
    INDEX IX_ApplicationUsers_Email (Email),
    INDEX IX_ApplicationUsers_Role (PrimaryRole),
    INDEX IX_ApplicationUsers_AzureAD (AzureADObjectID),
    INDEX IX_ApplicationUsers_Active (IsActive) WHERE IsActive = 1
);

-- User Activity Log
CREATE TABLE dbo.UserActivityLog (
    ActivityID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserID UNIQUEIDENTIFIER NOT NULL,
    ActivityType VARCHAR(30) NOT NULL 
        CHECK (ActivityType IN ('LOGIN', 'LOGOUT', 'DATA_ACCESS', 'REPORT_GENERATION', 'EXPORT', 'CONFIGURATION_CHANGE')),
    ActivityDescription NVARCHAR(500) NOT NULL,
    ActivityDate DATETIME2 DEFAULT GETUTCDATE(),
    
    -- Request Information
    IPAddress VARCHAR(45) NULL,
    UserAgent NVARCHAR(500) NULL,
    RequestURL NVARCHAR(1000) NULL,
    
    -- Data Access Tracking (HIPAA Compliance)
    AccessedPatientID UNIQUEIDENTIFIER NULL,
    AccessedResourceType VARCHAR(50) NULL,
    AccessedResourceID VARCHAR(100) NULL,
    
    -- Performance Tracking
    ResponseTimeMS INT NULL,
    Success BIT DEFAULT 1,
    ErrorMessage NVARCHAR(1000) NULL,
    
    FOREIGN KEY (UserID) REFERENCES dbo.ApplicationUsers(UserID),
    
    INDEX IX_UserActivityLog_User (UserID, ActivityDate DESC),
    INDEX IX_UserActivityLog_Type (ActivityType, ActivityDate DESC),
    INDEX IX_UserActivityLog_Patient (AccessedPatientID, ActivityDate DESC) WHERE AccessedPatientID IS NOT NULL,
    INDEX IX_UserActivityLog_Date (ActivityDate DESC)
);

-- =============================================================================
-- 11. BUSINESS INTELLIGENCE TABLES
-- =============================================================================

-- KPI Definitions and Metadata
CREATE TABLE dbo.KPIDefinitions (
    KPIDefinitionID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    KPICode VARCHAR(20) NOT NULL UNIQUE,
    KPIName NVARCHAR(100) NOT NULL,
    KPIDescription NVARCHAR(500) NOT NULL,
    
    -- KPI Classification
    KPICategory VARCHAR(30) NOT NULL 
        CHECK (KPICategory IN ('FINANCIAL', 'OPERATIONAL', 'QUALITY', 'PRODUCTIVITY', 'PATIENT_SATISFACTION')),
    KPISubcategory VARCHAR(50) NULL,
    
    -- Calculation Information
    CalculationFormula NVARCHAR(2000) NOT NULL,
    DataSource VARCHAR(100) NOT NULL,
    RefreshFrequency VARCHAR(20) DEFAULT 'DAILY' 
        CHECK (RefreshFrequency IN ('REAL_TIME', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY')),
    
    -- Display Information
    DisplayUnit VARCHAR(20) NULL CHECK (DisplayUnit IN ('PERCENTAGE', 'CURRENCY', 'COUNT', 'DAYS', 'RATIO')),
    DisplayFormat VARCHAR(50) NULL,
    DefaultChartType VARCHAR(20) NULL,
    
    -- Benchmarking
    BenchmarkType VARCHAR(20) NULL CHECK (BenchmarkType IN ('INTERNAL', 'INDUSTRY', 'REGULATORY', 'CUSTOM')),
    BenchmarkValue DECIMAL(12,4) NULL,
    TargetValue DECIMAL(12,4) NULL,
    
    -- System Fields
    IsActive BIT DEFAULT 1,
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    ModifiedDate DATETIME2 DEFAULT GETUTCDATE(),
    ModifiedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    
    INDEX IX_KPIDefinitions_Code (KPICode),
    INDEX IX_KPIDefinitions_Category (KPICategory, KPISubcategory),
    INDEX IX_KPIDefinitions_Active (IsActive) WHERE IsActive = 1
);

-- Daily KPI Values (Fact Table)
CREATE TABLE dbo.DailyKPIValues (
    KPIValueID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    KPIDefinitionID UNIQUEIDENTIFIER NOT NULL,
    BusinessDate DATE NOT NULL,
    
    -- Dimensional Attributes
    FacilityID UNIQUEIDENTIFIER NULL,
    ProviderID UNIQUEIDENTIFIER NULL,
    PayerID UNIQUEIDENTIFIER NULL,
    DepartmentCode VARCHAR(20) NULL,
    
    -- KPI Values
    KPIValue DECIMAL(18,6) NOT NULL,
    KPICount BIGINT NULL,
    KPINumerator DECIMAL(18,6) NULL,
    KPIDenominator DECIMAL(18,6) NULL,
    
    -- Statistical Information
    MinValue DECIMAL(18,6) NULL,
    MaxValue DECIMAL(18,6) NULL,
    AvgValue DECIMAL(18,6) NULL,
    StdDevValue DECIMAL(18,6) NULL,
    
    -- Trending
    PriorDayValue DECIMAL(18,6) NULL,
    PriorWeekValue DECIMAL(18,6) NULL,
    PriorMonthValue DECIMAL(18,6) NULL,
    PriorYearValue DECIMAL(18,6) NULL,
    
    DayOverDayChange AS (KPIValue - PriorDayValue),
    WeekOverWeekChange AS (KPIValue - PriorWeekValue),
    MonthOverMonthChange AS (KPIValue - PriorMonthValue),
    YearOverYearChange AS (KPIValue - PriorYearValue),
    
    -- Quality Indicators
    DataQualityScore DECIMAL(5,4) DEFAULT 1.0,
    RecordCount BIGINT NULL,
    LastUpdated DATETIME2 DEFAULT GETUTCDATE(),
    
    FOREIGN KEY (KPIDefinitionID) REFERENCES dbo.KPIDefinitions(KPIDefinitionID),
    FOREIGN KEY (FacilityID) REFERENCES dbo.Facilities(FacilityID),
    FOREIGN KEY (ProviderID) REFERENCES dbo.Providers(ProviderID),
    FOREIGN KEY (PayerID) REFERENCES dbo.InsuranceCompanies(PayerID),
    
    INDEX IX_DailyKPIValues_Date (BusinessDate DESC),
    INDEX IX_DailyKPIValues_KPI (KPIDefinitionID, BusinessDate DESC),
    INDEX IX_DailyKPIValues_Facility (FacilityID, BusinessDate DESC),
    INDEX IX_DailyKPIValues_Provider (ProviderID, BusinessDate DESC),
    INDEX IX_DailyKPIValues_Payer (PayerID, BusinessDate DESC),
    
    -- Columnstore index for analytics
    INDEX IX_DailyKPIValues_Columnstore CLUSTERED COLUMNSTORE,
    
    UNIQUE (KPIDefinitionID, BusinessDate, ISNULL(FacilityID, '00000000-0000-0000-0000-000000000000'), 
            ISNULL(ProviderID, '00000000-0000-0000-0000-000000000000'), 
            ISNULL(PayerID, '00000000-0000-0000-0000-000000000000'))
);

-- Monthly KPI Aggregates
CREATE TABLE dbo.MonthlyKPIAggregates (
    MonthlyKPIID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    KPIDefinitionID UNIQUEIDENTIFIER NOT NULL,
    MonthYear DATE NOT NULL, -- First day of month
    
    -- Dimensional Attributes
    FacilityID UNIQUEIDENTIFIER NULL,
    ProviderID UNIQUEIDENTIFIER NULL,
    PayerID UNIQUEIDENTIFIER NULL,
    
    -- Aggregated Values
    MonthlyValue DECIMAL(18,6) NOT NULL,
    MonthlyCount BIGINT NULL,
    
    -- Statistical Measures
    MinDailyValue DECIMAL(18,6) NULL,
    MaxDailyValue DECIMAL(18,6) NULL,
    AvgDailyValue DECIMAL(18,6) NULL,
    StdDevDailyValue DECIMAL(18,6) NULL,
    
    -- Month-over-Month Analysis
    PriorMonthValue DECIMAL(18,6) NULL,
    MonthOverMonthChange AS (MonthlyValue - PriorMonthValue),
    MonthOverMonthPercent AS ((MonthlyValue - PriorMonthValue) / NULLIF(PriorMonthValue, 0) * 100),
    
    -- Year-over-Year Analysis
    PriorYearValue DECIMAL(18,6) NULL,
    YearOverYearChange AS (MonthlyValue - PriorYearValue),
    YearOverYearPercent AS ((MonthlyValue - PriorYearValue) / NULLIF(PriorYearValue, 0) * 100),
    
    -- Quality and Completeness
    DataCompletenessPercent DECIMAL(5,4) DEFAULT 1.0,
    DaysWithData INT NULL,
    LastUpdated DATETIME2 DEFAULT GETUTCDATE(),
    
    FOREIGN KEY (KPIDefinitionID) REFERENCES dbo.KPIDefinitions(KPIDefinitionID),
    FOREIGN KEY (FacilityID) REFERENCES dbo.Facilities(FacilityID),
    FOREIGN KEY (ProviderID) REFERENCES dbo.Providers(ProviderID),
    FOREIGN KEY (PayerID) REFERENCES dbo.InsuranceCompanies(PayerID),
    
    INDEX IX_MonthlyKPIAggregates_Month (MonthYear DESC),
    INDEX IX_MonthlyKPIAggregates_KPI (KPIDefinitionID, MonthYear DESC),
    INDEX IX_MonthlyKPIAggregates_Facility (FacilityID, MonthYear DESC),
    INDEX IX_MonthlyKPIAggregates_Provider (ProviderID, MonthYear DESC),
    
    -- Columnstore index for analytics
    INDEX IX_MonthlyKPIAggregates_Columnstore CLUSTERED COLUMNSTORE
);

-- =============================================================================
-- 12. REPORTING AND DASHBOARD TABLES
-- =============================================================================

-- Dashboard Configurations
CREATE TABLE dbo.DashboardConfigurations (
    DashboardID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    DashboardName NVARCHAR(100) NOT NULL,
    DashboardType VARCHAR(30) NOT NULL 
        CHECK (DashboardType IN ('EXECUTIVE', 'FINANCIAL', 'OPERATIONAL', 'CLINICAL', 'CUSTOM')),
    
    -- User and Access Control
    CreatedByUserID UNIQUEIDENTIFIER NOT NULL,
    IsPublic BIT DEFAULT 0,
    ShareWithRoles NVARCHAR(200) NULL, -- JSON array of roles
    ShareWithUsers NVARCHAR(1000) NULL, -- JSON array of user IDs
    
    -- Dashboard Layout
    LayoutJSON NVARCHAR(MAX) NOT NULL, -- JSON configuration of widgets and layout
    FilterConfigJSON NVARCHAR(2000) NULL, -- Default filters
    RefreshInterval INT DEFAULT 300, -- Seconds
    
    -- Usage Metrics
    ViewCount INT DEFAULT 0,
    LastViewedDate DATETIME2 NULL,
    AvgLoadTime DECIMAL(8,2) NULL, -- Milliseconds
    
    -- System Fields
    IsActive BIT DEFAULT 1,
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    ModifiedDate DATETIME2 DEFAULT GETUTCDATE(),
    ModifiedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    
    FOREIGN KEY (CreatedByUserID) REFERENCES dbo.ApplicationUsers(UserID),
    
    INDEX IX_DashboardConfigurations_Type (DashboardType),
    INDEX IX_DashboardConfigurations_User (CreatedByUserID),
    INDEX IX_DashboardConfigurations_Active (IsActive) WHERE IsActive = 1,
    INDEX IX_DashboardConfigurations_Public (IsPublic) WHERE IsPublic = 1
);

-- Report Templates
CREATE TABLE dbo.ReportTemplates (
    ReportTemplateID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    TemplateName NVARCHAR(100) NOT NULL,
    ReportCategory VARCHAR(30) NOT NULL 
        CHECK (ReportCategory IN ('FINANCIAL', 'OPERATIONAL', 'REGULATORY', 'QUALITY', 'CUSTOM')),
    
    -- Template Configuration
    TemplateDescription NVARCHAR(500) NULL,
    QueryTemplate NVARCHAR(MAX) NOT NULL,
    ParametersJSON NVARCHAR(2000) NULL,
    OutputFormat VARCHAR(20) DEFAULT 'PDF' 
        CHECK (OutputFormat IN ('PDF', 'EXCEL', 'CSV', 'HTML')),
    
    -- Scheduling
    IsSchedulable BIT DEFAULT 1,
    DefaultScheduleJSON NVARCHAR(500) NULL,
    
    -- Access Control
    RequiredPermissions NVARCHAR(200) NULL,
    AllowedRoles NVARCHAR(200) NULL,
    
    -- Usage Tracking
    GenerationCount INT DEFAULT 0,
    LastGeneratedDate DATETIME2 NULL,
    AvgGenerationTime DECIMAL(8,2) NULL, -- Seconds
    
    -- System Fields
    IsActive BIT DEFAULT 1,
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    ModifiedDate DATETIME2 DEFAULT GETUTCDATE(),
    ModifiedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    
    INDEX IX_ReportTemplates_Category (ReportCategory),
    INDEX IX_ReportTemplates_Name (TemplateName),
    INDEX IX_ReportTemplates_Active (IsActive) WHERE IsActive = 1
);

-- Report Generation History
CREATE TABLE dbo.ReportGenerationHistory (
    ReportHistoryID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ReportTemplateID UNIQUEIDENTIFIER NOT NULL,
    GeneratedByUserID UNIQUEIDENTIFIER NOT NULL,
    
    -- Generation Details
    GenerationDate DATETIME2 DEFAULT GETUTCDATE(),
    ParametersUsedJSON NVARCHAR(2000) NULL,
    OutputFormat VARCHAR(20) NOT NULL,
    FileSizeKB INT NULL,
    
    -- Performance Metrics
    GenerationTimeSeconds DECIMAL(8,2) NULL,
    RecordCount BIGINT NULL,
    Success BIT DEFAULT 1,
    ErrorMessage NVARCHAR(1000) NULL,
    
    -- File Information
    FileName NVARCHAR(255) NULL,
    FileStoragePath NVARCHAR(500) NULL,
    ExpiryDate DATE NULL,
    
    -- Distribution
    EmailRecipients NVARCHAR(1000) NULL,
    DownloadCount INT DEFAULT 0,
    LastDownloadDate DATETIME2 NULL,
    
    FOREIGN KEY (ReportTemplateID) REFERENCES dbo.ReportTemplates(ReportTemplateID),
    FOREIGN KEY (GeneratedByUserID) REFERENCES dbo.ApplicationUsers(UserID),
    
    INDEX IX_ReportGenerationHistory_Template (ReportTemplateID, GenerationDate DESC),
    INDEX IX_ReportGenerationHistory_User (GeneratedByUserID, GenerationDate DESC),
    INDEX IX_ReportGenerationHistory_Date (GenerationDate DESC),
    INDEX IX_ReportGenerationHistory_Success (Success, GenerationDate DESC) WHERE Success = 0
);

-- =============================================================================
-- 13. DATA QUALITY AND MONITORING TABLES
-- =============================================================================

-- Data Quality Rules
CREATE TABLE dbo.DataQualityRules (
    RuleID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    RuleName NVARCHAR(100) NOT NULL,
    TableName NVARCHAR(100) NOT NULL,
    ColumnName NVARCHAR(100) NULL,
    
    -- Rule Definition
    RuleType VARCHAR(30) NOT NULL 
        CHECK (RuleType IN (
            'NOT_NULL', 'UNIQUE', 'RANGE_CHECK', 'FORMAT_CHECK', 
            'REFERENTIAL_INTEGRITY', 'BUSINESS_RULE', 'COMPLETENESS', 'CONSISTENCY'
        )),
    RuleExpression NVARCHAR(1000) NOT NULL,
    ExpectedValue NVARCHAR(100) NULL,
    
    -- Severity and Thresholds
    Severity VARCHAR(10) NOT NULL DEFAULT 'MEDIUM' 
        CHECK (Severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    ErrorThreshold DECIMAL(5,4) DEFAULT 0.05, -- 5% error rate threshold
    WarningThreshold DECIMAL(5,4) DEFAULT 0.01, -- 1% warning threshold
    
    -- Execution Settings
    IsActive BIT DEFAULT 1,
    ExecutionFrequency VARCHAR(20) DEFAULT 'DAILY' 
        CHECK (ExecutionFrequency IN ('REAL_TIME', 'HOURLY', 'DAILY', 'WEEKLY')),
    LastExecuted DATETIME2 NULL,
    NextExecution DATETIME2 NULL,
    
    -- System Fields
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    ModifiedDate DATETIME2 DEFAULT GETUTCDATE(),
    ModifiedBy NVARCHAR(50) NOT NULL DEFAULT SYSTEM_USER,
    
    INDEX IX_DataQualityRules_Table (TableName, ColumnName),
    INDEX IX_DataQualityRules_Type (RuleType),
    INDEX IX_DataQualityRules_Active (IsActive) WHERE IsActive = 1,
    INDEX IX_DataQualityRules_Execution (NextExecution) WHERE NextExecution IS NOT NULL
);

-- Data Quality Results
CREATE TABLE dbo.DataQualityResults (
    ResultID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    RuleID UNIQUEIDENTIFIER NOT NULL,
    ExecutionDate DATETIME2 DEFAULT GETUTCDATE(),
    
    -- Execution Results
    TotalRecords BIGINT NOT NULL,
    PassedRecords BIGINT NOT NULL,
    FailedRecords BIGINT NOT NULL,
    PassRate AS (CAST(PassedRecords AS DECIMAL(18,6)) / NULLIF(TotalRecords, 0)),
    FailRate AS (CAST(FailedRecords AS DECIMAL(18,6)) / NULLIF(TotalRecords, 0)),
    
    -- Status
    RuleStatus VARCHAR(20) NOT NULL 
        CHECK (RuleStatus IN ('PASSED', 'WARNING', 'FAILED', 'ERROR')),
    
    -- Details
    SampleFailures NVARCHAR(2000) NULL, -- JSON array of sample failed records
    ErrorMessage NVARCHAR(1000) NULL,
    ExecutionTimeMs INT NULL,
    
    -- Trending
    PreviousPassRate DECIMAL(5,4) NULL,
    TrendDirection VARCHAR(10) AS 
        CASE 
            WHEN PreviousPassRate IS NULL THEN 'STABLE'
            WHEN PassRate > PreviousPassRate THEN 'IMPROVING'
            WHEN PassRate < PreviousPassRate THEN 'DECLINING'
            ELSE 'STABLE'
        END,
    
    FOREIGN KEY (RuleID) REFERENCES dbo.DataQualityRules(RuleID),
    
    INDEX IX_DataQualityResults_Rule (RuleID, ExecutionDate DESC),
    INDEX IX_DataQualityResults_Date (ExecutionDate DESC),
    INDEX IX_DataQualityResults_Status (RuleStatus, ExecutionDate DESC),
    INDEX IX_DataQualityResults_PassRate (PassRate, ExecutionDate DESC)
);

-- System Performance Metrics
CREATE TABLE dbo.SystemPerformanceMetrics (
    MetricID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    MetricDate DATETIME2 DEFAULT GETUTCDATE(),
    
    -- Database Performance
    AvgQueryTimeMs DECIMAL(8,2) NULL,
    SlowQueryCount INT NULL,
    DatabaseConnections INT NULL,
    DatabaseCPUPercent DECIMAL(5,2) NULL,
    DatabaseMemoryPercent DECIMAL(5,2) NULL,
    
    -- Application Performance
    ApiResponseTimeMs DECIMAL(8,2) NULL,
    ApiRequestCount BIGINT NULL,
    ApiErrorCount INT NULL,
    ApiErrorRate AS (CAST(ApiErrorCount AS DECIMAL(18,6)) / NULLIF(ApiRequestCount, 0) * 100),
    
    -- Data Pipeline Performance
    EtlJobsExecuted INT NULL,
    EtlJobsSucceeded INT NULL,
    EtlJobsFailed INT NULL,
    EtlSuccessRate AS (CAST(EtlJobsSucceeded AS DECIMAL(18,6)) / NULLIF(EtlJobsExecuted, 0) * 100),
    AvgEtlExecutionTimeMin DECIMAL(8,2) NULL,
    
    -- User Activity
    ActiveUsers INT NULL,
    LoginCount INT NULL,
    ReportGenerations INT NULL,
    DashboardViews INT NULL,
    
    -- Data Volume
    TotalRecordsProcessed BIGINT NULL,
    NewEncounters INT NULL,
    NewClaims INT NULL,
    NewPayments INT NULL,
    
    INDEX IX_SystemPerformanceMetrics_Date (MetricDate DESC)
);

-- =============================================================================
-- CREATE VIEWS FOR COMMON ANALYTICS QUERIES
-- =============================================================================

-- Financial Performance Summary View
CREATE VIEW dbo.vw_FinancialPerformanceSummary
AS
SELECT 
    f.FacilityName,
    YEAR(e.EncounterDate) as ReportYear,
    MONTH(e.EncounterDate) as ReportMonth,
    DATE_TRUNC('month', e.EncounterDate) as MonthYear,
    
    -- Volume Metrics
    COUNT(DISTINCT e.EncounterID) as TotalEncounters,
    COUNT(DISTINCT e.PatientID) as UniquePatients,
    COUNT(DISTINCT e.ProviderID) as ActiveProviders,
    
    -- Revenue Metrics
    SUM(e.ActualCharges) as TotalCharges,
    SUM(p.PaymentAmount) as TotalCollections,
    SUM(p.AdjustmentAmount) as TotalAdjustments,
    SUM(p.PaymentAmount) / NULLIF(SUM(e.ActualCharges), 0) as NetCollectionRate,
    
    -- AR Metrics
    AVG(CASE WHEN p.PaymentDate IS NOT NULL 
        THEN DATEDIFF(DAY, c.SubmissionDate, p.PaymentDate) END) as AvgDaysToPayment,
    
    -- Denial Metrics
    COUNT(DISTINCT d.DenialID) as TotalDenials,
    COUNT(DISTINCT d.DenialID) * 100.0 / NULLIF(COUNT(DISTINCT c.ClaimID), 0) as DenialRate,
    SUM(d.DeniedAmount) as TotalDeniedAmount,
    
    -- Quality Metrics
    AVG(e.DocumentationScore) as AvgDocumentationScore,
    AVG(e.PatientSatisfactionScore) as AvgPatientSatisfactionScore

FROM dbo.Encounters e
    INNER JOIN dbo.Facilities f ON e.FacilityID = f.FacilityID
    LEFT JOIN dbo.Claims c ON e.EncounterID = c.EncounterID
    LEFT JOIN dbo.Payments p ON c.ClaimID = p.ClaimID AND p.PaymentType = 'INSURANCE'
    LEFT JOIN dbo.Denials d ON c.ClaimID = d.ClaimID

WHERE e.EncounterStatus = 'COMPLETED'
    AND e.EncounterDate >= DATEADD(YEAR, -2, GETDATE()) -- Last 2 years

GROUP BY 
    f.FacilityName,
    YEAR(e.EncounterDate),
    MONTH(e.EncounterDate),
    DATE_TRUNC('month', e.EncounterDate);

GO

-- Provider Performance Summary View
CREATE VIEW dbo.vw_ProviderPerformanceSummary
AS
SELECT 
    p.ProviderCode,
    p.FirstName + ' ' + p.LastName as ProviderName,
    p.PrimarySpecialty,
    f.FacilityName,
    DATE_TRUNC('month', e.EncounterDate) as MonthYear,
    
    -- Productivity Metrics
    COUNT(DISTINCT e.EncounterID) as TotalEncounters,
    COUNT(DISTINCT e.PatientID) as UniquePatients,
    SUM(proc.TotalRVU) as TotalRVUs,
    COUNT(DISTINCT e.EncounterID) * 1.0 / 
        NULLIF(COUNT(DISTINCT DATE(e.EncounterDate)), 0) as EncountersPerDay,
    
    -- Financial Performance
    SUM(e.ActualCharges) as TotalCharges,
    SUM(pay.PaymentAmount) as TotalCollections,
    SUM(pay.PaymentAmount) / NULLIF(SUM(proc.TotalRVU), 0) as RevenuePerRVU,
    SUM(pay.PaymentAmount) / NULLIF(SUM(e.ActualCharges), 0) as CollectionRate,
    
    -- Quality Metrics
    AVG(e.DocumentationScore) as AvgDocumentationScore,
    AVG(e.PatientSatisfactionScore) as AvgPatientSatisfactionScore,
    
    -- Denial Performance
    COUNT(DISTINCT d.DenialID) as TotalDenials,
    COUNT(DISTINCT d.DenialID) * 100.0 / 
        NULLIF(COUNT(DISTINCT c.ClaimID), 0) as ProviderDenialRate

FROM dbo.Providers p
    INNER JOIN dbo.Encounters e ON p.ProviderID = e.ProviderID
    INNER JOIN dbo.Facilities f ON e.FacilityID = f.FacilityID
    LEFT JOIN dbo.Procedures proc ON e.EncounterID = proc.EncounterID
    LEFT JOIN dbo.Claims c ON e.EncounterID = c.EncounterID
    LEFT JOIN dbo.Payments pay ON c.ClaimID = pay.ClaimID AND pay.PaymentType = 'INSURANCE'
    LEFT JOIN dbo.Denials d ON c.ClaimID = d.ClaimID

WHERE p.EmploymentStatus = 'ACTIVE'
    AND e.EncounterStatus = 'COMPLETED'
    AND e.EncounterDate >= DATEADD(YEAR, -1, GETDATE()) -- Last year

GROUP BY 
    p.ProviderCode,
    p.FirstName + ' ' + p.LastName,
    p.PrimarySpecialty,
    f.FacilityName,
    DATE_TRUNC('month', e.EncounterDate);

GO

PRINT 'Analytics and reporting tables created successfully';