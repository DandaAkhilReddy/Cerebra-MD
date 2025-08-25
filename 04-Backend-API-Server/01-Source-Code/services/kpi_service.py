# =============================================================================
# KPI Calculation Service
# Cerebra-MD Healthcare Analytics Platform
# =============================================================================

from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Any, Optional, Tuple
from uuid import UUID
import asyncio
import logging
from dataclasses import dataclass, asdict

import pandas as pd
from sqlalchemy import text, func
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession

from ..database.connection import get_database_session
from ..models.database_models import (
    Encounter, Claim, Payment, Denial, Provider, Facility, 
    InsuranceCompany, Patient, Procedure, Diagnosis
)
from ..utils.cache import redis_cache
from ..utils.exceptions import DataProcessingError, ValidationError

logger = logging.getLogger(__name__)

# =============================================================================
# DATA TRANSFER OBJECTS
# =============================================================================

@dataclass
class KPIFilters:
    """Filters for KPI calculations"""
    start_date: date
    end_date: date
    facility_ids: Optional[List[str]] = None
    provider_ids: Optional[List[str]] = None
    payer_ids: Optional[List[str]] = None
    
    def __post_init__(self):
        if self.start_date > self.end_date:
            raise ValidationError("Start date cannot be after end date")

@dataclass
class FinancialKPIs:
    """Financial performance KPIs"""
    facility_name: str
    facility_id: str
    
    # Volume Metrics
    total_encounters: int
    unique_patients: int
    active_providers: int
    
    # Revenue Metrics
    total_charges: Decimal
    total_collections: Decimal
    total_adjustments: Decimal
    net_charges: Decimal
    
    # Collection Rates
    gross_collection_rate: float
    net_collection_rate: float
    
    # AR Metrics
    avg_days_to_payment: Optional[float]
    
    # Denial Metrics
    total_denials: int
    denial_rate: float
    total_denied_amount: Decimal
    
    # Performance Metrics
    avg_charge_per_encounter: Decimal
    avg_collection_per_encounter: Decimal
    
    # Trending
    prior_period_charges: Optional[Decimal]
    high_quality_documentation_percent: float
    
    # Metadata
    calculation_date: datetime
    data_freshness: Optional[datetime]

@dataclass
class DenialAnalytics:
    """Denial analytics and metrics"""
    facility_name: str
    payer_name: str
    denial_category: str
    denial_reason: str
    
    # Volume Metrics
    total_denials: int
    denied_claims: int
    affected_patients: int
    affected_providers: int
    
    # Financial Impact
    total_denied_amount: Decimal
    avg_denial_amount: Decimal
    min_denial_amount: Decimal
    max_denial_amount: Decimal
    
    # Resolution Metrics
    resolved_denials: int
    closed_denials: int
    total_recovered_amount: Decimal
    avg_days_to_resolution: Optional[float]
    
    # Success Rates
    resolution_rate: float
    recovery_rate: float
    
    # Prevention Analysis
    preventable_denials: int
    preventable_rate: float
    
    # Trending
    denials_last_30_days: int
    denials_last_7_days: int

@dataclass
class ProviderPerformance:
    """Provider performance metrics"""
    provider_code: str
    provider_name: str
    primary_specialty: str
    facility_name: str
    
    # Productivity Metrics
    total_encounters: int
    unique_patients: int
    days_worked: int
    total_rvus: Decimal
    work_rvus: Decimal
    avg_rvus_per_encounter: Decimal
    encounters_per_day: float
    encounters_per_working_day: float
    
    # Financial Performance
    total_charges: Decimal
    total_collections: Decimal
    charges_per_rvu: Decimal
    collections_per_rvu: Decimal
    collection_rate: float
    
    # Quality Metrics
    avg_documentation_score: float
    avg_patient_satisfaction_score: float
    high_quality_documentation_percent: float
    
    # Denial Performance
    total_denials: int
    denial_rate: float
    total_denied_amount: Decimal
    
    # Case Mix Analysis
    unique_diagnosis_codes: int
    unique_procedure_codes: int
    
    # Efficiency Metrics
    avg_visit_duration_minutes: Optional[float]
    avg_provider_time_minutes: Optional[float]
    
    # Comparative Rankings
    volume_rank_in_specialty: int
    rvu_rank_in_specialty: int
    collection_rate_rank_in_specialty: int

@dataclass
class ARAgingSummary:
    """Accounts receivable aging analysis"""
    facility_name: str
    payer_name: str
    payer_type: str
    
    # AR Aging Buckets
    current_0_30: Decimal
    days_31_60: Decimal
    days_61_90: Decimal
    days_91_120: Decimal
    days_over_120: Decimal
    total_ar: Decimal
    
    # Count Metrics
    outstanding_claims: int
    patients_with_ar: int
    
    # Average Metrics
    avg_days_outstanding: float
    weighted_avg_age: float
    
    # Performance Metrics
    percent_current_30_days: float
    percent_over_90_days: float

# =============================================================================
# KPI SERVICE CLASS
# =============================================================================

class KPIService:
    """Service for calculating healthcare KPIs"""
    
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        
    async def calculate_financial_kpis(self, filters: KPIFilters) -> List[FinancialKPIs]:
        """Calculate financial performance KPIs"""
        
        logger.info(f"Calculating financial KPIs for {filters.start_date} to {filters.end_date}")
        
        try:
            # Build parameterized query
            params = {
                'start_date': filters.start_date,
                'end_date': filters.end_date
            }
            
            # Base query with filters
            base_query = """
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
                    
                    -- Data Quality
                    COUNT(CASE WHEN e.DocumentationScore >= 0.8 THEN 1 END) * 100.0 / 
                        NULLIF(COUNT(DISTINCT e.EncounterID), 0) as HighQualityDocumentationPercent
                    
                FROM Encounters e
                    INNER JOIN Facilities f ON e.FacilityID = f.FacilityID
                    LEFT JOIN Claims c ON e.EncounterID = c.EncounterID
                    LEFT JOIN Payments p ON c.ClaimID = p.ClaimID AND p.PaymentType = 'INSURANCE'
                    LEFT JOIN Denials d ON c.ClaimID = d.ClaimID
                    LEFT JOIN InsurancePlans ip ON c.PrimaryInsuranceID = ip.InsuranceID
                    
                WHERE e.EncounterDate BETWEEN :start_date AND :end_date
                    AND e.EncounterStatus = 'COMPLETED'
            """
            
            # Add facility filter if specified
            if filters.facility_ids:
                facility_placeholders = ','.join([f':facility_{i}' for i in range(len(filters.facility_ids))])
                base_query += f" AND e.FacilityID IN ({facility_placeholders})"
                for i, facility_id in enumerate(filters.facility_ids):
                    params[f'facility_{i}'] = facility_id
            
            # Add provider filter if specified
            if filters.provider_ids:
                provider_placeholders = ','.join([f':provider_{i}' for i in range(len(filters.provider_ids))])
                base_query += f" AND e.ProviderID IN ({provider_placeholders})"
                for i, provider_id in enumerate(filters.provider_ids):
                    params[f'provider_{i}'] = provider_id
                    
            base_query += " GROUP BY f.FacilityName, f.FacilityID ORDER BY f.FacilityName"
            
            # Execute query
            result = await self.db.execute(text(base_query), params)
            rows = result.fetchall()
            
            kpis = []
            for row in rows:
                # Calculate prior period comparison
                prior_period_charges = await self._get_prior_period_charges(
                    row.FacilityID, filters.start_date, filters.end_date
                )
                
                kpi = FinancialKPIs(
                    facility_name=row.FacilityName,
                    facility_id=str(row.FacilityID),
                    total_encounters=row.TotalEncounters,
                    unique_patients=row.UniquePatients,
                    active_providers=row.ActiveProviders,
                    total_charges=Decimal(str(row.TotalCharges or 0)),
                    total_collections=Decimal(str(row.TotalCollections or 0)),
                    total_adjustments=Decimal(str(row.TotalAdjustments or 0)),
                    net_charges=Decimal(str(row.NetCharges or 0)),
                    gross_collection_rate=float(row.GrossCollectionRate or 0),
                    net_collection_rate=float(row.NetCollectionRate or 0),
                    avg_days_to_payment=float(row.AvgDaysToPayment) if row.AvgDaysToPayment else None,
                    total_denials=row.TotalDenials,
                    denial_rate=float(row.DenialRate or 0),
                    total_denied_amount=Decimal(str(row.TotalDeniedAmount or 0)),
                    avg_charge_per_encounter=Decimal(str(row.AvgChargePerEncounter or 0)),
                    avg_collection_per_encounter=Decimal(str(row.AvgCollectionPerEncounter or 0)),
                    prior_period_charges=prior_period_charges,
                    high_quality_documentation_percent=float(row.HighQualityDocumentationPercent or 0),
                    calculation_date=datetime.utcnow(),
                    data_freshness=await self._get_data_freshness('encounters')
                )
                kpis.append(kpi)
                
            logger.info(f"Calculated financial KPIs for {len(kpis)} facilities")
            return kpis
            
        except Exception as e:
            logger.error(f"Error calculating financial KPIs: {str(e)}")
            raise DataProcessingError(f"Failed to calculate financial KPIs: {str(e)}")
    
    async def calculate_denial_analytics(self, filters: KPIFilters) -> List[DenialAnalytics]:
        """Calculate denial analytics and trends"""
        
        logger.info(f"Calculating denial analytics for {filters.start_date} to {filters.end_date}")
        
        try:
            params = {
                'start_date': filters.start_date,
                'end_date': filters.end_date
            }
            
            query = """
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
                    COUNT(CASE WHEN d.DenialDate >= DATEADD(DAY, -30, :end_date) THEN 1 END) as DenialsLast30Days,
                    COUNT(CASE WHEN d.DenialDate >= DATEADD(DAY, -7, :end_date) THEN 1 END) as DenialsLast7Days
                    
                FROM Denials d
                    INNER JOIN Claims c ON d.ClaimID = c.ClaimID
                    INNER JOIN Encounters e ON c.EncounterID = e.EncounterID
                    INNER JOIN Facilities f ON e.FacilityID = f.FacilityID
                    LEFT JOIN InsurancePlans ip ON c.PrimaryInsuranceID = ip.InsuranceID
                    LEFT JOIN InsuranceCompanies ic ON ip.PayerID = ic.PayerID
                    
                WHERE d.DenialDate BETWEEN :start_date AND :end_date
            """
            
            # Add filters
            if filters.facility_ids:
                facility_placeholders = ','.join([f':facility_{i}' for i in range(len(filters.facility_ids))])
                query += f" AND e.FacilityID IN ({facility_placeholders})"
                for i, facility_id in enumerate(filters.facility_ids):
                    params[f'facility_{i}'] = facility_id
            
            if filters.payer_ids:
                payer_placeholders = ','.join([f':payer_{i}' for i in range(len(filters.payer_ids))])
                query += f" AND ic.PayerID IN ({payer_placeholders})"
                for i, payer_id in enumerate(filters.payer_ids):
                    params[f'payer_{i}'] = payer_id
                    
            query += """
                GROUP BY 
                    f.FacilityName,
                    ic.PayerName,
                    d.DenialCategory,
                    d.DenialReasonDescription
                    
                ORDER BY TotalDeniedAmount DESC
            """
            
            result = await self.db.execute(text(query), params)
            rows = result.fetchall()
            
            analytics = []
            for row in rows:
                analytic = DenialAnalytics(
                    facility_name=row.FacilityName or "Unknown",
                    payer_name=row.PayerName or "Unknown",
                    denial_category=row.DenialCategory,
                    denial_reason=row.DenialReasonDescription,
                    total_denials=row.TotalDenials,
                    denied_claims=row.DeniedClaims,
                    affected_patients=row.AffectedPatients,
                    affected_providers=row.AffectedProviders,
                    total_denied_amount=Decimal(str(row.TotalDeniedAmount or 0)),
                    avg_denial_amount=Decimal(str(row.AvgDenialAmount or 0)),
                    min_denial_amount=Decimal(str(row.MinDenialAmount or 0)),
                    max_denial_amount=Decimal(str(row.MaxDenialAmount or 0)),
                    resolved_denials=row.ResolvedDenials,
                    closed_denials=row.ClosedDenials,
                    total_recovered_amount=Decimal(str(row.TotalRecoveredAmount or 0)),
                    avg_days_to_resolution=float(row.AvgDaysToResolution) if row.AvgDaysToResolution else None,
                    resolution_rate=float(row.ResolutionRate or 0),
                    recovery_rate=float(row.RecoveryRate or 0),
                    preventable_denials=row.PreventableDenials,
                    preventable_rate=float(row.PreventableRate or 0),
                    denials_last_30_days=row.DenialsLast30Days,
                    denials_last_7_days=row.DenialsLast7Days
                )
                analytics.append(analytic)
                
            logger.info(f"Calculated denial analytics for {len(analytics)} combinations")
            return analytics
            
        except Exception as e:
            logger.error(f"Error calculating denial analytics: {str(e)}")
            raise DataProcessingError(f"Failed to calculate denial analytics: {str(e)}")
    
    async def calculate_provider_performance(self, filters: KPIFilters) -> List[ProviderPerformance]:
        """Calculate provider performance metrics"""
        
        logger.info(f"Calculating provider performance for {filters.start_date} to {filters.end_date}")
        
        try:
            # Calculate working days in period
            working_days = await self._calculate_working_days(filters.start_date, filters.end_date)
            
            params = {
                'start_date': filters.start_date,
                'end_date': filters.end_date,
                'working_days': working_days
            }
            
            query = """
                WITH ProviderMetrics AS (
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
                        COUNT(DISTINCT e.EncounterID) * 1.0 / NULLIF(:working_days, 0) as EncountersPerWorkingDay,
                        
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
                            THEN DATEDIFF(MINUTE, e.ProviderStartTime, e.ProviderEndTime) END) as AvgProviderTimeMinutes
                        
                    FROM Providers p
                        INNER JOIN Encounters e ON p.ProviderID = e.ProviderID
                        INNER JOIN Facilities f ON e.FacilityID = f.FacilityID
                        LEFT JOIN Procedures proc ON e.EncounterID = proc.EncounterID
                        LEFT JOIN Diagnoses diag ON e.EncounterID = diag.EncounterID AND diag.DiagnosisType = 'PRIMARY'
                        LEFT JOIN Claims c ON e.EncounterID = c.EncounterID
                        LEFT JOIN Payments pay ON c.ClaimID = pay.ClaimID AND pay.PaymentType = 'INSURANCE'
                        LEFT JOIN Denials d ON c.ClaimID = d.ClaimID
                        
                    WHERE e.EncounterDate BETWEEN :start_date AND :end_date
                        AND e.EncounterStatus = 'COMPLETED'
                        AND p.EmploymentStatus = 'ACTIVE'
            """
            
            # Add provider filter if specified
            if filters.provider_ids:
                provider_placeholders = ','.join([f':provider_{i}' for i in range(len(filters.provider_ids))])
                query += f" AND p.ProviderID IN ({provider_placeholders})"
                for i, provider_id in enumerate(filters.provider_ids):
                    params[f'provider_{i}'] = provider_id
            
            # Add facility filter if specified  
            if filters.facility_ids:
                facility_placeholders = ','.join([f':facility_{i}' for i in range(len(filters.facility_ids))])
                query += f" AND e.FacilityID IN ({facility_placeholders})"
                for i, facility_id in enumerate(filters.facility_ids):
                    params[f'facility_{i}'] = facility_id
                    
            query += """
                    GROUP BY 
                        p.ProviderCode,
                        p.FirstName + ' ' + p.LastName,
                        p.PrimarySpecialty,
                        f.FacilityName
                )
                SELECT 
                    *,
                    -- Comparative Rankings (within specialty)
                    RANK() OVER (PARTITION BY PrimarySpecialty ORDER BY TotalEncounters DESC) as VolumeRankInSpecialty,
                    RANK() OVER (PARTITION BY PrimarySpecialty ORDER BY TotalRVUs DESC) as RVURankInSpecialty,
                    RANK() OVER (PARTITION BY PrimarySpecialty ORDER BY CollectionRate DESC) as CollectionRateRankInSpecialty
                FROM ProviderMetrics
                ORDER BY TotalRVUs DESC
            """
            
            result = await self.db.execute(text(query), params)
            rows = result.fetchall()
            
            performance_list = []
            for row in rows:
                performance = ProviderPerformance(
                    provider_code=row.ProviderCode,
                    provider_name=row.ProviderName,
                    primary_specialty=row.PrimarySpecialty,
                    facility_name=row.FacilityName,
                    total_encounters=row.TotalEncounters,
                    unique_patients=row.UniquePatients,
                    days_worked=row.DaysWorked,
                    total_rvus=Decimal(str(row.TotalRVUs or 0)),
                    work_rvus=Decimal(str(row.WorkRVUs or 0)),
                    avg_rvus_per_encounter=Decimal(str(row.AvgRVUsPerEncounter or 0)),
                    encounters_per_day=float(row.EncountersPerDay or 0),
                    encounters_per_working_day=float(row.EncountersPerWorkingDay or 0),
                    total_charges=Decimal(str(row.TotalCharges or 0)),
                    total_collections=Decimal(str(row.TotalCollections or 0)),
                    charges_per_rvu=Decimal(str(row.ChargesPerRVU or 0)),
                    collections_per_rvu=Decimal(str(row.CollectionsPerRVU or 0)),
                    collection_rate=float(row.CollectionRate or 0),
                    avg_documentation_score=float(row.AvgDocumentationScore or 0),
                    avg_patient_satisfaction_score=float(row.AvgPatientSatisfactionScore or 0),
                    high_quality_documentation_percent=float(row.HighQualityDocumentationPercent or 0),
                    total_denials=row.TotalDenials,
                    denial_rate=float(row.DenialRate or 0),
                    total_denied_amount=Decimal(str(row.TotalDeniedAmount or 0)),
                    unique_diagnosis_codes=row.UniqueDiagnosisCodes,
                    unique_procedure_codes=row.UniqueProcedureCodes,
                    avg_visit_duration_minutes=float(row.AvgVisitDurationMinutes) if row.AvgVisitDurationMinutes else None,
                    avg_provider_time_minutes=float(row.AvgProviderTimeMinutes) if row.AvgProviderTimeMinutes else None,
                    volume_rank_in_specialty=row.VolumeRankInSpecialty,
                    rvu_rank_in_specialty=row.RVURankInSpecialty,
                    collection_rate_rank_in_specialty=row.CollectionRateRankInSpecialty
                )
                performance_list.append(performance)
                
            logger.info(f"Calculated provider performance for {len(performance_list)} providers")
            return performance_list
            
        except Exception as e:
            logger.error(f"Error calculating provider performance: {str(e)}")
            raise DataProcessingError(f"Failed to calculate provider performance: {str(e)}")
    
    async def calculate_ar_aging(self, as_of_date: Optional[date] = None, filters: Optional[KPIFilters] = None) -> List[ARAgingSummary]:
        """Calculate AR aging analysis"""
        
        if as_of_date is None:
            as_of_date = date.today()
            
        logger.info(f"Calculating AR aging as of {as_of_date}")
        
        try:
            params = {'as_of_date': as_of_date}
            
            query = """
                WITH PaymentAggregates AS (
                    SELECT 
                        ClaimID,
                        SUM(PaymentAmount) as TotalPaid,
                        SUM(AdjustmentAmount) as TotalAdjustments
                    FROM Payments 
                    WHERE PaymentDate <= :as_of_date
                    GROUP BY ClaimID
                )
                SELECT 
                    f.FacilityName,
                    ic.PayerName,
                    ic.PayerType,
                    
                    -- AR Aging Buckets
                    SUM(CASE WHEN DATEDIFF(DAY, c.SubmissionDate, :as_of_date) BETWEEN 0 AND 30 
                        THEN (c.BilledAmount - COALESCE(pa.TotalPaid, 0) - COALESCE(pa.TotalAdjustments, 0)) 
                        ELSE 0 END) as Current_0_30,
                        
                    SUM(CASE WHEN DATEDIFF(DAY, c.SubmissionDate, :as_of_date) BETWEEN 31 AND 60 
                        THEN (c.BilledAmount - COALESCE(pa.TotalPaid, 0) - COALESCE(pa.TotalAdjustments, 0)) 
                        ELSE 0 END) as Days_31_60,
                        
                    SUM(CASE WHEN DATEDIFF(DAY, c.SubmissionDate, :as_of_date) BETWEEN 61 AND 90 
                        THEN (c.BilledAmount - COALESCE(pa.TotalPaid, 0) - COALESCE(pa.TotalAdjustments, 0)) 
                        ELSE 0 END) as Days_61_90,
                        
                    SUM(CASE WHEN DATEDIFF(DAY, c.SubmissionDate, :as_of_date) BETWEEN 91 AND 120 
                        THEN (c.BilledAmount - COALESCE(pa.TotalPaid, 0) - COALESCE(pa.TotalAdjustments, 0)) 
                        ELSE 0 END) as Days_91_120,
                        
                    SUM(CASE WHEN DATEDIFF(DAY, c.SubmissionDate, :as_of_date) > 120 
                        THEN (c.BilledAmount - COALESCE(pa.TotalPaid, 0) - COALESCE(pa.TotalAdjustments, 0)) 
                        ELSE 0 END) as Days_Over_120,
                    
                    -- Total AR
                    SUM(c.BilledAmount - COALESCE(pa.TotalPaid, 0) - COALESCE(pa.TotalAdjustments, 0)) as TotalAR,
                    
                    -- Count Metrics
                    COUNT(DISTINCT c.ClaimID) as OutstandingClaims,
                    COUNT(DISTINCT c.PatientID) as PatientsWithAR,
                    
                    -- Average Days Outstanding
                    AVG(DATEDIFF(DAY, c.SubmissionDate, :as_of_date)) as AvgDaysOutstanding,
                    
                    -- Weighted Average Age
                    SUM(DATEDIFF(DAY, c.SubmissionDate, :as_of_date) * 
                        (c.BilledAmount - COALESCE(pa.TotalPaid, 0) - COALESCE(pa.TotalAdjustments, 0))) / 
                        NULLIF(SUM(c.BilledAmount - COALESCE(pa.TotalPaid, 0) - COALESCE(pa.TotalAdjustments, 0)), 0) as WeightedAvgAge,
                        
                    -- Performance Metrics
                    COUNT(CASE WHEN DATEDIFF(DAY, c.SubmissionDate, :as_of_date) <= 30 THEN 1 END) * 100.0 / 
                        NULLIF(COUNT(DISTINCT c.ClaimID), 0) as PercentCurrent30Days,
                        
                    COUNT(CASE WHEN DATEDIFF(DAY, c.SubmissionDate, :as_of_date) > 90 THEN 1 END) * 100.0 / 
                        NULLIF(COUNT(DISTINCT c.ClaimID), 0) as PercentOver90Days
                    
                FROM Claims c
                    INNER JOIN Encounters e ON c.EncounterID = e.EncounterID
                    INNER JOIN Facilities f ON e.FacilityID = f.FacilityID
                    LEFT JOIN InsurancePlans ip ON c.PrimaryInsuranceID = ip.InsuranceID
                    LEFT JOIN InsuranceCompanies ic ON ip.PayerID = ic.PayerID
                    LEFT JOIN PaymentAggregates pa ON c.ClaimID = pa.ClaimID
                    
                WHERE c.SubmissionDate <= :as_of_date
                    AND c.ClaimStatus NOT IN ('PAID', 'CLOSED', 'VOID')
                    AND (c.BilledAmount - COALESCE(pa.TotalPaid, 0) - COALESCE(pa.TotalAdjustments, 0)) > 0.01
            """
            
            # Add filters if specified
            if filters and filters.facility_ids:
                facility_placeholders = ','.join([f':facility_{i}' for i in range(len(filters.facility_ids))])
                query += f" AND e.FacilityID IN ({facility_placeholders})"
                for i, facility_id in enumerate(filters.facility_ids):
                    params[f'facility_{i}'] = facility_id
                    
            if filters and filters.payer_ids:
                payer_placeholders = ','.join([f':payer_{i}' for i in range(len(filters.payer_ids))])
                query += f" AND ic.PayerID IN ({payer_placeholders})"
                for i, payer_id in enumerate(filters.payer_ids):
                    params[f'payer_{i}'] = payer_id
                    
            query += """
                GROUP BY 
                    f.FacilityName,
                    ic.PayerName,
                    ic.PayerType
                    
                ORDER BY TotalAR DESC
            """
            
            result = await self.db.execute(text(query), params)
            rows = result.fetchall()
            
            ar_summaries = []
            for row in rows:
                summary = ARAgingSummary(
                    facility_name=row.FacilityName,
                    payer_name=row.PayerName or "Unknown",
                    payer_type=row.PayerType or "Unknown",
                    current_0_30=Decimal(str(row.Current_0_30 or 0)),
                    days_31_60=Decimal(str(row.Days_31_60 or 0)),
                    days_61_90=Decimal(str(row.Days_61_90 or 0)),
                    days_91_120=Decimal(str(row.Days_91_120 or 0)),
                    days_over_120=Decimal(str(row.Days_Over_120 or 0)),
                    total_ar=Decimal(str(row.TotalAR or 0)),
                    outstanding_claims=row.OutstandingClaims,
                    patients_with_ar=row.PatientsWithAR,
                    avg_days_outstanding=float(row.AvgDaysOutstanding or 0),
                    weighted_avg_age=float(row.WeightedAvgAge or 0),
                    percent_current_30_days=float(row.PercentCurrent30Days or 0),
                    percent_over_90_days=float(row.PercentOver90Days or 0)
                )
                ar_summaries.append(summary)
                
            logger.info(f"Calculated AR aging for {len(ar_summaries)} payer/facility combinations")
            return ar_summaries
            
        except Exception as e:
            logger.error(f"Error calculating AR aging: {str(e)}")
            raise DataProcessingError(f"Failed to calculate AR aging: {str(e)}")
    
    # Helper methods
    async def _get_prior_period_charges(self, facility_id: str, start_date: date, end_date: date) -> Optional[Decimal]:
        """Get charges for the prior period for comparison"""
        
        try:
            period_length = (end_date - start_date).days + 1
            prior_start = start_date - timedelta(days=period_length)
            prior_end = start_date - timedelta(days=1)
            
            query = """
                SELECT SUM(COALESCE(ActualCharges, 0)) as PriorCharges
                FROM Encounters 
                WHERE FacilityID = :facility_id 
                  AND EncounterDate BETWEEN :prior_start AND :prior_end
                  AND EncounterStatus = 'COMPLETED'
            """
            
            result = await self.db.execute(text(query), {
                'facility_id': facility_id,
                'prior_start': prior_start,
                'prior_end': prior_end
            })
            
            row = result.fetchone()
            return Decimal(str(row.PriorCharges or 0)) if row else None
            
        except Exception as e:
            logger.warning(f"Could not calculate prior period charges: {str(e)}")
            return None
    
    async def _get_data_freshness(self, table_name: str) -> Optional[datetime]:
        """Get the freshness timestamp for a data table"""
        
        try:
            if table_name == 'encounters':
                query = "SELECT MAX(ModifiedDate) as LastUpdate FROM Encounters"
            elif table_name == 'claims':
                query = "SELECT MAX(ModifiedDate) as LastUpdate FROM Claims"
            elif table_name == 'payments':
                query = "SELECT MAX(ModifiedDate) as LastUpdate FROM Payments"
            else:
                return None
                
            result = await self.db.execute(text(query))
            row = result.fetchone()
            
            return row.LastUpdate if row and row.LastUpdate else None
            
        except Exception as e:
            logger.warning(f"Could not get data freshness for {table_name}: {str(e)}")
            return None
    
    async def _calculate_working_days(self, start_date: date, end_date: date) -> int:
        """Calculate the number of working days between two dates"""
        
        working_days = 0
        current_date = start_date
        
        while current_date <= end_date:
            # Exclude weekends (Saturday = 5, Sunday = 6)
            if current_date.weekday() < 5:
                working_days += 1
            current_date += timedelta(days=1)
            
        return working_days

# =============================================================================
# CACHING DECORATORS
# =============================================================================

@redis_cache(expire=900)  # 15 minute cache
async def get_cached_financial_kpis(filters: KPIFilters, db_session: AsyncSession) -> List[FinancialKPIs]:
    """Get cached financial KPIs"""
    service = KPIService(db_session)
    return await service.calculate_financial_kpis(filters)

@redis_cache(expire=1800)  # 30 minute cache
async def get_cached_denial_analytics(filters: KPIFilters, db_session: AsyncSession) -> List[DenialAnalytics]:
    """Get cached denial analytics"""
    service = KPIService(db_session)
    return await service.calculate_denial_analytics(filters)

@redis_cache(expire=3600)  # 1 hour cache
async def get_cached_provider_performance(filters: KPIFilters, db_session: AsyncSession) -> List[ProviderPerformance]:
    """Get cached provider performance"""
    service = KPIService(db_session)
    return await service.calculate_provider_performance(filters)

@redis_cache(expire=7200)  # 2 hour cache  
async def get_cached_ar_aging(as_of_date: date, filters: Optional[KPIFilters], db_session: AsyncSession) -> List[ARAgingSummary]:
    """Get cached AR aging"""
    service = KPIService(db_session)
    return await service.calculate_ar_aging(as_of_date, filters)