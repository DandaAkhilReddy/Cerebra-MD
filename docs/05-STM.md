# CerebraMD Source-to-Target Mapping (STM)

## 1. Overview

This document defines the source-to-target mapping for CerebraMD's data integration pipelines. It covers data flows from various source systems into our analytical data platform.

## 2. Source Systems

### 2.1 Internal Systems
- **Patient Portal**: User interactions, preferences, engagement data
- **Provider Portal**: Clinical notes, care plans, provider actions
- **Mobile Apps**: Device data, location-based services, offline actions
- **IoT Devices**: Vitals, activity data, continuous monitoring

### 2.2 External Systems
- **EHR Systems**: Epic, Cerner, Allscripts
- **Pharmacy Systems**: Medication data, refill information
- **Lab Systems**: Test results, diagnostic data
- **Insurance Systems**: Claims, eligibility, authorizations

## 3. Target Data Model

### 3.1 Data Lake Zones
```
Raw Zone (Landing)
├── cerebramd_app/
├── ehr_systems/
├── pharmacy_data/
├── lab_results/
└── device_data/

Processed Zone
├── standardized/
├── validated/
├── enriched/
└── aggregated/

Curated Zone
├── patient_360/
├── provider_analytics/
├── clinical_outcomes/
└── operational_metrics/
```

## 4. Detailed Mapping Tables

### 4.1 Patient Demographics Mapping

| Source System | Source Table | Source Field | Target Table | Target Field | Transformation | Data Type | Validation Rules |
|--------------|--------------|--------------|--------------|--------------|----------------|-----------|------------------|
| Patient Portal | users | user_id | dim_patient | patient_id | Direct | VARCHAR(50) | Not Null, Unique |
| Patient Portal | users | first_name | dim_patient | first_name | Trim, Capitalize | VARCHAR(100) | Not Null |
| Patient Portal | users | last_name | dim_patient | last_name | Trim, Capitalize | VARCHAR(100) | Not Null |
| Patient Portal | users | date_of_birth | dim_patient | birth_date | Date Format | DATE | Valid Date, Age 0-120 |
| Patient Portal | users | gender | dim_patient | gender_code | Standardize | CHAR(1) | In ('M','F','O','U') |
| Patient Portal | users | email | dim_patient | email_address | Lowercase | VARCHAR(255) | Valid Email Format |
| Patient Portal | users | phone | dim_patient | phone_primary | Format: +1XXXXXXXXXX | VARCHAR(20) | Valid Phone |
| Patient Portal | user_address | street_1 | dim_patient | address_line_1 | Trim | VARCHAR(255) | Not Null |
| Patient Portal | user_address | city | dim_patient | city | Trim, Capitalize | VARCHAR(100) | Not Null |
| Patient Portal | user_address | state | dim_patient | state_code | Uppercase | CHAR(2) | Valid State Code |
| Patient Portal | user_address | zip | dim_patient | postal_code | Format: XXXXX-XXXX | VARCHAR(10) | Valid ZIP |
| EHR-Epic | patient | pat_id | dim_patient | ehr_patient_id | Prefix: 'EPIC_' | VARCHAR(100) | Not Null |
| EHR-Epic | patient | mrn | dim_patient | medical_record_no | Direct | VARCHAR(50) | Not Null |

### 4.2 Medication Data Mapping

| Source System | Source Table | Source Field | Target Table | Target Field | Transformation | Data Type | Validation Rules |
|--------------|--------------|--------------|--------------|--------------|----------------|-----------|------------------|
| Patient Portal | medications | med_id | fact_medication | medication_event_id | Generate UUID | VARCHAR(50) | Not Null, Unique |
| Patient Portal | medications | user_id | fact_medication | patient_id | Direct | VARCHAR(50) | FK to dim_patient |
| Patient Portal | medications | medication_name | fact_medication | medication_name | Standardize | VARCHAR(255) | Not Null |
| Patient Portal | medications | ndc_code | dim_medication | ndc_code | Direct | VARCHAR(20) | Valid NDC |
| Patient Portal | medications | dosage | fact_medication | dosage_amount | Extract Number | DECIMAL(10,2) | > 0 |
| Patient Portal | medications | dosage_unit | fact_medication | dosage_unit | Standardize | VARCHAR(20) | Valid Unit |
| Patient Portal | medications | frequency | fact_medication | frequency_code | Map to Standard | VARCHAR(20) | Valid Frequency |
| Patient Portal | medications | start_date | fact_medication | prescription_date | Date Format | DATE | Valid Date |
| Patient Portal | medications | end_date | fact_medication | discontinue_date | Date Format | DATE | Valid Date |
| Patient Portal | med_adherence | taken_timestamp | fact_medication | administration_time | Timestamp | TIMESTAMP | Not Null |
| Patient Portal | med_adherence | taken_flag | fact_medication | adherence_flag | Boolean | BOOLEAN | Not Null |
| Pharmacy | rx_fill | fill_date | fact_medication | dispensed_date | Date Format | DATE | Valid Date |
| Pharmacy | rx_fill | days_supply | fact_medication | days_supply | Integer | INTEGER | > 0 |
| Pharmacy | rx_fill | quantity | fact_medication | quantity_dispensed | Integer | INTEGER | > 0 |

### 4.3 Vital Signs Mapping

| Source System | Source Table | Source Field | Target Table | Target Field | Transformation | Data Type | Validation Rules |
|--------------|--------------|--------------|--------------|--------------|----------------|-----------|------------------|
| IoT Devices | bp_readings | device_id | fact_vitals | source_device_id | Direct | VARCHAR(50) | Not Null |
| IoT Devices | bp_readings | user_id | fact_vitals | patient_id | Direct | VARCHAR(50) | FK to dim_patient |
| IoT Devices | bp_readings | systolic | fact_vitals | bp_systolic | Integer | INTEGER | 60-250 |
| IoT Devices | bp_readings | diastolic | fact_vitals | bp_diastolic | Integer | INTEGER | 40-150 |
| IoT Devices | bp_readings | reading_time | fact_vitals | measurement_time | Timestamp | TIMESTAMP | Not Null |
| IoT Devices | glucose_meter | glucose_value | fact_vitals | glucose_mg_dl | Integer | INTEGER | 20-600 |
| IoT Devices | glucose_meter | meal_context | fact_vitals | glucose_context | Map Values | VARCHAR(20) | Valid Context |
| IoT Devices | weight_scale | weight_lbs | fact_vitals | weight_lbs | Decimal | DECIMAL(5,2) | 50-800 |
| IoT Devices | weight_scale | bmi | fact_vitals | bmi | Calculate if null | DECIMAL(4,1) | 10-70 |
| Wearables | heart_rate | hr_value | fact_vitals | heart_rate_bpm | Integer | INTEGER | 30-250 |
| Wearables | activity | steps_count | fact_activity | daily_steps | Integer | INTEGER | >= 0 |
| Wearables | sleep | sleep_hours | fact_activity | sleep_duration | Decimal | DECIMAL(3,1) | 0-24 |

### 4.4 Clinical Encounters Mapping

| Source System | Source Table | Source Field | Target Table | Target Field | Transformation | Data Type | Validation Rules |
|--------------|--------------|--------------|--------------|--------------|----------------|-----------|------------------|
| EHR-Epic | encounter | encounter_id | fact_encounter | encounter_id | Prefix: 'EPIC_' | VARCHAR(50) | Not Null, Unique |
| EHR-Epic | encounter | patient_id | fact_encounter | patient_id | Map to Internal | VARCHAR(50) | FK to dim_patient |
| EHR-Epic | encounter | provider_id | fact_encounter | provider_id | Map to Internal | VARCHAR(50) | FK to dim_provider |
| EHR-Epic | encounter | encounter_date | fact_encounter | encounter_date | Date Format | DATE | Valid Date |
| EHR-Epic | encounter | encounter_type | fact_encounter | encounter_type | Standardize | VARCHAR(50) | Valid Type |
| EHR-Epic | encounter | location_id | fact_encounter | facility_id | Map to Internal | VARCHAR(50) | FK to dim_facility |
| EHR-Epic | encounter | chief_complaint | fact_encounter | chief_complaint | Trim | TEXT | Not Null |
| EHR-Epic | diagnosis | icd10_code | fact_diagnosis | diagnosis_code | Direct | VARCHAR(10) | Valid ICD10 |
| EHR-Epic | diagnosis | diagnosis_name | fact_diagnosis | diagnosis_desc | Direct | VARCHAR(500) | Not Null |
| EHR-Epic | diagnosis | primary_flag | fact_diagnosis | is_primary | Boolean | BOOLEAN | Not Null |

### 4.5 Provider Data Mapping

| Source System | Source Table | Source Field | Target Table | Target Field | Transformation | Data Type | Validation Rules |
|--------------|--------------|--------------|--------------|--------------|----------------|-----------|------------------|
| Provider Portal | providers | provider_id | dim_provider | provider_id | Direct | VARCHAR(50) | Not Null, Unique |
| Provider Portal | providers | npi | dim_provider | npi_number | Direct | VARCHAR(10) | Valid NPI |
| Provider Portal | providers | first_name | dim_provider | first_name | Trim, Capitalize | VARCHAR(100) | Not Null |
| Provider Portal | providers | last_name | dim_provider | last_name | Trim, Capitalize | VARCHAR(100) | Not Null |
| Provider Portal | providers | specialty | dim_provider | specialty_primary | Standardize | VARCHAR(100) | Valid Specialty |
| Provider Portal | providers | license_state | dim_provider | license_state | Uppercase | CHAR(2) | Valid State |
| Provider Portal | providers | license_number | dim_provider | license_number | Direct | VARCHAR(50) | Not Null |

### 4.6 Care Plan Mapping

| Source System | Source Table | Source Field | Target Table | Target Field | Transformation | Data Type | Validation Rules |
|--------------|--------------|--------------|--------------|--------------|----------------|-----------|------------------|
| Care Platform | care_plans | plan_id | fact_care_plan | care_plan_id | Direct | VARCHAR(50) | Not Null, Unique |
| Care Platform | care_plans | patient_id | fact_care_plan | patient_id | Direct | VARCHAR(50) | FK to dim_patient |
| Care Platform | care_plans | provider_id | fact_care_plan | provider_id | Direct | VARCHAR(50) | FK to dim_provider |
| Care Platform | care_plans | plan_type | fact_care_plan | plan_type | Standardize | VARCHAR(50) | Valid Type |
| Care Platform | care_plans | start_date | fact_care_plan | effective_date | Date Format | DATE | Not Null |
| Care Platform | care_plans | end_date | fact_care_plan | expiration_date | Date Format | DATE | >= start_date |
| Care Platform | care_goals | goal_description | fact_care_goal | goal_text | Direct | TEXT | Not Null |
| Care Platform | care_goals | target_value | fact_care_goal | target_value | Decimal | DECIMAL(10,2) | Not Null |
| Care Platform | care_goals | target_date | fact_care_goal | target_date | Date Format | DATE | Future Date |
| Care Platform | care_goals | status | fact_care_goal | goal_status | Standardize | VARCHAR(20) | Valid Status |

## 5. Data Quality Rules

### 5.1 Completeness Rules
```sql
-- Patient Demographics Completeness
SELECT 
    COUNT(*) as total_records,
    SUM(CASE WHEN first_name IS NULL THEN 1 ELSE 0 END) as missing_first_name,
    SUM(CASE WHEN last_name IS NULL THEN 1 ELSE 0 END) as missing_last_name,
    SUM(CASE WHEN birth_date IS NULL THEN 1 ELSE 0 END) as missing_birth_date
FROM dim_patient;

-- Threshold: < 1% missing for required fields
```

### 5.2 Consistency Rules
```sql
-- Medication Dosage Consistency
SELECT 
    medication_name,
    dosage_unit,
    COUNT(DISTINCT dosage_amount) as unique_dosages
FROM fact_medication
GROUP BY medication_name, dosage_unit
HAVING COUNT(DISTINCT dosage_amount) > 10;

-- Flag medications with unusual dosage variations
```

### 5.3 Accuracy Rules
```sql
-- Vital Signs Range Validation
SELECT 
    patient_id,
    measurement_time,
    bp_systolic,
    bp_diastolic,
    CASE 
        WHEN bp_systolic < 60 OR bp_systolic > 250 THEN 'Out of Range'
        WHEN bp_diastolic < 40 OR bp_diastolic > 150 THEN 'Out of Range'
        ELSE 'Valid'
    END as validation_status
FROM fact_vitals
WHERE validation_status = 'Out of Range';
```

## 6. ETL Process Flow

### 6.1 Daily Batch Process
```
1. Extract Phase (00:00 - 02:00)
   - Pull delta records from source systems
   - Land in Raw Zone with timestamp
   - Generate extraction logs

2. Transform Phase (02:00 - 04:00)
   - Apply data type conversions
   - Standardize codes and values
   - Enrich with reference data
   - Apply business rules

3. Load Phase (04:00 - 05:00)
   - Load to target tables
   - Update slowly changing dimensions
   - Refresh aggregated tables
   - Archive processed files

4. Validation Phase (05:00 - 06:00)
   - Run data quality checks
   - Generate exception reports
   - Send alerts for critical issues
```

### 6.2 Real-time Streaming
```
1. Event Capture
   - Kafka topics for each event type
   - Schema registry for validation

2. Stream Processing
   - Kafka Streams for transformation
   - Window aggregations
   - State management

3. Sink to Targets
   - Real-time fact tables
   - Cache updates
   - Alert triggers
```

## 7. Error Handling

### 7.1 Rejection Rules
- **Invalid Patient ID**: Quarantine record, alert ops team
- **Missing Required Fields**: Log error, attempt default values
- **Data Type Mismatch**: Cast attempt, then reject
- **Referential Integrity**: Hold in staging for resolution

### 7.2 Recovery Procedures
- **Reprocessing**: Ability to rerun from checkpoint
- **Manual Correction**: UI for data steward fixes
- **Automated Retry**: Exponential backoff for transient errors

## 8. Performance Considerations

### 8.1 Indexing Strategy
- Primary keys on all dimension tables
- Composite indexes on fact table date + patient
- Covering indexes for common queries

### 8.2 Partitioning Strategy
- Fact tables partitioned by month
- Large dimensions partitioned by state/region
- Hot/cold data separation

### 8.3 Optimization Techniques
- Incremental loads using CDC
- Parallel processing for large tables
- Compression for historical data
- Materialized views for complex aggregations