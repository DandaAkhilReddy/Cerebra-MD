-- =============================================================================
-- Stored Procedures for KPI Calculations
-- Cerebra-MD Healthcare Analytics Platform
-- =============================================================================

USE CerebraMD;
GO

-- =============================================================================
-- 1. FINANCIAL KPI CALCULATIONS
-- =============================================================================

-- Calculate Financial KPIs for Dashboard
CREATE OR ALTER PROCEDURE dbo.sp_CalculateFinancialKPIs
    @StartDate DATE,
    @EndDate DATE,
    @FacilityIDs NVARCHAR(MAX) = NULL, -- Comma-separated GUIDs
    @ProviderIDs NVARCHAR(MAX) = NULL, -- Comma-separated GUIDs
    @PayerIDs NVARCHAR(MAX) = NULL     -- Comma-separated GUIDs
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Parse facility IDs if provided
    DECLARE @FacilityTable TABLE (FacilityID UNIQUEIDENTIFIER);
    IF @FacilityIDs IS NOT NULL
    BEGIN
        INSERT INTO @FacilityTable (FacilityID)
        SELECT TRY_CAST(value AS UNIQUEIDENTIFIER)
        FROM STRING_SPLIT(@FacilityIDs, ',')
        WHERE TRY_CAST(value AS UNIQUEIDENTIFIER) IS NOT NULL;
    END
    
    -- Parse provider IDs if provided
    DECLARE @ProviderTable TABLE (ProviderID UNIQUEIDENTIFIER);
    IF @ProviderIDs IS NOT NULL
    BEGIN
        INSERT INTO @ProviderTable (ProviderID)
        SELECT TRY_CAST(value AS UNIQUEIDENTIFIER)
        FROM STRING_SPLIT(@ProviderIDs, ',')
        WHERE TRY_CAST(value AS UNIQUEIDENTIFIER) IS NOT NULL;
    END
    
    -- Parse payer IDs if provided
    DECLARE @PayerTable TABLE (PayerID UNIQUEIDENTIFIER);
    IF @PayerIDs IS NOT NULL
    BEGIN
        INSERT INTO @PayerTable (PayerID)
        SELECT TRY_CAST(value AS UNIQUEIDENTIFIER)
        FROM STRING_SPLIT(@PayerIDs, ',')
        WHERE TRY_CAST(value AS UNIQUEIDENTIFIER) IS NOT NULL;
    END
    
    -- Main financial KPI calculation
    SELECT 
        f.FacilityName,
        f.FacilityID,
        
        -- Volume Metrics
        COUNT(DISTINCT e.EncounterID) as TotalEncounters,
        COUNT(DISTINCT e.PatientID) as UniquePatients,
        COUNT(DISTINCT e.ProviderID) as ActiveProviders,
        
        -- Revenue Metrics
        SUM(COALESCE(e.ActualCharges, 0)) as TotalCharges,
        SUM(COALESCE(p.PaymentAmount, 0)) as TotalCollections,
        SUM(COALESCE(p.AdjustmentAmount, 0)) as TotalAdjustments,
        SUM(COALESCE(e.ActualCharges, 0)) - SUM(COALESCE(p.AdjustmentAmount, 0)) as NetCharges,
        
        -- Collection Rate Calculations
        CASE 
            WHEN SUM(COALESCE(e.ActualCharges, 0)) > 0 
            THEN SUM(COALESCE(p.PaymentAmount, 0)) / SUM(COALESCE(e.ActualCharges, 0)) 
            ELSE 0 
        END as GrossCollectionRate,
        
        CASE 
            WHEN (SUM(COALESCE(e.ActualCharges, 0)) - SUM(COALESCE(p.AdjustmentAmount, 0))) > 0 
            THEN SUM(COALESCE(p.PaymentAmount, 0)) / 
                 (SUM(COALESCE(e.ActualCharges, 0)) - SUM(COALESCE(p.AdjustmentAmount, 0)))
            ELSE 0 
        END as NetCollectionRate,
        
        -- AR Metrics
        AVG(CASE WHEN p.PaymentDate IS NOT NULL AND c.SubmissionDate IS NOT NULL
            THEN DATEDIFF(DAY, c.SubmissionDate, p.PaymentDate) 
        END) as AvgDaysToPayment,
        
        -- Denial Metrics  
        COUNT(DISTINCT d.DenialID) as TotalDenials,
        CASE 
            WHEN COUNT(DISTINCT c.ClaimID) > 0 
            THEN CAST(COUNT(DISTINCT d.DenialID) AS DECIMAL(10,4)) / COUNT(DISTINCT c.ClaimID)
            ELSE 0 
        END as DenialRate,
        
        SUM(COALESCE(d.DeniedAmount, 0)) as TotalDeniedAmount,
        
        -- Performance Metrics
        SUM(COALESCE(e.ActualCharges, 0)) / NULLIF(COUNT(DISTINCT e.EncounterID), 0) as AvgChargePerEncounter,
        SUM(COALESCE(p.PaymentAmount, 0)) / NULLIF(COUNT(DISTINCT e.EncounterID), 0) as AvgCollectionPerEncounter,
        
        -- Trending (compare to prior period)
        (SELECT SUM(COALESCE(pe.ActualCharges, 0)) 
         FROM dbo.Encounters pe 
         WHERE pe.FacilityID = f.FacilityID 
           AND pe.EncounterDate BETWEEN DATEADD(DAY, -(DATEDIFF(DAY, @StartDate, @EndDate) + 1), @StartDate)
                                   AND DATEADD(DAY, -1, @StartDate)
           AND pe.EncounterStatus = 'COMPLETED'
        ) as PriorPeriodCharges,
        
        -- Data Quality
        COUNT(CASE WHEN e.DocumentationScore >= 0.8 THEN 1 END) * 100.0 / 
            NULLIF(COUNT(DISTINCT e.EncounterID), 0) as HighQualityDocumentationPercent
        
    FROM dbo.Encounters e
        INNER JOIN dbo.Facilities f ON e.FacilityID = f.FacilityID
        LEFT JOIN dbo.Claims c ON e.EncounterID = c.EncounterID
        LEFT JOIN dbo.Payments p ON c.ClaimID = p.ClaimID AND p.PaymentType = 'INSURANCE'
        LEFT JOIN dbo.Denials d ON c.ClaimID = d.ClaimID
        LEFT JOIN dbo.InsurancePlans ip ON c.PrimaryInsuranceID = ip.InsuranceID
        
    WHERE e.EncounterDate BETWEEN @StartDate AND @EndDate
        AND e.EncounterStatus = 'COMPLETED'
        AND (@FacilityIDs IS NULL OR EXISTS (SELECT 1 FROM @FacilityTable ft WHERE ft.FacilityID = e.FacilityID))
        AND (@ProviderIDs IS NULL OR EXISTS (SELECT 1 FROM @ProviderTable pt WHERE pt.ProviderID = e.ProviderID))
        AND (@PayerIDs IS NULL OR EXISTS (SELECT 1 FROM @PayerTable pyt WHERE pyt.PayerID = ip.PayerID))
        
    GROUP BY f.FacilityName, f.FacilityID
    ORDER BY f.FacilityName;
END;
GO

-- Calculate Monthly Financial Trends
CREATE OR ALTER PROCEDURE dbo.sp_CalculateMonthlyFinancialTrends
    @StartMonth DATE,
    @EndMonth DATE,
    @FacilityID UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Generate monthly trends for the specified period
    WITH MonthlyData AS (
        SELECT 
            YEAR(e.EncounterDate) as ReportYear,
            MONTH(e.EncounterDate) as ReportMonth,
            DATEFROMPARTS(YEAR(e.EncounterDate), MONTH(e.EncounterDate), 1) as MonthYear,
            f.FacilityName,
            f.FacilityID,
            
            -- Volume Metrics
            COUNT(DISTINCT e.EncounterID) as Encounters,
            COUNT(DISTINCT e.PatientID) as UniquePatients,
            
            -- Revenue Metrics
            SUM(COALESCE(e.ActualCharges, 0)) as TotalCharges,
            SUM(COALESCE(p.PaymentAmount, 0)) as TotalCollections,
            SUM(COALESCE(p.AdjustmentAmount, 0)) as TotalAdjustments,
            
            -- Collection Rate
            SUM(COALESCE(p.PaymentAmount, 0)) / 
                NULLIF(SUM(COALESCE(e.ActualCharges, 0)) - SUM(COALESCE(p.AdjustmentAmount, 0)), 0) as NetCollectionRate,
            
            -- Denial Metrics
            COUNT(DISTINCT d.DenialID) as TotalDenials,
            SUM(COALESCE(d.DeniedAmount, 0)) as TotalDeniedAmount
            
        FROM dbo.Encounters e
            INNER JOIN dbo.Facilities f ON e.FacilityID = f.FacilityID
            LEFT JOIN dbo.Claims c ON e.EncounterID = c.EncounterID
            LEFT JOIN dbo.Payments p ON c.ClaimID = p.ClaimID AND p.PaymentType = 'INSURANCE'
            LEFT JOIN dbo.Denials d ON c.ClaimID = d.ClaimID
            
        WHERE e.EncounterDate >= @StartMonth 
            AND e.EncounterDate < DATEADD(MONTH, 1, @EndMonth)
            AND e.EncounterStatus = 'COMPLETED'
            AND (@FacilityID IS NULL OR e.FacilityID = @FacilityID)
            
        GROUP BY 
            YEAR(e.EncounterDate),
            MONTH(e.EncounterDate), 
            f.FacilityName,
            f.FacilityID
    )
    
    SELECT 
        *,
        -- Month-over-Month Calculations
        LAG(TotalCharges, 1) OVER (PARTITION BY FacilityID ORDER BY MonthYear) as PriorMonthCharges,
        LAG(TotalCollections, 1) OVER (PARTITION BY FacilityID ORDER BY MonthYear) as PriorMonthCollections,
        LAG(NetCollectionRate, 1) OVER (PARTITION BY FacilityID ORDER BY MonthYear) as PriorMonthCollectionRate,
        
        -- Year-over-Year Calculations
        LAG(TotalCharges, 12) OVER (PARTITION BY FacilityID ORDER BY MonthYear) as PriorYearCharges,
        LAG(TotalCollections, 12) OVER (PARTITION BY FacilityID ORDER BY MonthYear) as PriorYearCollections,
        LAG(NetCollectionRate, 12) OVER (PARTITION BY FacilityID ORDER BY MonthYear) as PriorYearCollectionRate,
        
        -- Growth Calculations
        (TotalCharges - LAG(TotalCharges, 1) OVER (PARTITION BY FacilityID ORDER BY MonthYear)) /
            NULLIF(LAG(TotalCharges, 1) OVER (PARTITION BY FacilityID ORDER BY MonthYear), 0) * 100 as MonthOverMonthGrowthPercent,
            
        (TotalCharges - LAG(TotalCharges, 12) OVER (PARTITION BY FacilityID ORDER BY MonthYear)) /
            NULLIF(LAG(TotalCharges, 12) OVER (PARTITION BY FacilityID ORDER BY MonthYear), 0) * 100 as YearOverYearGrowthPercent
    
    FROM MonthlyData
    ORDER BY FacilityName, MonthYear;
END;
GO

-- =============================================================================
-- 2. DENIAL ANALYTICS PROCEDURES
-- =============================================================================

-- Get Denial Analytics Summary
CREATE OR ALTER PROCEDURE dbo.sp_GetDenialAnalytics
    @StartDate DATE,
    @EndDate DATE,
    @FacilityIDs NVARCHAR(MAX) = NULL,
    @PayerIDs NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Parse facility IDs if provided
    DECLARE @FacilityTable TABLE (FacilityID UNIQUEIDENTIFIER);
    IF @FacilityIDs IS NOT NULL
    BEGIN
        INSERT INTO @FacilityTable (FacilityID)
        SELECT TRY_CAST(value AS UNIQUEIDENTIFIER)
        FROM STRING_SPLIT(@FacilityIDs, ',')
        WHERE TRY_CAST(value AS UNIQUEIDENTIFIER) IS NOT NULL;
    END
    
    -- Parse payer IDs if provided
    DECLARE @PayerTable TABLE (PayerID UNIQUEIDENTIFIER);
    IF @PayerIDs IS NOT NULL
    BEGIN
        INSERT INTO @PayerTable (PayerID)
        SELECT TRY_CAST(value AS UNIQUEIDENTIFIER)
        FROM STRING_SPLIT(@PayerIDs, ',')
        WHERE TRY_CAST(value AS UNIQUEIDENTIFIER) IS NOT NULL;
    END
    
    -- Main denial analytics query
    SELECT 
        f.FacilityName,
        ic.PayerName,
        d.DenialCategory,
        d.DenialReasonDescription,
        
        -- Volume Metrics
        COUNT(*) as TotalDenials,
        COUNT(DISTINCT d.ClaimID) as DeniedClaims,
        COUNT(DISTINCT c.PatientID) as AffectedPatients,
        COUNT(DISTINCT c.ProviderID) as AffectedProviders,
        
        -- Financial Impact
        SUM(d.DeniedAmount) as TotalDeniedAmount,
        AVG(d.DeniedAmount) as AvgDenialAmount,
        MIN(d.DeniedAmount) as MinDenialAmount,
        MAX(d.DeniedAmount) as MaxDenialAmount,
        
        -- Resolution Metrics
        COUNT(CASE WHEN d.DenialStatus = 'RESOLVED' THEN 1 END) as ResolvedDenials,
        COUNT(CASE WHEN d.DenialStatus IN ('RESOLVED', 'CLOSED') THEN 1 END) as ClosedDenials,
        
        SUM(CASE WHEN d.DenialStatus = 'RESOLVED' THEN COALESCE(d.ResolutionAmount, 0) ELSE 0 END) as TotalRecoveredAmount,
        
        -- Performance Metrics
        AVG(CASE WHEN d.DenialStatus IN ('RESOLVED', 'CLOSED') 
            THEN DATEDIFF(DAY, d.DenialDate, COALESCE(d.ResolutionDate, GETDATE())) 
        END) as AvgDaysToResolution,
        
        -- Success Rates
        COUNT(CASE WHEN d.DenialStatus = 'RESOLVED' THEN 1 END) * 100.0 / 
            NULLIF(COUNT(*), 0) as ResolutionRate,
            
        SUM(CASE WHEN d.DenialStatus = 'RESOLVED' THEN COALESCE(d.ResolutionAmount, 0) ELSE 0 END) /
            NULLIF(SUM(d.DeniedAmount), 0) as RecoveryRate,
            
        -- Prevention Analysis
        COUNT(CASE WHEN d.IsPreventable = 1 THEN 1 END) as PreventableDenials,
        COUNT(CASE WHEN d.IsPreventable = 1 THEN 1 END) * 100.0 / 
            NULLIF(COUNT(*), 0) as PreventableRate,
        
        -- Trending
        COUNT(CASE WHEN d.DenialDate >= DATEADD(DAY, -30, @EndDate) THEN 1 END) as DenialsLast30Days,
        COUNT(CASE WHEN d.DenialDate >= DATEADD(DAY, -7, @EndDate) THEN 1 END) as DenialsLast7Days
        
    FROM dbo.Denials d
        INNER JOIN dbo.Claims c ON d.ClaimID = c.ClaimID
        INNER JOIN dbo.Encounters e ON c.EncounterID = e.EncounterID
        INNER JOIN dbo.Facilities f ON e.FacilityID = f.FacilityID
        LEFT JOIN dbo.InsurancePlans ip ON c.PrimaryInsuranceID = ip.InsuranceID
        LEFT JOIN dbo.InsuranceCompanies ic ON ip.PayerID = ic.PayerID
        
    WHERE d.DenialDate BETWEEN @StartDate AND @EndDate
        AND (@FacilityIDs IS NULL OR EXISTS (SELECT 1 FROM @FacilityTable ft WHERE ft.FacilityID = e.FacilityID))
        AND (@PayerIDs IS NULL OR EXISTS (SELECT 1 FROM @PayerTable pt WHERE pt.PayerID = ic.PayerID))
        
    GROUP BY 
        f.FacilityName,
        ic.PayerName,
        d.DenialCategory,
        d.DenialReasonDescription
        
    ORDER BY TotalDeniedAmount DESC;
END;
GO

-- Get Top Denial Reasons
CREATE OR ALTER PROCEDURE dbo.sp_GetTopDenialReasons
    @StartDate DATE,
    @EndDate DATE,
    @TopCount INT = 10,
    @FacilityID UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT TOP (@TopCount)
        d.DenialReasonCode,
        d.DenialReasonDescription,
        d.DenialCategory,
        
        -- Volume Metrics
        COUNT(*) as DenialCount,
        COUNT(DISTINCT d.ClaimID) as AffectedClaims,
        COUNT(DISTINCT c.PatientID) as AffectedPatients,
        
        -- Financial Impact
        SUM(d.DeniedAmount) as TotalDeniedAmount,
        AVG(d.DeniedAmount) as AvgDeniedAmount,
        
        -- Trend Analysis
        COUNT(CASE WHEN d.DenialDate >= DATEADD(DAY, -30, @EndDate) THEN 1 END) as Recent30Days,
        COUNT(CASE WHEN d.DenialDate < DATEADD(DAY, -30, @EndDate) THEN 1 END) as Prior30Days,
        
        -- Success Metrics
        COUNT(CASE WHEN d.DenialStatus = 'RESOLVED' THEN 1 END) as ResolvedCount,
        SUM(CASE WHEN d.DenialStatus = 'RESOLVED' THEN COALESCE(d.ResolutionAmount, 0) ELSE 0 END) as RecoveredAmount,
        
        -- Prevention Analysis
        COUNT(CASE WHEN d.IsPreventable = 1 THEN 1 END) as PreventableCount,
        
        -- Performance Metrics
        AVG(CASE WHEN d.DenialStatus IN ('RESOLVED', 'CLOSED') 
            THEN DATEDIFF(DAY, d.DenialDate, COALESCE(d.ResolutionDate, GETDATE())) 
        END) as AvgResolutionDays
        
    FROM dbo.Denials d
        INNER JOIN dbo.Claims c ON d.ClaimID = c.ClaimID
        INNER JOIN dbo.Encounters e ON c.EncounterID = e.EncounterID
        
    WHERE d.DenialDate BETWEEN @StartDate AND @EndDate
        AND (@FacilityID IS NULL OR e.FacilityID = @FacilityID)
        
    GROUP BY 
        d.DenialReasonCode,
        d.DenialReasonDescription,
        d.DenialCategory
        
    ORDER BY TotalDeniedAmount DESC;
END;
GO

-- =============================================================================
-- 3. PROVIDER PERFORMANCE PROCEDURES
-- =============================================================================

-- Calculate Provider Performance KPIs
CREATE OR ALTER PROCEDURE dbo.sp_CalculateProviderPerformance
    @StartDate DATE,
    @EndDate DATE,
    @ProviderIDs NVARCHAR(MAX) = NULL,
    @FacilityID UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Parse provider IDs if provided
    DECLARE @ProviderTable TABLE (ProviderID UNIQUEIDENTIFIER);
    IF @ProviderIDs IS NOT NULL
    BEGIN
        INSERT INTO @ProviderTable (ProviderID)
        SELECT TRY_CAST(value AS UNIQUEIDENTIFIER)
        FROM STRING_SPLIT(@ProviderIDs, ',')
        WHERE TRY_CAST(value AS UNIQUEIDENTIFIER) IS NOT NULL;
    END
    
    -- Calculate working days in period
    DECLARE @WorkingDays INT = dbo.fn_GetWorkingDayCount(@StartDate, @EndDate);
    
    SELECT 
        p.ProviderCode,
        p.FirstName + ' ' + p.LastName as ProviderName,
        p.PrimarySpecialty,
        f.FacilityName,
        
        -- Productivity Metrics
        COUNT(DISTINCT e.EncounterID) as TotalEncounters,
        COUNT(DISTINCT e.PatientID) as UniquePatients,
        COUNT(DISTINCT CAST(e.EncounterDate AS DATE)) as DaysWorked,
        
        -- RVU Metrics
        SUM(COALESCE(proc.TotalRVU, 0)) as TotalRVUs,
        SUM(COALESCE(proc.WorkRVU, 0)) as WorkRVUs,
        AVG(COALESCE(proc.TotalRVU, 0)) as AvgRVUsPerEncounter,
        
        -- Encounter Volume Metrics
        COUNT(DISTINCT e.EncounterID) * 1.0 / NULLIF(COUNT(DISTINCT CAST(e.EncounterDate AS DATE)), 0) as EncountersPerDay,
        COUNT(DISTINCT e.EncounterID) * 1.0 / NULLIF(@WorkingDays, 0) as EncountersPerWorkingDay,
        
        -- Financial Performance
        SUM(COALESCE(e.ActualCharges, 0)) as TotalCharges,
        SUM(COALESCE(pay.PaymentAmount, 0)) as TotalCollections,
        
        -- Revenue per RVU
        SUM(COALESCE(e.ActualCharges, 0)) / NULLIF(SUM(COALESCE(proc.TotalRVU, 0)), 0) as ChargesPerRVU,
        SUM(COALESCE(pay.PaymentAmount, 0)) / NULLIF(SUM(COALESCE(proc.TotalRVU, 0)), 0) as CollectionsPerRVU,
        
        -- Collection Performance
        SUM(COALESCE(pay.PaymentAmount, 0)) / NULLIF(SUM(COALESCE(e.ActualCharges, 0)), 0) as CollectionRate,
        
        -- Quality Metrics
        AVG(COALESCE(e.DocumentationScore, 0)) as AvgDocumentationScore,
        AVG(COALESCE(e.PatientSatisfactionScore, 0)) as AvgPatientSatisfactionScore,
        COUNT(CASE WHEN e.DocumentationScore >= 0.9 THEN 1 END) * 100.0 / 
            NULLIF(COUNT(DISTINCT e.EncounterID), 0) as HighQualityDocumentationPercent,
        
        -- Denial Performance
        COUNT(DISTINCT d.DenialID) as TotalDenials,
        COUNT(DISTINCT d.DenialID) * 100.0 / NULLIF(COUNT(DISTINCT c.ClaimID), 0) as DenialRate,
        SUM(COALESCE(d.DeniedAmount, 0)) as TotalDeniedAmount,
        
        -- Case Mix Analysis
        COUNT(DISTINCT diag.DiagnosisCode) as UniqueDiagnosisCodes,
        COUNT(DISTINCT proc.CPTCode) as UniqueProcedureCodes,
        
        -- Efficiency Metrics
        AVG(CASE WHEN e.CheckInTime IS NOT NULL AND e.CheckOutTime IS NOT NULL 
            THEN DATEDIFF(MINUTE, e.CheckInTime, e.CheckOutTime) END) as AvgVisitDurationMinutes,
        AVG(CASE WHEN e.ProviderStartTime IS NOT NULL AND e.ProviderEndTime IS NOT NULL 
            THEN DATEDIFF(MINUTE, e.ProviderStartTime, e.ProviderEndTime) END) as AvgProviderTimeMinutes,
        
        -- Comparative Rankings (within specialty)
        RANK() OVER (PARTITION BY p.PrimarySpecialty ORDER BY COUNT(DISTINCT e.EncounterID) DESC) as VolumeRankInSpecialty,
        RANK() OVER (PARTITION BY p.PrimarySpecialty ORDER BY SUM(COALESCE(proc.TotalRVU, 0)) DESC) as RVURankInSpecialty,
        RANK() OVER (PARTITION BY p.PrimarySpecialty ORDER BY SUM(COALESCE(pay.PaymentAmount, 0)) / NULLIF(SUM(COALESCE(e.ActualCharges, 0)), 0) DESC) as CollectionRateRankInSpecialty
        
    FROM dbo.Providers p
        INNER JOIN dbo.Encounters e ON p.ProviderID = e.ProviderID
        INNER JOIN dbo.Facilities f ON e.FacilityID = f.FacilityID
        LEFT JOIN dbo.Procedures proc ON e.EncounterID = proc.EncounterID
        LEFT JOIN dbo.Diagnoses diag ON e.EncounterID = diag.EncounterID AND diag.DiagnosisType = 'PRIMARY'
        LEFT JOIN dbo.Claims c ON e.EncounterID = c.EncounterID
        LEFT JOIN dbo.Payments pay ON c.ClaimID = pay.ClaimID AND pay.PaymentType = 'INSURANCE'
        LEFT JOIN dbo.Denials d ON c.ClaimID = d.ClaimID
        
    WHERE e.EncounterDate BETWEEN @StartDate AND @EndDate
        AND e.EncounterStatus = 'COMPLETED'
        AND p.EmploymentStatus = 'ACTIVE'
        AND (@ProviderIDs IS NULL OR EXISTS (SELECT 1 FROM @ProviderTable pt WHERE pt.ProviderID = p.ProviderID))
        AND (@FacilityID IS NULL OR e.FacilityID = @FacilityID)
        
    GROUP BY 
        p.ProviderCode,
        p.FirstName + ' ' + p.LastName,
        p.PrimarySpecialty,
        f.FacilityName
        
    ORDER BY TotalRVUs DESC;
END;
GO

-- =============================================================================
-- 4. AR AGING PROCEDURES
-- =============================================================================

-- Calculate AR Aging Summary
CREATE OR ALTER PROCEDURE dbo.sp_CalculateARAgingSummary
    @AsOfDate DATE = NULL,
    @FacilityIDs NVARCHAR(MAX) = NULL,
    @PayerIDs NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Default to current date if not provided
    SET @AsOfDate = COALESCE(@AsOfDate, CAST(GETDATE() AS DATE));
    
    -- Parse facility IDs if provided
    DECLARE @FacilityTable TABLE (FacilityID UNIQUEIDENTIFIER);
    IF @FacilityIDs IS NOT NULL
    BEGIN
        INSERT INTO @FacilityTable (FacilityID)
        SELECT TRY_CAST(value AS UNIQUEIDENTIFIER)
        FROM STRING_SPLIT(@FacilityIDs, ',')
        WHERE TRY_CAST(value AS UNIQUEIDENTIFIER) IS NOT NULL;
    END
    
    -- Parse payer IDs if provided
    DECLARE @PayerTable TABLE (PayerID UNIQUEIDENTIFIER);
    IF @PayerIDs IS NOT NULL
    BEGIN
        INSERT INTO @PayerTable (PayerID)
        SELECT TRY_CAST(value AS UNIQUEIDENTIFIER)
        FROM STRING_SPLIT(@PayerIDs, ',')
        WHERE TRY_CAST(value AS UNIQUEIDENTIFIER) IS NOT NULL;
    END
    
    -- Calculate outstanding balances by aging buckets
    SELECT 
        f.FacilityName,
        ic.PayerName,
        ic.PayerType,
        
        -- AR Aging Buckets
        SUM(CASE WHEN DATEDIFF(DAY, c.SubmissionDate, @AsOfDate) BETWEEN 0 AND 30 
            THEN (c.BilledAmount - COALESCE(p.PaidAmount, 0) - COALESCE(p.AdjustmentAmount, 0)) 
            ELSE 0 END) as Current_0_30,
            
        SUM(CASE WHEN DATEDIFF(DAY, c.SubmissionDate, @AsOfDate) BETWEEN 31 AND 60 
            THEN (c.BilledAmount - COALESCE(p.PaidAmount, 0) - COALESCE(p.AdjustmentAmount, 0)) 
            ELSE 0 END) as Days_31_60,
            
        SUM(CASE WHEN DATEDIFF(DAY, c.SubmissionDate, @AsOfDate) BETWEEN 61 AND 90 
            THEN (c.BilledAmount - COALESCE(p.PaidAmount, 0) - COALESCE(p.AdjustmentAmount, 0)) 
            ELSE 0 END) as Days_61_90,
            
        SUM(CASE WHEN DATEDIFF(DAY, c.SubmissionDate, @AsOfDate) BETWEEN 91 AND 120 
            THEN (c.BilledAmount - COALESCE(p.PaidAmount, 0) - COALESCE(p.AdjustmentAmount, 0)) 
            ELSE 0 END) as Days_91_120,
            
        SUM(CASE WHEN DATEDIFF(DAY, c.SubmissionDate, @AsOfDate) > 120 
            THEN (c.BilledAmount - COALESCE(p.PaidAmount, 0) - COALESCE(p.AdjustmentAmount, 0)) 
            ELSE 0 END) as Days_Over_120,
        
        -- Total AR
        SUM(c.BilledAmount - COALESCE(p.PaidAmount, 0) - COALESCE(p.AdjustmentAmount, 0)) as TotalAR,
        
        -- Count Metrics
        COUNT(DISTINCT c.ClaimID) as OutstandingClaims,
        COUNT(DISTINCT c.PatientID) as PatientsWithAR,
        
        -- Average Days Outstanding
        AVG(DATEDIFF(DAY, c.SubmissionDate, @AsOfDate)) as AvgDaysOutstanding,
        
        -- Weighted Average Age (weighted by outstanding amount)
        SUM(DATEDIFF(DAY, c.SubmissionDate, @AsOfDate) * 
            (c.BilledAmount - COALESCE(p.PaidAmount, 0) - COALESCE(p.AdjustmentAmount, 0))) / 
            NULLIF(SUM(c.BilledAmount - COALESCE(p.PaidAmount, 0) - COALESCE(p.AdjustmentAmount, 0)), 0) as WeightedAvgAge,
            
        -- Performance Metrics
        COUNT(CASE WHEN DATEDIFF(DAY, c.SubmissionDate, @AsOfDate) <= 30 THEN 1 END) * 100.0 / 
            NULLIF(COUNT(DISTINCT c.ClaimID), 0) as PercentCurrent30Days,
            
        COUNT(CASE WHEN DATEDIFF(DAY, c.SubmissionDate, @AsOfDate) > 90 THEN 1 END) * 100.0 / 
            NULLIF(COUNT(DISTINCT c.ClaimID), 0) as PercentOver90Days
        
    FROM dbo.Claims c
        INNER JOIN dbo.Encounters e ON c.EncounterID = e.EncounterID
        INNER JOIN dbo.Facilities f ON e.FacilityID = f.FacilityID
        LEFT JOIN dbo.InsurancePlans ip ON c.PrimaryInsuranceID = ip.InsuranceID
        LEFT JOIN dbo.InsuranceCompanies ic ON ip.PayerID = ic.PayerID
        LEFT JOIN (
            -- Aggregate payments by claim
            SELECT 
                ClaimID,
                SUM(PaymentAmount) as PaidAmount,
                SUM(AdjustmentAmount) as AdjustmentAmount
            FROM dbo.Payments 
            WHERE PaymentDate <= @AsOfDate
            GROUP BY ClaimID
        ) p ON c.ClaimID = p.ClaimID
        
    WHERE c.SubmissionDate <= @AsOfDate
        AND c.ClaimStatus NOT IN ('PAID', 'CLOSED', 'VOID')
        AND (c.BilledAmount - COALESCE(p.PaidAmount, 0) - COALESCE(p.AdjustmentAmount, 0)) > 0.01 -- Outstanding balance > $0.01
        AND (@FacilityIDs IS NULL OR EXISTS (SELECT 1 FROM @FacilityTable ft WHERE ft.FacilityID = e.FacilityID))
        AND (@PayerIDs IS NULL OR EXISTS (SELECT 1 FROM @PayerTable pt WHERE pt.PayerID = ic.PayerID))
        
    GROUP BY 
        f.FacilityName,
        ic.PayerName,
        ic.PayerType
        
    ORDER BY TotalAR DESC;
END;
GO

-- =============================================================================
-- 5. UTILITY FUNCTIONS
-- =============================================================================

-- Function to calculate working days between two dates
CREATE OR ALTER FUNCTION dbo.fn_GetWorkingDayCount
(
    @StartDate DATE,
    @EndDate DATE
)
RETURNS INT
AS
BEGIN
    DECLARE @WorkingDays INT = 0;
    DECLARE @CurrentDate DATE = @StartDate;
    
    WHILE @CurrentDate <= @EndDate
    BEGIN
        -- Exclude weekends (Saturday = 7, Sunday = 1)
        IF DATEPART(WEEKDAY, @CurrentDate) NOT IN (1, 7)
        BEGIN
            SET @WorkingDays = @WorkingDays + 1;
        END
        
        SET @CurrentDate = DATEADD(DAY, 1, @CurrentDate);
    END
    
    RETURN @WorkingDays;
END;
GO

PRINT 'KPI calculation stored procedures created successfully';