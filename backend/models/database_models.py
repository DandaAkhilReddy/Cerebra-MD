# =============================================================================
# Database Models - SQLAlchemy ORM Models
# Cerebra-MD Healthcare Analytics Platform
# =============================================================================

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID, uuid4
import json

from sqlalchemy import (
    Column, String, Integer, DateTime, Date, Time, Boolean, 
    DECIMAL as SQLDecimal, Text, JSON, ForeignKey,
    Index, UniqueConstraint, CheckConstraint, func
)
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER, ROWVERSION
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, validates
from sqlalchemy.ext.hybrid import hybrid_property

Base = declarative_base()

# =============================================================================
# 1. PATIENT MANAGEMENT MODELS
# =============================================================================

class Patient(Base):
    """Patient demographic and contact information"""
    
    __tablename__ = 'Patients'
    
    # Primary Key
    PatientID = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid4)
    
    # Unique Identifiers
    MRN = Column(String(20), unique=True, nullable=False, index=True)
    
    # Demographics
    FirstName = Column(String(50), nullable=False)
    LastName = Column(String(50), nullable=False)
    DateOfBirth = Column(Date, nullable=False, index=True)
    Gender = Column(String(1), CheckConstraint("Gender IN ('M', 'F', 'U', 'O')"))
    
    # Contact Information
    SSN = Column(String(11))  # Encrypted field
    PhoneNumber = Column(String(15))
    Email = Column(String(100))
    
    # Address
    AddressLine1 = Column(String(100))
    AddressLine2 = Column(String(100))
    City = Column(String(50))
    State = Column(String(2))
    ZipCode = Column(String(10))
    Country = Column(String(2), default='US')
    
    # Insurance References
    PrimaryInsuranceID = Column(UNIQUEIDENTIFIER, ForeignKey('InsurancePlans.InsuranceID'))
    SecondaryInsuranceID = Column(UNIQUEIDENTIFIER, ForeignKey('InsurancePlans.InsuranceID'))
    
    # Clinical Information
    PrimaryCareProviderID = Column(UNIQUEIDENTIFIER, ForeignKey('Providers.ProviderID'))
    PreferredLanguage = Column(String(10), default='EN')
    RaceEthnicity = Column(String(50))
    MaritalStatus = Column(String(20))
    
    # Emergency Contact
    EmergencyContactName = Column(String(100))
    EmergencyContactPhone = Column(String(15))
    EmergencyContactRelationship = Column(String(50))
    
    # System Fields
    Status = Column(String(20), CheckConstraint("Status IN ('ACTIVE', 'INACTIVE', 'DECEASED', 'MERGED')"), default='ACTIVE')
    CreatedDate = Column(DateTime, default=func.getutcdate(), nullable=False)
    CreatedBy = Column(String(50), default=func.system_user(), nullable=False)
    ModifiedDate = Column(DateTime, default=func.getutcdate(), onupdate=func.getutcdate())
    ModifiedBy = Column(String(50), default=func.system_user())
    IsDeleted = Column(Boolean, default=False)
    DeletedDate = Column(DateTime)
    DeletedBy = Column(String(50))
    
    # Audit
    RowVersion = Column(ROWVERSION)
    
    # Relationships
    encounters = relationship("Encounter", back_populates="patient")
    claims = relationship("Claim", back_populates="patient")
    primary_insurance = relationship("InsurancePlan", foreign_keys=[PrimaryInsuranceID])
    secondary_insurance = relationship("InsurancePlan", foreign_keys=[SecondaryInsuranceID])
    primary_care_provider = relationship("Provider", foreign_keys=[PrimaryCareProviderID])
    
    # Indexes
    __table_args__ = (
        Index('IX_Patients_LastName_FirstName', 'LastName', 'FirstName'),
        Index('IX_Patients_Status', 'Status', postgresql_where=Status == 'ACTIVE'),
    )
    
    @validates('SSN')
    def validate_ssn(self, key, ssn):
        if ssn and not ssn.replace('-', '').isdigit():
            raise ValueError("SSN must be numeric")
        return ssn
    
    @validates('Email')
    def validate_email(self, key, email):
        if email and '@' not in email:
            raise ValueError("Invalid email format")
        return email
    
    @property
    def full_name(self) -> str:
        return f"{self.FirstName} {self.LastName}"
    
    @property
    def age(self) -> Optional[int]:
        if self.DateOfBirth:
            today = date.today()
            return today.year - self.DateOfBirth.year - (
                (today.month, today.day) < (self.DateOfBirth.month, self.DateOfBirth.day)
            )
        return None
    
    def __repr__(self):
        return f"<Patient(MRN='{self.MRN}', Name='{self.full_name}')>"


class PatientAuditTrail(Base):
    """Audit trail for patient data changes (HIPAA compliance)"""
    
    __tablename__ = 'PatientAuditTrail'
    
    AuditID = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid4)
    PatientID = Column(UNIQUEIDENTIFIER, ForeignKey('Patients.PatientID'), nullable=False)
    Operation = Column(String(10), CheckConstraint("Operation IN ('INSERT', 'UPDATE', 'DELETE')"), nullable=False)
    FieldName = Column(String(50), nullable=False)
    OldValue = Column(Text)
    NewValue = Column(Text)
    ChangedBy = Column(String(50), nullable=False)
    ChangedDate = Column(DateTime, default=func.getutcdate(), nullable=False)
    UserIPAddress = Column(String(45))
    ApplicationName = Column(String(100))
    
    # Relationships
    patient = relationship("Patient")
    
    # Indexes
    __table_args__ = (
        Index('IX_PatientAudit_Patient', 'PatientID'),
        Index('IX_PatientAudit_Date', 'ChangedDate'),
        Index('IX_PatientAudit_User', 'ChangedBy'),
    )


# =============================================================================
# 2. PROVIDER AND FACILITY MODELS
# =============================================================================

class Facility(Base):
    """Healthcare facility information"""
    
    __tablename__ = 'Facilities'
    
    FacilityID = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid4)
    FacilityCode = Column(String(10), unique=True, nullable=False)
    FacilityName = Column(String(100), nullable=False, index=True)
    FacilityType = Column(String(30), CheckConstraint("FacilityType IN ('HOSPITAL', 'CLINIC', 'ASC', 'OFFICE', 'URGENT_CARE', 'IMAGING_CENTER', 'LAB')"), nullable=False)
    NPI = Column(String(10), unique=True, nullable=False)
    TaxID = Column(String(12), nullable=False)
    
    # Address
    AddressLine1 = Column(String(100), nullable=False)
    AddressLine2 = Column(String(100))
    City = Column(String(50), nullable=False)
    State = Column(String(2), nullable=False)
    ZipCode = Column(String(10), nullable=False)
    Country = Column(String(2), default='US')
    Phone = Column(String(15), nullable=False)
    Fax = Column(String(15))
    Email = Column(String(100))
    Website = Column(String(200))
    
    # Operational Information
    LicenseNumber = Column(String(50), nullable=False)
    LicenseState = Column(String(2), nullable=False)
    AccreditationBody = Column(String(50))
    AccreditationNumber = Column(String(50))
    AccreditationExpiry = Column(Date)
    
    # Financial Information
    CostCenter = Column(String(20))
    BillingEntity = Column(String(100))
    
    # Operational Hours (JSON format)
    OperatingHoursJSON = Column(JSON)
    TimeZone = Column(String(50), default='Eastern Standard Time')
    
    # System Fields
    IsActive = Column(Boolean, default=True)
    CreatedDate = Column(DateTime, default=func.getutcdate())
    CreatedBy = Column(String(50), default=func.system_user())
    ModifiedDate = Column(DateTime, default=func.getutcdate(), onupdate=func.getutcdate())
    ModifiedBy = Column(String(50), default=func.system_user())
    
    # Relationships
    encounters = relationship("Encounter", back_populates="facility")
    providers = relationship("Provider", back_populates="primary_facility")
    claims = relationship("Claim", back_populates="facility")
    
    # Indexes
    __table_args__ = (
        Index('IX_Facilities_Type', 'FacilityType'),
        Index('IX_Facilities_State', 'State'),
        Index('IX_Facilities_Active', 'IsActive', postgresql_where=IsActive == True),
    )
    
    @validates('NPI')
    def validate_npi(self, key, npi):
        if npi and (len(npi) != 10 or not npi.isdigit()):
            raise ValueError("NPI must be 10 digits")
        return npi
    
    @property
    def operating_hours(self) -> dict:
        return json.loads(self.OperatingHoursJSON) if self.OperatingHoursJSON else {}
    
    @operating_hours.setter
    def operating_hours(self, hours_dict: dict):
        self.OperatingHoursJSON = json.dumps(hours_dict)
    
    def __repr__(self):
        return f"<Facility(Code='{self.FacilityCode}', Name='{self.FacilityName}')>"


class Provider(Base):
    """Healthcare provider information"""
    
    __tablename__ = 'Providers'
    
    ProviderID = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid4)
    ProviderCode = Column(String(10), unique=True, nullable=False)
    NPI = Column(String(10), unique=True, nullable=False)
    
    # Personal Information
    FirstName = Column(String(50), nullable=False)
    LastName = Column(String(50), nullable=False)
    MiddleName = Column(String(50))
    Credentials = Column(String(50))
    
    # Professional Information
    PrimarySpecialty = Column(String(50), nullable=False)
    SubSpecialty = Column(String(50))
    BoardCertification = Column(String(100))
    MedicalSchool = Column(String(100))
    ResidencyProgram = Column(String(100))
    
    # License Information
    PrimaryLicenseNumber = Column(String(20), nullable=False)
    PrimaryLicenseState = Column(String(2), nullable=False)
    LicenseExpiry = Column(Date, nullable=False)
    DEANumber = Column(String(15))
    DEAExpiry = Column(Date)
    
    # Contact Information
    Phone = Column(String(15))
    Email = Column(String(100))
    PreferredContactMethod = Column(String(20), default='EMAIL')
    
    # Employment Information
    PrimaryFacilityID = Column(UNIQUEIDENTIFIER, ForeignKey('Facilities.FacilityID'), nullable=False)
    HireDate = Column(Date, nullable=False)
    TerminationDate = Column(Date)
    EmploymentType = Column(String(20), CheckConstraint("EmploymentType IN ('EMPLOYEE', 'CONTRACTOR', 'LOCUM', 'VOLUNTEER')"), default='EMPLOYEE')
    EmploymentStatus = Column(String(20), CheckConstraint("EmploymentStatus IN ('ACTIVE', 'INACTIVE', 'TERMINATED', 'SUSPENDED', 'ON_LEAVE')"), default='ACTIVE')
    
    # Financial Information
    HourlyRate = Column(SQLDecimal(10, 2))
    SalaryAmount = Column(SQLDecimal(12, 2))
    CommissionRate = Column(SQLDecimal(5, 4))
    BonusEligible = Column(Boolean, default=False)
    
    # Performance Tracking
    ProductivityTarget = Column(SQLDecimal(8, 2))  # RVU target
    QualityScoreTarget = Column(SQLDecimal(5, 4))
    PatientSatisfactionTarget = Column(SQLDecimal(5, 4))
    
    # System Fields
    CreatedDate = Column(DateTime, default=func.getutcdate())
    CreatedBy = Column(String(50), default=func.system_user())
    ModifiedDate = Column(DateTime, default=func.getutcdate(), onupdate=func.getutcdate())
    ModifiedBy = Column(String(50), default=func.system_user())
    IsDeleted = Column(Boolean, default=False)
    
    # Relationships
    primary_facility = relationship("Facility", back_populates="providers")
    encounters = relationship("Encounter", back_populates="provider")
    claims = relationship("Claim", back_populates="provider")
    
    # Indexes
    __table_args__ = (
        Index('IX_Providers_Name', 'LastName', 'FirstName'),
        Index('IX_Providers_Specialty', 'PrimarySpecialty'),
        Index('IX_Providers_Status', 'EmploymentStatus', postgresql_where=EmploymentStatus == 'ACTIVE'),
        Index('IX_Providers_Facility', 'PrimaryFacilityID'),
    )
    
    @validates('NPI')
    def validate_npi(self, key, npi):
        if npi and (len(npi) != 10 or not npi.isdigit()):
            raise ValueError("NPI must be 10 digits")
        return npi
    
    @property
    def full_name(self) -> str:
        name_parts = [self.FirstName]
        if self.MiddleName:
            name_parts.append(self.MiddleName)
        name_parts.append(self.LastName)
        if self.Credentials:
            name_parts.append(self.Credentials)
        return ' '.join(name_parts)
    
    @property
    def is_active(self) -> bool:
        return self.EmploymentStatus == 'ACTIVE' and not self.IsDeleted
    
    def __repr__(self):
        return f"<Provider(NPI='{self.NPI}', Name='{self.full_name}')>"


# =============================================================================
# 3. INSURANCE AND PAYER MODELS
# =============================================================================

class InsuranceCompany(Base):
    """Insurance companies and payers"""
    
    __tablename__ = 'InsuranceCompanies'
    
    PayerID = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid4)
    PayerCode = Column(String(20), unique=True, nullable=False)
    PayerName = Column(String(100), nullable=False, index=True)
    PayerType = Column(String(20), CheckConstraint("PayerType IN ('COMMERCIAL', 'MEDICARE', 'MEDICAID', 'TRICARE', 'WORKERS_COMP', 'SELF_PAY', 'OTHER')"), nullable=False)
    
    # Contact Information
    BillingAddress = Column(String(200))
    ClaimsAddress = Column(String(200))
    Phone = Column(String(15))
    FaxNumber = Column(String(15))
    Website = Column(String(200))
    
    # Electronic Claims Information
    ClearinghouseID = Column(String(20))
    ElectronicPayerID = Column(String(20))
    EDIContactInfo = Column(String(500))
    
    # Financial Information
    AverageDaysToPayment = Column(Integer)
    PaymentMethod = Column(String(20), CheckConstraint("PaymentMethod IN ('EFT', 'CHECK', 'ACH', 'WIRE')"), default='EFT')
    
    # Performance Metrics
    DenialRate = Column(SQLDecimal(5, 4))
    AppealSuccessRate = Column(SQLDecimal(5, 4))
    CollectionRate = Column(SQLDecimal(5, 4))
    
    # System Fields
    IsActive = Column(Boolean, default=True)
    CreatedDate = Column(DateTime, default=func.getutcdate())
    CreatedBy = Column(String(50), default=func.system_user())
    ModifiedDate = Column(DateTime, default=func.getutcdate(), onupdate=func.getutcdate())
    ModifiedBy = Column(String(50), default=func.system_user())
    
    # Relationships
    insurance_plans = relationship("InsurancePlan", back_populates="payer")
    
    # Indexes
    __table_args__ = (
        Index('IX_InsuranceCompanies_Type', 'PayerType'),
        Index('IX_InsuranceCompanies_Active', 'IsActive', postgresql_where=IsActive == True),
    )
    
    def __repr__(self):
        return f"<InsuranceCompany(Code='{self.PayerCode}', Name='{self.PayerName}')>"


class InsurancePlan(Base):
    """Patient insurance plans"""
    
    __tablename__ = 'InsurancePlans'
    
    InsuranceID = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid4)
    PayerID = Column(UNIQUEIDENTIFIER, ForeignKey('InsuranceCompanies.PayerID'), nullable=False)
    PatientID = Column(UNIQUEIDENTIFIER, ForeignKey('Patients.PatientID'), nullable=False)
    
    # Policy Information
    PolicyNumber = Column(String(50), nullable=False)
    GroupNumber = Column(String(50))
    PlanName = Column(String(100), nullable=False)
    PlanType = Column(String(20), CheckConstraint("PlanType IN ('HMO', 'PPO', 'EPO', 'POS', 'HDHP', 'INDEMNITY', 'MEDICARE_ADVANTAGE', 'MEDIGAP')"), nullable=False)
    
    # Coverage Information
    EffectiveDate = Column(Date, nullable=False)
    TerminationDate = Column(Date)
    CopayAmount = Column(SQLDecimal(10, 2))
    CoinsurancePercent = Column(SQLDecimal(5, 4))
    DeductibleAmount = Column(SQLDecimal(10, 2))
    OutOfPocketMax = Column(SQLDecimal(10, 2))
    
    # Prior Authorization Requirements
    RequiresPriorAuth = Column(Boolean, default=False)
    PriorAuthPhone = Column(String(15))
    PriorAuthWebsite = Column(String(200))
    
    # Eligibility Information
    LastEligibilityCheck = Column(DateTime)
    EligibilityStatus = Column(String(20), CheckConstraint("EligibilityStatus IN ('ACTIVE', 'INACTIVE', 'PENDING', 'EXPIRED')"), default='ACTIVE')
    
    # System Fields
    IsActive = Column(Boolean, default=True)
    CreatedDate = Column(DateTime, default=func.getutcdate())
    CreatedBy = Column(String(50), default=func.system_user())
    ModifiedDate = Column(DateTime, default=func.getutcdate(), onupdate=func.getutcdate())
    ModifiedBy = Column(String(50), default=func.system_user())
    
    # Relationships
    payer = relationship("InsuranceCompany", back_populates="insurance_plans")
    patient = relationship("Patient")
    primary_claims = relationship("Claim", foreign_keys="[Claim.PrimaryInsuranceID]")
    secondary_claims = relationship("Claim", foreign_keys="[Claim.SecondaryInsuranceID]")
    
    # Indexes
    __table_args__ = (
        Index('IX_InsurancePlans_Payer', 'PayerID'),
        Index('IX_InsurancePlans_Patient', 'PatientID'),
        Index('IX_InsurancePlans_Policy', 'PolicyNumber'),
        Index('IX_InsurancePlans_Effective', 'EffectiveDate'),
        Index('IX_InsurancePlans_Active', 'IsActive', postgresql_where=IsActive == True),
        UniqueConstraint('PatientID', 'PayerID', 'PolicyNumber', 'EffectiveDate'),
    )
    
    @property
    def is_active(self) -> bool:
        today = date.today()
        return (self.IsActive and 
                self.EffectiveDate <= today and 
                (self.TerminationDate is None or self.TerminationDate >= today))
    
    def __repr__(self):
        return f"<InsurancePlan(Policy='{self.PolicyNumber}', Plan='{self.PlanName}')>"


# =============================================================================
# 4. CLINICAL ENCOUNTER MODELS
# =============================================================================

class Encounter(Base):
    """Patient encounters and visits"""
    
    __tablename__ = 'Encounters'
    
    EncounterID = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid4)
    EncounterNumber = Column(String(20), unique=True, nullable=False)
    PatientID = Column(UNIQUEIDENTIFIER, ForeignKey('Patients.PatientID'), nullable=False)
    ProviderID = Column(UNIQUEIDENTIFIER, ForeignKey('Providers.ProviderID'), nullable=False)
    FacilityID = Column(UNIQUEIDENTIFIER, ForeignKey('Facilities.FacilityID'), nullable=False)
    
    # Encounter Details
    EncounterDate = Column(Date, nullable=False, index=True)
    EncounterTime = Column(Time, nullable=False)
    EncounterType = Column(String(20), CheckConstraint("EncounterType IN ('OFFICE', 'INPATIENT', 'OUTPATIENT', 'EMERGENCY', 'URGENT', 'TELEHEALTH', 'SURGERY', 'PROCEDURE')"), nullable=False)
    
    # Visit Classification
    VisitType = Column(String(30), CheckConstraint("VisitType IN ('NEW_PATIENT', 'ESTABLISHED_PATIENT', 'CONSULTATION', 'FOLLOW_UP', 'EMERGENCY', 'ANNUAL_PHYSICAL')"), nullable=False)
    AppointmentType = Column(String(30))
    
    # Clinical Information
    ChiefComplaint = Column(String(500))
    PresentingProblem = Column(String(1000))
    ClinicalNotes = Column(Text)
    
    # Diagnosis Information
    PrimaryDiagnosisCode = Column(String(10), nullable=False)
    PrimaryDiagnosis = Column(String(200), nullable=False)
    SecondaryDiagnosesJSON = Column(JSON)  # JSON array of additional diagnoses
    
    # Visit Timing
    CheckInTime = Column(DateTime)
    ProviderStartTime = Column(DateTime)
    ProviderEndTime = Column(DateTime)
    CheckOutTime = Column(DateTime)
    
    # Status Tracking
    EncounterStatus = Column(String(20), CheckConstraint("EncounterStatus IN ('SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED')"), default='SCHEDULED')
    CompletionDate = Column(DateTime)
    
    # Financial Information
    ExpectedCharges = Column(SQLDecimal(12, 2))
    ActualCharges = Column(SQLDecimal(12, 2))
    PatientResponsibility = Column(SQLDecimal(12, 2))
    CopayCollected = Column(SQLDecimal(10, 2), default=0)
    
    # Quality Metrics
    DocumentationScore = Column(SQLDecimal(5, 4))
    PatientSatisfactionScore = Column(SQLDecimal(5, 4))
    CodingAccuracy = Column(SQLDecimal(5, 4))
    
    # System Fields
    CreatedDate = Column(DateTime, default=func.getutcdate())
    CreatedBy = Column(String(50), default=func.system_user())
    ModifiedDate = Column(DateTime, default=func.getutcdate(), onupdate=func.getutcdate())
    ModifiedBy = Column(String(50), default=func.system_user())
    IsDeleted = Column(Boolean, default=False)
    
    # Relationships
    patient = relationship("Patient", back_populates="encounters")
    provider = relationship("Provider", back_populates="encounters")
    facility = relationship("Facility", back_populates="encounters")
    claims = relationship("Claim", back_populates="encounter")
    diagnoses = relationship("Diagnosis", back_populates="encounter")
    procedures = relationship("Procedure", back_populates="encounter")
    
    # Indexes
    __table_args__ = (
        Index('IX_Encounters_Patient', 'PatientID', 'EncounterDate'),
        Index('IX_Encounters_Provider', 'ProviderID', 'EncounterDate'),
        Index('IX_Encounters_Facility', 'FacilityID', 'EncounterDate'),
        Index('IX_Encounters_Status', 'EncounterStatus'),
        Index('IX_Encounters_Type', 'EncounterType'),
        Index('IX_Encounters_Composite', 'FacilityID', 'ProviderID', 'EncounterDate'),
    )
    
    @hybrid_property
    def visit_duration_minutes(self):
        if self.ProviderStartTime and self.ProviderEndTime:
            return (self.ProviderEndTime - self.ProviderStartTime).total_seconds() / 60
        return None
    
    @hybrid_property
    def total_time_minutes(self):
        if self.CheckInTime and self.CheckOutTime:
            return (self.CheckOutTime - self.CheckInTime).total_seconds() / 60
        return None
    
    @property
    def secondary_diagnoses(self) -> List[dict]:
        return json.loads(self.SecondaryDiagnosesJSON) if self.SecondaryDiagnosesJSON else []
    
    @secondary_diagnoses.setter
    def secondary_diagnoses(self, diagnoses_list: List[dict]):
        self.SecondaryDiagnosesJSON = json.dumps(diagnoses_list)
    
    def __repr__(self):
        return f"<Encounter(Number='{self.EncounterNumber}', Date='{self.EncounterDate}')>"


class Diagnosis(Base):
    """Diagnosis codes for encounters"""
    
    __tablename__ = 'Diagnoses'
    
    DiagnosisID = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid4)
    EncounterID = Column(UNIQUEIDENTIFIER, ForeignKey('Encounters.EncounterID'), nullable=False)
    
    # Diagnosis Information
    DiagnosisCode = Column(String(10), nullable=False, index=True)
    DiagnosisDescription = Column(String(200), nullable=False)
    DiagnosisType = Column(String(20), CheckConstraint("DiagnosisType IN ('PRIMARY', 'SECONDARY', 'ADMITTING', 'DISCHARGE', 'RULE_OUT', 'DIFFERENTIAL')"), nullable=False)
    DiagnosisOrder = Column(Integer, nullable=False, default=1)
    
    # ICD Information
    ICDVersion = Column(String(10), nullable=False, default='ICD-10-CM')
    ICDCategory = Column(String(50))
    
    # Clinical Details
    PresentOnAdmission = Column(String(1), CheckConstraint("PresentOnAdmission IN ('Y', 'N', 'U', 'W', '1')"))
    ChronicCondition = Column(Boolean, default=False)
    Severity = Column(String(20), CheckConstraint("Severity IN ('MILD', 'MODERATE', 'SEVERE', 'CRITICAL')"))
    
    # Quality and Coding
    CodingAccuracy = Column(SQLDecimal(5, 4))
    DocumentationQuality = Column(String(20), CheckConstraint("DocumentationQuality IN ('EXCELLENT', 'GOOD', 'ADEQUATE', 'POOR')"))
    CodingNotes = Column(String(500))
    
    # System Fields
    CreatedDate = Column(DateTime, default=func.getutcdate())
    CreatedBy = Column(String(50), default=func.system_user())
    ModifiedDate = Column(DateTime, default=func.getutcdate(), onupdate=func.getutcdate())
    ModifiedBy = Column(String(50), default=func.system_user())
    
    # Relationships
    encounter = relationship("Encounter", back_populates="diagnoses")
    
    # Indexes
    __table_args__ = (
        Index('IX_Diagnoses_Encounter', 'EncounterID'),
        Index('IX_Diagnoses_Type', 'DiagnosisType'),
        Index('IX_Diagnoses_Category', 'ICDCategory'),
        Index('IX_Diagnoses_Order', 'EncounterID', 'DiagnosisOrder'),
        Index('IX_Diagnoses_Chronic', 'ChronicCondition', postgresql_where=ChronicCondition == True),
    )
    
    def __repr__(self):
        return f"<Diagnosis(Code='{self.DiagnosisCode}', Type='{self.DiagnosisType}')>"


class Procedure(Base):
    """Procedures performed during encounters"""
    
    __tablename__ = 'Procedures'
    
    ProcedureID = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid4)
    EncounterID = Column(UNIQUEIDENTIFIER, ForeignKey('Encounters.EncounterID'), nullable=False)
    
    # Procedure Information
    ProcedureCode = Column(String(10), nullable=False, index=True)
    ProcedureDescription = Column(String(200), nullable=False)
    ProcedureDate = Column(Date, nullable=False)
    ProcedureTime = Column(Time)
    
    # CPT Information
    CPTCode = Column(String(5), index=True)
    CPTDescription = Column(String(200))
    ModifierCode1 = Column(String(2))
    ModifierCode2 = Column(String(2))
    ModifierCode3 = Column(String(2))
    ModifierCode4 = Column(String(2))
    
    # Procedure Details
    PerformingProviderID = Column(UNIQUEIDENTIFIER, ForeignKey('Providers.ProviderID'))
    AssistingProviderID = Column(UNIQUEIDENTIFIER, ForeignKey('Providers.ProviderID'))
    AnesthesiaProviderID = Column(UNIQUEIDENTIFIER, ForeignKey('Providers.ProviderID'))
    ProcedureLocation = Column(String(50))
    
    # Quantity and Units
    Quantity = Column(SQLDecimal(8, 2), default=1)
    Units = Column(String(10), default='UNITS')
    ServiceUnits = Column(Integer, default=1)
    
    # Financial Information
    ChargeAmount = Column(SQLDecimal(10, 2), nullable=False)
    AllowedAmount = Column(SQLDecimal(10, 2))
    ContractualAdjustment = Column(SQLDecimal(10, 2), default=0)
    
    # RVU Information
    WorkRVU = Column(SQLDecimal(8, 4))
    PracticeExpenseRVU = Column(SQLDecimal(8, 4))
    MalpracticeRVU = Column(SQLDecimal(8, 4))
    TotalRVU = Column(SQLDecimal(8, 4))
    
    # Quality Metrics
    CodingAccuracy = Column(SQLDecimal(5, 4))
    DocumentationScore = Column(SQLDecimal(5, 4))
    ComplianceScore = Column(SQLDecimal(5, 4))
    
    # Status Information
    ProcedureStatus = Column(String(20), CheckConstraint("ProcedureStatus IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED')"), default='COMPLETED')
    
    # System Fields
    CreatedDate = Column(DateTime, default=func.getutcdate())
    CreatedBy = Column(String(50), default=func.system_user())
    ModifiedDate = Column(DateTime, default=func.getutcdate(), onupdate=func.getutcdate())
    ModifiedBy = Column(String(50), default=func.system_user())
    
    # Relationships
    encounter = relationship("Encounter", back_populates="procedures")
    performing_provider = relationship("Provider", foreign_keys=[PerformingProviderID])
    assisting_provider = relationship("Provider", foreign_keys=[AssistingProviderID])
    anesthesia_provider = relationship("Provider", foreign_keys=[AnesthesiaProviderID])
    claim_line_items = relationship("ClaimLineItem", back_populates="procedure")
    
    # Indexes
    __table_args__ = (
        Index('IX_Procedures_Encounter', 'EncounterID'),
        Index('IX_Procedures_CPT', 'CPTCode'),
        Index('IX_Procedures_Date', 'ProcedureDate'),
        Index('IX_Procedures_Provider', 'PerformingProviderID'),
        Index('IX_Procedures_Amount', 'ChargeAmount'),
        Index('IX_Procedures_RVU', 'TotalRVU'),
    )
    
    def __repr__(self):
        return f"<Procedure(CPT='{self.CPTCode}', Amount=${self.ChargeAmount})>"

# Continue with additional models in next part...