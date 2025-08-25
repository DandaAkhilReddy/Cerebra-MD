# =============================================================================
# Claims and Billing Models - SQLAlchemy ORM Models
# Cerebra-MD Healthcare Analytics Platform
# =============================================================================

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID, uuid4

from sqlalchemy import (
    Column, String, Integer, DateTime, Date, Boolean, 
    Decimal as SQLDecimal, Text, ForeignKey,
    Index, CheckConstraint, func
)
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from sqlalchemy.orm import relationship, validates
from sqlalchemy.ext.hybrid import hybrid_property

from .database_models import Base

# =============================================================================
# 5. CLAIMS MANAGEMENT MODELS
# =============================================================================

class Claim(Base):
    """Insurance claims processing"""
    
    __tablename__ = 'Claims'
    
    ClaimID = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid4)
    ClaimNumber = Column(String(30), unique=True, nullable=False, index=True)
    EncounterID = Column(UNIQUEIDENTIFIER, ForeignKey('Encounters.EncounterID'), nullable=False)
    PatientID = Column(UNIQUEIDENTIFIER, ForeignKey('Patients.PatientID'), nullable=False)
    ProviderID = Column(UNIQUEIDENTIFIER, ForeignKey('Providers.ProviderID'), nullable=False)
    FacilityID = Column(UNIQUEIDENTIFIER, ForeignKey('Facilities.FacilityID'), nullable=False)
    PrimaryInsuranceID = Column(UNIQUEIDENTIFIER, ForeignKey('InsurancePlans.InsuranceID'), nullable=False)
    SecondaryInsuranceID = Column(UNIQUEIDENTIFIER, ForeignKey('InsurancePlans.InsuranceID'))
    
    # Claim Identification
    OriginalClaimNumber = Column(String(30))  # For resubmissions
    ClaimType = Column(String(20), nullable=False,
                      CheckConstraint("ClaimType IN ('ORIGINAL', 'CORRECTED', 'VOID', 'REPLACEMENT', 'REVERSAL')"))
    ClaimForm = Column(String(10), default='CMS1500',
                      CheckConstraint("ClaimForm IN ('CMS1500', 'UB04', 'ADA')"))
    
    # Service Period
    ServiceDateFrom = Column(Date, nullable=False)
    ServiceDateTo = Column(Date, nullable=False)
    
    # Claim Dates
    SubmissionDate = Column(DateTime, nullable=False, default=func.getutcdate(), index=True)
    ReceivedDate = Column(DateTime)
    ProcessedDate = Column(DateTime)
    PaidDate = Column(DateTime)
    
    # Financial Information
    BilledAmount = Column(SQLDecimal(12, 2), nullable=False)
    AllowedAmount = Column(SQLDecimal(12, 2))
    PaidAmount = Column(SQLDecimal(12, 2), default=0)
    PatientResponsibility = Column(SQLDecimal(12, 2))
    DeductibleAmount = Column(SQLDecimal(12, 2), default=0)
    CoinsuranceAmount = Column(SQLDecimal(12, 2), default=0)
    CopayAmount = Column(SQLDecimal(12, 2), default=0)
    AdjustmentAmount = Column(SQLDecimal(12, 2), default=0)
    WriteOffAmount = Column(SQLDecimal(12, 2), default=0)
    
    # Status Information
    ClaimStatus = Column(String(20), nullable=False, default='SUBMITTED', index=True,
                        CheckConstraint("ClaimStatus IN ('DRAFT', 'SUBMITTED', 'PENDING', 'PROCESSED', 'PAID', 'DENIED', 'PARTIAL', 'APPEALED', 'CLOSED')"))
    ClaimStatusDate = Column(DateTime, default=func.getutcdate())
    
    # Processing Information
    ClearinghouseID = Column(String(20))
    ClearinghouseBatchID = Column(String(30))
    PayerClaimNumber = Column(String(50))
    SubmissionAttempts = Column(Integer, default=1)
    LastSubmissionDate = Column(DateTime)
    
    # Electronic Processing
    EDITransactionID = Column(String(50))
    EDI837BatchID = Column(String(30))
    EDI835BatchID = Column(String(30))
    
    # Notes and Comments
    SubmissionNotes = Column(String(1000))
    ProcessingNotes = Column(String(1000))
    InternalNotes = Column(String(1000))
    
    # System Fields
    CreatedDate = Column(DateTime, default=func.getutcdate())
    CreatedBy = Column(String(50), default=func.system_user())
    ModifiedDate = Column(DateTime, default=func.getutcdate(), onupdate=func.getutcdate())
    ModifiedBy = Column(String(50), default=func.system_user())
    IsDeleted = Column(Boolean, default=False)
    
    # Relationships
    encounter = relationship("Encounter", back_populates="claims")
    patient = relationship("Patient", back_populates="claims")
    provider = relationship("Provider", back_populates="claims")
    facility = relationship("Facility", back_populates="claims")
    primary_insurance = relationship("InsurancePlan", foreign_keys=[PrimaryInsuranceID])
    secondary_insurance = relationship("InsurancePlan", foreign_keys=[SecondaryInsuranceID])
    line_items = relationship("ClaimLineItem", back_populates="claim")
    payments = relationship("Payment", back_populates="claim")
    denials = relationship("Denial", back_populates="claim")
    
    # Indexes
    __table_args__ = (
        Index('IX_Claims_Encounter', 'EncounterID'),
        Index('IX_Claims_Patient', 'PatientID', 'SubmissionDate'),
        Index('IX_Claims_Provider', 'ProviderID', 'SubmissionDate'),
        Index('IX_Claims_Facility', 'FacilityID', 'SubmissionDate'),
        Index('IX_Claims_Processing', 'ProcessedDate', postgresql_where=ProcessedDate.isnot(None)),
        Index('IX_Claims_Payment', 'PaidDate', postgresql_where=PaidDate.isnot(None)),
        Index('IX_Claims_Insurance', 'PrimaryInsuranceID', 'ClaimStatus'),
        Index('IX_Claims_Amount', 'BilledAmount'),
        Index('IX_Claims_Outstanding', 'ClaimStatus', 'SubmissionDate', 
              postgresql_where=ClaimStatus.in_(['SUBMITTED', 'PENDING'])),
    )
    
    @hybrid_property
    def days_to_processing(self):
        if self.ProcessedDate and self.SubmissionDate:
            return (self.ProcessedDate.date() - self.SubmissionDate.date()).days
        return None
    
    @hybrid_property
    def days_to_payment(self):
        if self.PaidDate and self.SubmissionDate:
            return (self.PaidDate.date() - self.SubmissionDate.date()).days
        return None
    
    @hybrid_property
    def collection_rate(self):
        if self.BilledAmount and self.BilledAmount > 0:
            return self.PaidAmount / self.BilledAmount
        return 0
    
    @hybrid_property
    def outstanding_balance(self):
        return self.BilledAmount - (self.PaidAmount or 0) - (self.AdjustmentAmount or 0)
    
    @property
    def is_outstanding(self) -> bool:
        return self.outstanding_balance > 0.01 and self.ClaimStatus not in ['PAID', 'CLOSED', 'VOID']
    
    @validates('BilledAmount')
    def validate_billed_amount(self, key, amount):
        if amount <= 0:
            raise ValueError("Billed amount must be positive")
        return amount
    
    def __repr__(self):
        return f"<Claim(Number='{self.ClaimNumber}', Amount=${self.BilledAmount}, Status='{self.ClaimStatus}')>"


class ClaimLineItem(Base):
    """Individual line items within claims"""
    
    __tablename__ = 'ClaimLineItems'
    
    ClaimLineID = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid4)
    ClaimID = Column(UNIQUEIDENTIFIER, ForeignKey('Claims.ClaimID'), nullable=False)
    ProcedureID = Column(UNIQUEIDENTIFIER, ForeignKey('Procedures.ProcedureID'), nullable=False)
    LineNumber = Column(Integer, nullable=False)
    
    # Service Information
    ServiceDate = Column(Date, nullable=False)
    PlaceOfService = Column(String(2), nullable=False)
    TypeOfService = Column(String(2))
    
    # Procedure Codes
    CPTCode = Column(String(5), nullable=False, index=True)
    ModifierCode1 = Column(String(2))
    ModifierCode2 = Column(String(2))
    ModifierCode3 = Column(String(2))
    ModifierCode4 = Column(String(2))
    
    # Diagnosis Pointers
    DiagnosisPointer1 = Column(Integer)
    DiagnosisPointer2 = Column(Integer)
    DiagnosisPointer3 = Column(Integer)
    DiagnosisPointer4 = Column(Integer)
    
    # Units and Charges
    ServiceUnits = Column(SQLDecimal(8, 2), nullable=False, default=1)
    ChargeAmount = Column(SQLDecimal(10, 2), nullable=False)
    AllowedAmount = Column(SQLDecimal(10, 2))
    PaidAmount = Column(SQLDecimal(10, 2), default=0)
    AdjustmentAmount = Column(SQLDecimal(10, 2), default=0)
    
    # Line Item Status
    LineStatus = Column(String(20), default='SUBMITTED',
                       CheckConstraint("LineStatus IN ('SUBMITTED', 'PROCESSED', 'PAID', 'DENIED', 'ADJUSTED')"))
    
    # Reason Codes
    ReasonCode1 = Column(String(5))
    ReasonCode2 = Column(String(5))
    ReasonCode3 = Column(String(5))
    ReasonCode4 = Column(String(5))
    
    # System Fields
    CreatedDate = Column(DateTime, default=func.getutcdate())
    CreatedBy = Column(String(50), default=func.system_user())
    
    # Relationships
    claim = relationship("Claim", back_populates="line_items")
    procedure = relationship("Procedure", back_populates="claim_line_items")
    payment_line_items = relationship("PaymentLineItem", back_populates="claim_line")
    
    # Indexes
    __table_args__ = (
        Index('IX_ClaimLineItems_Claim', 'ClaimID', 'LineNumber'),
        Index('IX_ClaimLineItems_Procedure', 'ProcedureID'),
        Index('IX_ClaimLineItems_CPT', 'CPTCode'),
        Index('IX_ClaimLineItems_Status', 'LineStatus'),
        Index('IX_ClaimLineItems_Amount', 'ChargeAmount'),
        UniqueConstraint('ClaimID', 'LineNumber'),
    )
    
    @hybrid_property
    def outstanding_balance(self):
        return self.ChargeAmount - (self.PaidAmount or 0) - (self.AdjustmentAmount or 0)
    
    def __repr__(self):
        return f"<ClaimLineItem(CPT='{self.CPTCode}', Amount=${self.ChargeAmount})>"


# =============================================================================
# 6. DENIAL MANAGEMENT MODELS  
# =============================================================================

class Denial(Base):
    """Claim denials and rejection tracking"""
    
    __tablename__ = 'Denials'
    
    DenialID = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid4)
    ClaimID = Column(UNIQUEIDENTIFIER, ForeignKey('Claims.ClaimID'), nullable=False)
    ClaimLineID = Column(UNIQUEIDENTIFIER, ForeignKey('ClaimLineItems.ClaimLineID'))  # NULL if entire claim denied
    
    # Denial Information
    DenialDate = Column(Date, nullable=False, index=True)
    DenialReasonCode = Column(String(10), nullable=False, index=True)
    DenialReasonDescription = Column(String(500), nullable=False)
    SecondaryReasonCode = Column(String(10))
    SecondaryReasonDescription = Column(String(500))
    
    # Denial Classification
    DenialCategory = Column(String(30), nullable=False, index=True,
                           CheckConstraint("DenialCategory IN ('AUTHORIZATION', 'ELIGIBILITY', 'CODING', 'DOCUMENTATION', 'TIMELY_FILING', 'DUPLICATE', 'NON_COVERED_SERVICE', 'MEDICAL_NECESSITY', 'BUNDLING', 'MODIFIER', 'OTHER')"))
    DenialType = Column(String(20), nullable=False,
                       CheckConstraint("DenialType IN ('HARD_DENIAL', 'SOFT_DENIAL', 'INFORMATION_REQUEST', 'TECHNICAL_DENIAL')"))
    
    # Financial Impact
    DeniedAmount = Column(SQLDecimal(12, 2), nullable=False)
    RecoverableAmount = Column(SQLDecimal(12, 2))
    WriteOffAmount = Column(SQLDecimal(12, 2), default=0)
    
    # Root Cause Analysis
    RootCause = Column(String(50),
                      CheckConstraint("RootCause IN ('PROVIDER_ERROR', 'BILLING_ERROR', 'AUTHORIZATION_ISSUE', 'ELIGIBILITY_ISSUE', 'PAYER_ERROR', 'SYSTEM_ERROR', 'PATIENT_ISSUE')"))
    IsPreventable = Column(Boolean)
    PreventionStrategy = Column(String(500))
    
    # Assignment and Workflow
    DenialStatus = Column(String(20), default='OPEN', index=True,
                         CheckConstraint("DenialStatus IN ('OPEN', 'IN_PROGRESS', 'APPEALED', 'RESOLVED', 'WRITTEN_OFF', 'CLOSED')"))
    AssignedTo = Column(String(50), index=True)
    AssignedDate = Column(DateTime)
    DueDate = Column(Date)
    Priority = Column(String(10), default='NORMAL',
                     CheckConstraint("Priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')"))
    
    # Resolution Tracking
    ResolutionDate = Column(Date)
    ResolutionAmount = Column(SQLDecimal(12, 2))
    ResolutionType = Column(String(30),
                           CheckConstraint("ResolutionType IN ('CORRECTED_RESUBMISSION', 'SUCCESSFUL_APPEAL', 'PARTIAL_PAYMENT', 'WRITE_OFF', 'PATIENT_PAYMENT', 'SECONDARY_INSURANCE')"))
    ResolutionNotes = Column(String(1000))
    
    # Appeal Information
    AppealDate = Column(Date)
    AppealLevel = Column(Integer, default=1)
    AppealNumber = Column(String(30))
    AppealStatus = Column(String(20),
                         CheckConstraint("AppealStatus IN ('SUBMITTED', 'PENDING', 'APPROVED', 'DENIED', 'PARTIAL', 'WITHDRAWN')"))
    AppealAmount = Column(SQLDecimal(12, 2))
    AppealDeadline = Column(Date)
    
    # Related Denials
    RelatedDenialID = Column(UNIQUEIDENTIFIER, ForeignKey('Denials.DenialID'))  # For tracking recurring issues
    IsRecurringIssue = Column(Boolean, default=False)
    RecurrenceCount = Column(Integer, default=1)
    
    # System Fields
    CreatedDate = Column(DateTime, default=func.getutcdate())
    CreatedBy = Column(String(50), default=func.system_user())
    ModifiedDate = Column(DateTime, default=func.getutcdate(), onupdate=func.getutcdate())
    ModifiedBy = Column(String(50), default=func.system_user())
    
    # Relationships
    claim = relationship("Claim", back_populates="denials")
    claim_line = relationship("ClaimLineItem")
    related_denial = relationship("Denial", remote_side=[DenialID])
    actions = relationship("DenialAction", back_populates="denial")
    
    # Indexes
    __table_args__ = (
        Index('IX_Denials_Claim', 'ClaimID'),
        Index('IX_Denials_ClaimLine', 'ClaimLineID'),
        Index('IX_Denials_Status', 'DenialStatus', 'DenialDate'),
        Index('IX_Denials_Category', 'DenialCategory', 'DenialDate'),
        Index('IX_Denials_Assigned', 'AssignedTo', 'DenialStatus', 
              postgresql_where=AssignedTo.isnot(None)),
        Index('IX_Denials_Outstanding', 'DenialStatus', 'DaysOutstanding',
              postgresql_where=DenialStatus.in_(['OPEN', 'IN_PROGRESS'])),
        Index('IX_Denials_Amount', 'DeniedAmount'),
        Index('IX_Denials_Priority', 'Priority', 'DueDate',
              postgresql_where=DueDate.isnot(None)),
        Index('IX_Denials_Recurring', 'IsRecurringIssue', 'RecurrenceCount',
              postgresql_where=IsRecurringIssue == True),
    )
    
    @hybrid_property
    def days_to_resolution(self):
        if self.ResolutionDate and self.DenialDate:
            return (self.ResolutionDate - self.DenialDate).days
        return None
    
    @hybrid_property
    def days_outstanding(self):
        if self.DenialStatus in ['RESOLVED', 'CLOSED'] and self.ResolutionDate:
            return (self.ResolutionDate - self.DenialDate).days
        else:
            return (date.today() - self.DenialDate).days
    
    @hybrid_property
    def recovery_rate(self):
        if self.DeniedAmount and self.DeniedAmount > 0:
            return (self.ResolutionAmount or 0) / self.DeniedAmount
        return 0
    
    @property
    def is_overdue(self) -> bool:
        return self.DueDate and self.DueDate < date.today() and self.DenialStatus not in ['RESOLVED', 'CLOSED']
    
    @validates('DeniedAmount')
    def validate_denied_amount(self, key, amount):
        if amount <= 0:
            raise ValueError("Denied amount must be positive")
        return amount
    
    def __repr__(self):
        return f"<Denial(Reason='{self.DenialReasonCode}', Amount=${self.DeniedAmount}, Status='{self.DenialStatus}')>"


class DenialAction(Base):
    """Tracking all actions taken on denials"""
    
    __tablename__ = 'DenialActions'
    
    ActionID = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid4)
    DenialID = Column(UNIQUEIDENTIFIER, ForeignKey('Denials.DenialID'), nullable=False)
    
    # Action Information
    ActionType = Column(String(30), nullable=False,
                       CheckConstraint("ActionType IN ('ASSIGNED', 'STATUS_CHANGE', 'APPEAL_SUBMITTED', 'DOCUMENTATION_REQUESTED', 'CORRECTED_CLAIM', 'FOLLOW_UP_CALL', 'WRITTEN_OFF', 'RESOLVED', 'NOTE_ADDED')"))
    ActionDescription = Column(String(1000), nullable=False)
    ActionDate = Column(DateTime, default=func.getutcdate(), index=True)
    
    # User Information
    PerformedBy = Column(String(50), nullable=False)
    UserRole = Column(String(30))
    
    # Status Changes
    OldStatus = Column(String(20))
    NewStatus = Column(String(20))
    OldAssignedTo = Column(String(50))
    NewAssignedTo = Column(String(50))
    
    # Financial Impact
    FinancialImpact = Column(SQLDecimal(12, 2))
    
    # Follow-up Information
    FollowUpRequired = Column(Boolean, default=False)
    FollowUpDate = Column(Date)
    FollowUpNotes = Column(String(500))
    
    # System Fields
    CreatedDate = Column(DateTime, default=func.getutcdate())
    
    # Relationships
    denial = relationship("Denial", back_populates="actions")
    
    # Indexes
    __table_args__ = (
        Index('IX_DenialActions_Denial', 'DenialID', 'ActionDate'),
        Index('IX_DenialActions_Type', 'ActionType', 'ActionDate'),
        Index('IX_DenialActions_User', 'PerformedBy', 'ActionDate'),
        Index('IX_DenialActions_FollowUp', 'FollowUpRequired', 'FollowUpDate',
              postgresql_where=FollowUpRequired == True),
    )
    
    def __repr__(self):
        return f"<DenialAction(Type='{self.ActionType}', Date='{self.ActionDate}')>"


# =============================================================================
# 7. PAYMENT MANAGEMENT MODELS
# =============================================================================

class Payment(Base):
    """Payment and remittance tracking"""
    
    __tablename__ = 'Payments'
    
    PaymentID = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid4)
    ClaimID = Column(UNIQUEIDENTIFIER, ForeignKey('Claims.ClaimID'), nullable=False)
    
    # Payment Information
    PaymentDate = Column(Date, nullable=False, index=True)
    PaymentAmount = Column(SQLDecimal(12, 2), nullable=False)
    PaymentType = Column(String(20), nullable=False,
                        CheckConstraint("PaymentType IN ('INSURANCE', 'PATIENT', 'SECONDARY_INSURANCE', 'TERTIARY_INSURANCE', 'REFUND', 'ADJUSTMENT')"))
    PaymentMethod = Column(String(20), nullable=False,
                          CheckConstraint("PaymentMethod IN ('EFT', 'CHECK', 'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'MONEY_ORDER', 'WIRE')"))
    
    # Remittance Information
    RemittanceNumber = Column(String(30))
    RemittanceDate = Column(Date)
    CheckNumber = Column(String(20))
    EFTTraceNumber = Column(String(30))
    ConfirmationNumber = Column(String(30))
    
    # Payer Information
    PayerID = Column(UNIQUEIDENTIFIER, ForeignKey('InsuranceCompanies.PayerID'))
    PayerName = Column(String(100), nullable=False)
    PayerType = Column(String(20))
    
    # Adjustment Information
    AdjustmentAmount = Column(SQLDecimal(12, 2), default=0)
    AdjustmentType = Column(String(20),
                           CheckConstraint("AdjustmentType IN ('CONTRACTUAL', 'WRITE_OFF', 'CORRECTION', 'REFUND', 'DISCOUNT')"))
    AdjustmentReason = Column(String(200))
    
    # Processing Information
    DepositDate = Column(Date)
    BankAccount = Column(String(20))
    BatchID = Column(String(30), index=True)
    ProcessingNotes = Column(String(500))
    
    # ERA Information (Electronic Remittance Advice)
    ERANumber = Column(String(30), index=True)
    ERADate = Column(Date)
    ERAAmount = Column(SQLDecimal(12, 2))
    
    # Reconciliation
    IsReconciled = Column(Boolean, default=False)
    ReconciledDate = Column(Date)
    ReconciledBy = Column(String(50))
    VarianceAmount = Column(SQLDecimal(12, 2))
    
    # System Fields
    CreatedDate = Column(DateTime, default=func.getutcdate())
    CreatedBy = Column(String(50), default=func.system_user())
    ModifiedDate = Column(DateTime, default=func.getutcdate(), onupdate=func.getutcdate())
    ModifiedBy = Column(String(50), default=func.system_user())
    
    # Relationships
    claim = relationship("Claim", back_populates="payments")
    payer = relationship("InsuranceCompany")
    line_items = relationship("PaymentLineItem", back_populates="payment")
    
    # Indexes
    __table_args__ = (
        Index('IX_Payments_Claim', 'ClaimID', 'PaymentDate'),
        Index('IX_Payments_Payer', 'PayerID', 'PaymentDate'),
        Index('IX_Payments_Amount', 'PaymentAmount'),
        Index('IX_Payments_Method', 'PaymentMethod', 'PaymentDate'),
        Index('IX_Payments_Type', 'PaymentType', 'PaymentDate'),
        Index('IX_Payments_Batch', 'BatchID', postgresql_where=BatchID.isnot(None)),
        Index('IX_Payments_Reconciliation', 'IsReconciled', 'PaymentDate',
              postgresql_where=IsReconciled == False),
        Index('IX_Payments_ERA', 'ERANumber', postgresql_where=ERANumber.isnot(None)),
    )
    
    @hybrid_property
    def days_from_service(self):
        """Days from service date to payment date"""
        # This would need to be calculated with a join to the encounter
        return None
    
    @hybrid_property 
    def days_from_submission(self):
        """Days from claim submission to payment date"""
        # This would need to be calculated with a join to the claim
        return None
    
    @validates('PaymentAmount')
    def validate_payment_amount(self, key, amount):
        if amount <= 0:
            raise ValueError("Payment amount must be positive")
        return amount
    
    def __repr__(self):
        return f"<Payment(Amount=${self.PaymentAmount}, Date='{self.PaymentDate}', Method='{self.PaymentMethod}')>"


class PaymentLineItem(Base):
    """Detailed payment allocation to specific claim line items"""
    
    __tablename__ = 'PaymentLineItems'
    
    PaymentLineID = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid4)
    PaymentID = Column(UNIQUEIDENTIFIER, ForeignKey('Payments.PaymentID'), nullable=False)
    ClaimLineID = Column(UNIQUEIDENTIFIER, ForeignKey('ClaimLineItems.ClaimLineID'), nullable=False)
    
    # Line Payment Details
    LinePaymentAmount = Column(SQLDecimal(10, 2), nullable=False)
    LineAdjustmentAmount = Column(SQLDecimal(10, 2), default=0)
    LineWriteOffAmount = Column(SQLDecimal(10, 2), default=0)
    
    # Reason Codes
    PaymentReasonCode = Column(String(5))
    AdjustmentReasonCode = Column(String(5))
    RemarkCode = Column(String(5))
    
    # Line Status
    PaymentStatus = Column(String(20), default='POSTED',
                          CheckConstraint("PaymentStatus IN ('PENDING', 'POSTED', 'REVERSED', 'ADJUSTED')"))
    
    # System Fields
    CreatedDate = Column(DateTime, default=func.getutcdate())
    CreatedBy = Column(String(50), default=func.system_user())
    
    # Relationships
    payment = relationship("Payment", back_populates="line_items")
    claim_line = relationship("ClaimLineItem", back_populates="payment_line_items")
    
    # Indexes
    __table_args__ = (
        Index('IX_PaymentLineItems_Payment', 'PaymentID'),
        Index('IX_PaymentLineItems_ClaimLine', 'ClaimLineID'),
        Index('IX_PaymentLineItems_Status', 'PaymentStatus'),
        Index('IX_PaymentLineItems_Amount', 'LinePaymentAmount'),
        UniqueConstraint('PaymentID', 'ClaimLineID'),
    )
    
    def __repr__(self):
        return f"<PaymentLineItem(Amount=${self.LinePaymentAmount}, Status='{self.PaymentStatus}')>"


# =============================================================================
# 8. REFERENCE DATA MODELS
# =============================================================================

class CPTCode(Base):
    """Current Procedural Terminology codes"""
    
    __tablename__ = 'CPTCodes'
    
    CPTCodeID = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid4)
    CPTCode = Column(String(5), unique=True, nullable=False, index=True)
    ShortDescription = Column(String(200), nullable=False)
    FullDescription = Column(String(500), nullable=False)
    Category = Column(String(50), nullable=False, index=True)
    Section = Column(String(100), nullable=False)
    
    # RVU Information (CMS data)
    WorkRVU = Column(SQLDecimal(8, 4))
    PracticeExpenseRVU_Facility = Column(SQLDecimal(8, 4))
    PracticeExpenseRVU_NonFacility = Column(SQLDecimal(8, 4))
    MalpracticeRVU = Column(SQLDecimal(8, 4))
    
    # Pricing Information
    MedicareAmount_Facility = Column(SQLDecimal(10, 2))
    MedicareAmount_NonFacility = Column(SQLDecimal(10, 2))
    
    # Billing Information
    BillingUnits = Column(String(10), default='UNITS')
    ModifiersAllowed = Column(String(100))
    GlobalPeriod = Column(String(3))
    
    # Status Information
    IsActive = Column(Boolean, default=True)
    EffectiveDate = Column(Date, nullable=False)
    EndDate = Column(Date)
    LastUpdated = Column(DateTime, default=func.getutcdate())
    
    # Computed Properties
    @hybrid_property
    def total_rvu_facility(self):
        return ((self.WorkRVU or 0) + 
                (self.PracticeExpenseRVU_Facility or 0) + 
                (self.MalpracticeRVU or 0))
    
    @hybrid_property 
    def total_rvu_non_facility(self):
        return ((self.WorkRVU or 0) + 
                (self.PracticeExpenseRVU_NonFacility or 0) + 
                (self.MalpracticeRVU or 0))
    
    # Indexes
    __table_args__ = (
        Index('IX_CPTCodes_Category', 'Category'),
        Index('IX_CPTCodes_Section', 'Section'),
        Index('IX_CPTCodes_Active', 'IsActive', postgresql_where=IsActive == True),
        Index('IX_CPTCodes_RVU', 'total_rvu_non_facility'),
    )
    
    def __repr__(self):
        return f"<CPTCode(Code='{self.CPTCode}', Description='{self.ShortDescription}')>"


class ICDCode(Base):
    """International Classification of Diseases codes"""
    
    __tablename__ = 'ICDCodes'
    
    ICDCodeID = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid4)
    ICDCode = Column(String(10), nullable=False)
    ICDVersion = Column(String(10), nullable=False, default='ICD-10-CM')
    ShortDescription = Column(String(200), nullable=False)
    FullDescription = Column(String(500), nullable=False)
    Category = Column(String(50), nullable=False, index=True)
    Chapter = Column(String(100), nullable=False)
    
    # Classification Information
    IsCC = Column(Boolean, default=False)  # Complication/Comorbidity
    IsMCC = Column(Boolean, default=False)  # Major Complication/Comorbidity
    IsHAC = Column(Boolean, default=False)  # Hospital Acquired Condition
    
    # DRG Information
    DRGWeight = Column(SQLDecimal(6, 4))
    DRGCategory = Column(String(50))
    
    # Quality Reporting
    IsQualityMeasure = Column(Boolean, default=False)
    QualityMeasureName = Column(String(100))
    
    # Status Information
    IsActive = Column(Boolean, default=True)
    EffectiveDate = Column(Date, nullable=False)
    EndDate = Column(Date)
    LastUpdated = Column(DateTime, default=func.getutcdate())
    
    # Indexes
    __table_args__ = (
        Index('IX_ICDCodes_Code_Version', 'ICDCode', 'ICDVersion'),
        Index('IX_ICDCodes_Category', 'Category'),
        Index('IX_ICDCodes_Chapter', 'Chapter'),
        Index('IX_ICDCodes_Active', 'IsActive', postgresql_where=IsActive == True),
        Index('IX_ICDCodes_CC', 'IsCC', postgresql_where=IsCC == True),
        Index('IX_ICDCodes_MCC', 'IsMCC', postgresql_where=IsMCC == True),
        UniqueConstraint('ICDCode', 'ICDVersion', 'EffectiveDate'),
    )
    
    def __repr__(self):
        return f"<ICDCode(Code='{self.ICDCode}', Description='{self.ShortDescription}')>"