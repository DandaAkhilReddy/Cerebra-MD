# KPI Catalog & Definitions (v0.1)

## Purpose

Single source of truth for all metrics in Cerebra-MD. Each KPI includes: name, definition, formula, grain, filters, latency, data source, owner, caveats.

## Global Conventions

- **Grain (default)**: Facility-Day-Doctor unless noted
- **Calendar**: Local facility time, report day = midnight–23:59
- **Latency targets**: D+1 for operational KPIs; weekly for cash KPIs
- **Filters**: Date range, facility, doctor, payer, claim status

## 1) Encounter → Claim Funnel

**Definition**: Flow of items from Encounter to Submitted, Accepted, Denied, Reworked, Paid.

### Formulae (counts):
- **Encounters** = distinct(encounter_id)
- **Submitted** = distinct(claim_id where submit_ts not null)
- **Accepted** = distinct(claim_id where first_response = 'Accepted')
- **Denied** = distinct(claim_id where first_response = 'Denied')
- **Reworked** = distinct(claim_id where denial_count >= 1 and resubmitted = true)
- **Paid** = distinct(payment_id where status in ('Posted','Paid'))

### Rates:
- **Submission Rate** = Submitted / Encounters
- **First-Pass Yield (FPY)** = Accepted / Submitted
- **Denial Rate** = Denied / Submitted
- **Rework Success** = Paid(after denial) / Denied

**Grain**: Facility-Day-Doctor; rollups to week/month  
**Latency**: D+1  
**Source**: gold_funnel view (derived from silver_encounters, silver_claims, silver_payments)  
**Owner**: Shruti (calc), Akhil (visual)  
**Caveats**: Encounters without claims within 7 days flagged as stale

## 2) Denial Analytics

**Definition**: Distribution of denials by payer, reason, doctor, facility at first response.

### Key KPIs:
- **Denials by Reason %** = Denied(reason X) / Denied(total)
- **Top Payers by Denial Rate** = Denied / Submitted by payer
- **Avoidable Denials %** (taxonomy-tagged)

**Grain**: Reason-Payer-Doctor-Facility-Month  
**Latency**: D+1  
**Source**: gold_denials with normalized denial_reason_code  
**Caveats**: Map payer-specific codes to unified taxonomy

## 3) Cash Realization & TAT

**Definition**: Speed and yield of converting billed charges to posted payments.

### KPIs:
- **Cash Realization %** = Sum(Payments Posted) / Sum(Charges Billed)
- **Submission→Payment TAT (P50/P90)** = percentile(payment_post_ts − submit_ts)
- **Aging Buckets** (0-30, 31-60, 61-90, 91-120, 120+) by payer/doctor

**Grain**: Payer-Facility-Month  
**Latency**: Weekly refresh acceptable; aim D+3  
**Source**: gold_cash (joins EOB/payments with claims)  
**Caveats**: Partial payments and adjustments must be included (not just paid in full)

## 4) Operational Throughput

**Definition**: Daily productivity and timeliness.

### KPIs:
- **Encounters per Doctor per Day**
- **Avg Days to Submit** = avg(submit_ts − encounter_ts)
- **% Submitted within 48h**

**Grain**: Doctor-Day  
**Latency**: D+1  
**Source**: gold_ops

## 5) Coding Quality Sentinels (Phase-2 preview)

**Definition**: CPT code outliers, coder overrides, non-compliant flags from billing system.

**KPIs**: Upcoding risk index, Coder-doctor disagreement rate, Non-compliant CPT %

*Note: Placeholder; depends on available fields from AdvancedMD/MediMobile*

## Dimension & Filter Standards

- **Doctor**: stable surrogate doctor_sk linked by historical NPI mappings
- **Facility**: standardized name + code; city/state for grouping
- **Payer**: normalized by parent group (e.g., "UnitedHealthcare" umbrella)
- **Date**: canonical date dimension with fiscal attributes

## Data Quality Thresholds (gate KPIs)

- **Freshness**: ≥ 99% of prior day rows by 08:00 local
- **Uniqueness**: 0 duplicate encounter_id/claim_id in silver/gold
- **Referential integrity**: 100% doctor/payer/facility keys resolved
- **Reconciliation**: Charges vs payments variance ≤ 1% over month-to-date

## Change Control

- Any KPI formula change = version bump (e.g., FPY v1.1) + release note
- All KPIs must cite source tables & columns in STM