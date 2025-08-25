# Databricks notebook source
# MAGIC %md
# MAGIC # Gold Layer Data Aggregation
# MAGIC ## Cerebra-MD Healthcare Analytics Platform
# MAGIC 
# MAGIC This notebook handles aggregation and KPI calculations from Silver to Gold layer.
# MAGIC 
# MAGIC ### Gold Layer Content:
# MAGIC - Pre-aggregated KPI tables for dashboard consumption
# MAGIC - Provider performance metrics
# MAGIC - Financial analytics and trends
# MAGIC - Denial analytics and root cause analysis
# MAGIC - AR aging reports and collections analytics
# MAGIC - Patient and encounter analytics

# COMMAND ----------

# MAGIC %md
# MAGIC ## Setup and Configuration

# COMMAND ----------

import json
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
import pandas as pd
from pyspark.sql import DataFrame, SparkSession
from pyspark.sql.functions import *
from pyspark.sql.types import *
from pyspark.sql.window import Window
import logging

# Initialize Spark session
spark = SparkSession.builder.appName("CerebraMD-Gold-Aggregation").getOrCreate()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
SILVER_STORAGE_PATH = "abfss://silver@cerebradata.dfs.core.windows.net/"
GOLD_STORAGE_PATH = "abfss://gold@cerebradata.dfs.core.windows.net/"

# COMMAND ----------

# MAGIC %md
# MAGIC ## Database and Table Setup

# COMMAND ----------

# MAGIC %sql
# MAGIC -- Create Gold database if not exists
# MAGIC CREATE DATABASE IF NOT EXISTS gold
# MAGIC LOCATION 'abfss://gold@cerebradata.dfs.core.windows.net/'
# MAGIC COMMENT 'Gold layer - Business-ready aggregated data and KPIs';

# COMMAND ----------

# MAGIC %md
# MAGIC ## Financial KPI Aggregations

# COMMAND ----------

def calculate_financial_kpis(start_date: str, end_date: str) -> DataFrame:
    """Calculate financial KPIs for the specified date range"""
    
    logger.info(f"Calculating financial KPIs from {start_date} to {end_date}")
    
    # Read silver layer data
    encounters = spark.table("silver.encounters").filter(
        (col("encounter_date") >= start_date) & (col("encounter_date") <= end_date)
    )
    claims = spark.table("silver.claims").filter(
        (col("submission_date") >= start_date) & (col("submission_date") <= end_date)
    )
    payments = spark.table("silver.payments").filter(
        (col("payment_date") >= start_date) & (col("payment_date") <= end_date)
    )
    
    # Join data for comprehensive financial analysis
    financial_data = encounters.alias("e") \
        .join(claims.alias("c"), col("e.encounter_id") == col("c.encounter_id"), "left") \
        .join(payments.alias("p"), col("c.claim_id") == col("p.claim_id"), "left")
    
    # Calculate financial KPIs by facility
    financial_kpis = financial_data.groupBy(
        col("e.facility_id").alias("facility_id"),
        date_trunc("month", col("e.encounter_date")).alias("month_year")
    ).agg(
        # Volume Metrics
        countDistinct(col("e.encounter_id")).alias("total_encounters"),
        countDistinct(col("e.patient_id")).alias("unique_patients"),
        countDistinct(col("e.provider_id")).alias("active_providers"),
        countDistinct(col("c.claim_id")).alias("total_claims"),
        
        # Revenue Metrics
        sum(coalesce(col("e.total_charges"), lit(0))).alias("total_charges"),
        sum(coalesce(col("c.billed_amount"), lit(0))).alias("total_billed"),
        sum(coalesce(col("p.payment_amount"), lit(0))).alias("total_collections"),
        sum(coalesce(col("p.adjustment_amount"), lit(0))).alias("total_adjustments"),
        
        # Outstanding AR
        sum(coalesce(col("c.outstanding_amount"), lit(0))).alias("total_outstanding_ar"),
        
        # Collection Rates
        (sum(coalesce(col("p.payment_amount"), lit(0))) / 
         sum(coalesce(col("c.billed_amount"), lit(0)))).alias("gross_collection_rate"),
        
        (sum(coalesce(col("p.payment_amount"), lit(0))) / 
         (sum(coalesce(col("c.billed_amount"), lit(0))) - sum(coalesce(col("p.adjustment_amount"), lit(0))))).alias("net_collection_rate"),
        
        # Denial Metrics
        sum(when(col("c.has_denials"), 1).otherwise(0)).alias("claims_with_denials"),
        sum(col("c.denial_count")).alias("total_denials"),
        
        # Days to Payment
        avg(col("c.days_to_payment")).alias("avg_days_to_payment"),
        
        # Per-Unit Metrics
        (sum(coalesce(col("e.total_charges"), lit(0))) / 
         countDistinct(col("e.encounter_id"))).alias("avg_charge_per_encounter"),
        
        (sum(coalesce(col("p.payment_amount"), lit(0))) / 
         countDistinct(col("e.encounter_id"))).alias("avg_collection_per_encounter"),
        
        # Quality Metrics
        avg(coalesce(col("e.documentation_score"), lit(0))).alias("avg_documentation_score"),
        
        # Encounter Mix
        sum(when(col("e.is_new_patient"), 1).otherwise(0)).alias("new_patient_encounters"),
        sum(when(col("e.is_emergency"), 1).otherwise(0)).alias("emergency_encounters")
    ).withColumn(
        # Calculate denial rate
        "denial_rate",
        when(col("total_claims") > 0, col("claims_with_denials") / col("total_claims")).otherwise(0)
    ).withColumn(
        # Calculate new patient rate
        "new_patient_rate", 
        when(col("total_encounters") > 0, col("new_patient_encounters") / col("total_encounters")).otherwise(0)
    ).withColumn(
        # Calculate emergency rate
        "emergency_rate",
        when(col("total_encounters") > 0, col("emergency_encounters") / col("total_encounters")).otherwise(0)
    ).withColumn(
        "calculation_date", current_date()
    ).withColumn(
        "start_date", lit(start_date).cast(DateType())
    ).withColumn(
        "end_date", lit(end_date).cast(DateType())
    )
    
    return financial_kpis

def calculate_monthly_trends(months_back: int = 12) -> DataFrame:
    """Calculate monthly financial trends"""
    
    logger.info(f"Calculating {months_back} months of financial trends")
    
    # Calculate date range
    end_date = date.today()
    start_date = end_date.replace(day=1) - timedelta(days=months_back * 31)
    
    # Read silver layer data
    encounters = spark.table("silver.encounters").filter(
        col("encounter_date") >= start_date.strftime("%Y-%m-%d")
    )
    claims = spark.table("silver.claims")
    payments = spark.table("silver.payments")
    
    # Join data
    monthly_data = encounters.alias("e") \
        .join(claims.alias("c"), col("e.encounter_id") == col("c.encounter_id"), "left") \
        .join(payments.alias("p"), col("c.claim_id") == col("p.claim_id"), "left")
    
    # Calculate monthly metrics
    monthly_trends = monthly_data.groupBy(
        col("e.facility_id").alias("facility_id"),
        year(col("e.encounter_date")).alias("year"),
        month(col("e.encounter_date")).alias("month"),
        date_trunc("month", col("e.encounter_date")).alias("month_year")
    ).agg(
        # Volume Metrics
        countDistinct(col("e.encounter_id")).alias("encounters"),
        countDistinct(col("e.patient_id")).alias("unique_patients"),
        
        # Revenue Metrics
        sum(coalesce(col("e.total_charges"), lit(0))).alias("total_charges"),
        sum(coalesce(col("p.payment_amount"), lit(0))).alias("total_collections"),
        sum(coalesce(col("p.adjustment_amount"), lit(0))).alias("total_adjustments"),
        
        # Collection Rate
        (sum(coalesce(col("p.payment_amount"), lit(0))) / 
         sum(coalesce(col("c.billed_amount"), lit(0)))).alias("collection_rate")
    )
    
    # Add month-over-month and year-over-year calculations
    window_facility = Window.partitionBy("facility_id").orderBy("month_year")
    window_facility_year = Window.partitionBy("facility_id", "month").orderBy("year")
    
    monthly_trends_with_growth = monthly_trends.withColumn(
        "prior_month_charges",
        lag(col("total_charges"), 1).over(window_facility)
    ).withColumn(
        "prior_year_charges", 
        lag(col("total_charges"), 1).over(window_facility_year)
    ).withColumn(
        "month_over_month_growth",
        when(col("prior_month_charges") > 0, 
             ((col("total_charges") - col("prior_month_charges")) / col("prior_month_charges")) * 100)
        .otherwise(0)
    ).withColumn(
        "year_over_year_growth",
        when(col("prior_year_charges") > 0,
             ((col("total_charges") - col("prior_year_charges")) / col("prior_year_charges")) * 100)
        .otherwise(0)
    ).withColumn(
        "calculation_date", current_date()
    )
    
    return monthly_trends_with_growth

# COMMAND ----------

# MAGIC %md
# MAGIC ## Provider Performance Analytics

# COMMAND ----------

def calculate_provider_performance(start_date: str, end_date: str) -> DataFrame:
    """Calculate provider performance metrics"""
    
    logger.info(f"Calculating provider performance from {start_date} to {end_date}")
    
    # Read silver layer data
    encounters = spark.table("silver.encounters").filter(
        (col("encounter_date") >= start_date) & (col("encounter_date") <= end_date)
    )
    claims = spark.table("silver.claims")
    payments = spark.table("silver.payments")
    
    # Join data
    provider_data = encounters.alias("e") \
        .join(claims.alias("c"), col("e.encounter_id") == col("c.encounter_id"), "left") \
        .join(payments.alias("p"), col("c.claim_id") == col("p.claim_id"), "left")
    
    # Calculate provider performance metrics
    provider_performance = provider_data.groupBy(
        col("e.provider_id").alias("provider_id"),
        col("e.facility_id").alias("facility_id"),
        date_trunc("month", col("e.encounter_date")).alias("month_year")
    ).agg(
        # Productivity Metrics
        countDistinct(col("e.encounter_id")).alias("total_encounters"),
        countDistinct(col("e.patient_id")).alias("unique_patients"),
        countDistinct(col("e.encounter_date")).alias("days_worked"),
        
        # Financial Metrics
        sum(coalesce(col("e.total_charges"), lit(0))).alias("total_charges"),
        sum(coalesce(col("p.payment_amount"), lit(0))).alias("total_collections"),
        avg(coalesce(col("e.total_charges"), lit(0))).alias("avg_charge_per_encounter"),
        
        # Collection Performance
        (sum(coalesce(col("p.payment_amount"), lit(0))) / 
         sum(coalesce(col("c.billed_amount"), lit(0)))).alias("collection_rate"),
        
        # Quality Metrics
        avg(coalesce(col("e.documentation_score"), lit(0))).alias("avg_documentation_score"),
        sum(when(col("e.documentation_score") >= 0.9, 1).otherwise(0)).alias("high_quality_encounters"),
        
        # Case Mix
        countDistinct(col("e.primary_diagnosis_code")).alias("unique_diagnosis_codes"),
        sum(when(col("e.is_new_patient"), 1).otherwise(0)).alias("new_patient_encounters"),
        sum(when(col("e.is_emergency"), 1).otherwise(0)).alias("emergency_encounters"),
        
        # Denial Performance
        sum(when(col("c.has_denials"), 1).otherwise(0)).alias("claims_with_denials"),
        sum(col("c.denial_count")).alias("total_denials"),
        
        # Efficiency Metrics
        avg(col("c.days_to_payment")).alias("avg_days_to_payment")
    ).withColumn(
        # Calculate derived metrics
        "encounters_per_day",
        when(col("days_worked") > 0, col("total_encounters") / col("days_worked")).otherwise(0)
    ).withColumn(
        "collections_per_encounter",
        when(col("total_encounters") > 0, col("total_collections") / col("total_encounters")).otherwise(0)
    ).withColumn(
        "high_quality_rate",
        when(col("total_encounters") > 0, col("high_quality_encounters") / col("total_encounters")).otherwise(0)
    ).withColumn(
        "new_patient_rate",
        when(col("total_encounters") > 0, col("new_patient_encounters") / col("total_encounters")).otherwise(0)
    ).withColumn(
        "denial_rate",
        when(col("total_encounters") > 0, col("claims_with_denials") / col("total_encounters")).otherwise(0)
    ).withColumn(
        "calculation_date", current_date()
    ).withColumn(
        "start_date", lit(start_date).cast(DateType())
    ).withColumn(
        "end_date", lit(end_date).cast(DateType())
    )
    
    # Add rankings within each facility
    window_facility = Window.partitionBy("facility_id", "month_year").orderBy(col("total_charges").desc())
    
    provider_performance_ranked = provider_performance.withColumn(
        "revenue_rank_in_facility",
        row_number().over(window_facility)
    ).withColumn(
        "revenue_percentile_in_facility", 
        percent_rank().over(window_facility)
    )
    
    return provider_performance_ranked

# COMMAND ----------

# MAGIC %md
# MAGIC ## Denial Analytics

# COMMAND ----------

def calculate_denial_analytics(start_date: str, end_date: str) -> DataFrame:
    """Calculate comprehensive denial analytics"""
    
    logger.info(f"Calculating denial analytics from {start_date} to {end_date}")
    
    # Read silver layer data
    encounters = spark.table("silver.encounters").filter(
        (col("encounter_date") >= start_date) & (col("encounter_date") <= end_date)
    )
    claims = spark.table("silver.claims").filter(col("has_denials"))
    
    # Explode denials from claims
    claims_with_denials = claims.select(
        col("*"),
        explode(col("denials")).alias("denial")
    ).select(
        col("*"),
        col("denial.reasonCode").alias("denial_reason_code"),
        col("denial.reasonDescription").alias("denial_reason_description"), 
        col("denial.deniedAmount").alias("denied_amount")
    ).filter(col("denial_reason_code").isNotNull())
    
    # Join with encounters for additional context
    denial_data = claims_with_denials.alias("c") \
        .join(encounters.alias("e"), col("c.encounter_id") == col("e.encounter_id"), "inner")
    
    # Calculate denial analytics by reason code
    denial_by_reason = denial_data.groupBy(
        col("c.denial_reason_code").alias("denial_reason_code"),
        col("c.denial_reason_description").alias("denial_reason_description"),
        date_trunc("month", col("c.submission_date")).alias("month_year")
    ).agg(
        # Volume Metrics
        count("*").alias("denial_count"),
        countDistinct(col("c.claim_id")).alias("denied_claims"),
        countDistinct(col("c.patient_id")).alias("affected_patients"),
        countDistinct(col("c.provider_id")).alias("affected_providers"),
        
        # Financial Impact
        sum(col("c.denied_amount")).alias("total_denied_amount"),
        avg(col("c.denied_amount")).alias("avg_denied_amount"),
        min(col("c.denied_amount")).alias("min_denied_amount"),
        max(col("c.denied_amount")).alias("max_denied_amount"),
        
        # Timing Analysis
        avg(datediff(current_date(), col("c.submission_date"))).alias("avg_days_outstanding"),
        
        # Provider Analysis
        collect_list(struct(
            col("c.provider_id").alias("provider_id"),
            count("*").alias("denials_for_provider")
        )).alias("provider_breakdown")
    ).withColumn(
        "calculation_date", current_date()
    ).withColumn(
        "start_date", lit(start_date).cast(DateType())
    ).withColumn(
        "end_date", lit(end_date).cast(DateType())
    )
    
    # Calculate denial analytics by facility
    denial_by_facility = denial_data.groupBy(
        col("e.facility_id").alias("facility_id"),
        date_trunc("month", col("c.submission_date")).alias("month_year")
    ).agg(
        # Volume Metrics
        count("*").alias("total_denials"),
        countDistinct(col("c.claim_id")).alias("denied_claims"),
        countDistinct(col("c.denial_reason_code")).alias("unique_denial_reasons"),
        
        # Financial Impact
        sum(col("c.denied_amount")).alias("total_denied_amount"),
        
        # Top Denial Reasons
        collect_list(struct(
            col("c.denial_reason_code").alias("reason_code"),
            col("c.denial_reason_description").alias("reason_description"),
            sum(col("c.denied_amount")).alias("amount_for_reason")
        )).alias("top_denial_reasons")
    ).withColumn(
        "calculation_date", current_date()
    ).withColumn(
        "start_date", lit(start_date).cast(DateType())
    ).withColumn(
        "end_date", lit(end_date).cast(DateType())
    )
    
    return denial_by_reason, denial_by_facility

# COMMAND ----------

# MAGIC %md
# MAGIC ## AR Aging Analytics

# COMMAND ----------

def calculate_ar_aging(as_of_date: str = None) -> DataFrame:
    """Calculate AR aging analysis"""
    
    if as_of_date is None:
        as_of_date = date.today().strftime("%Y-%m-%d")
    
    logger.info(f"Calculating AR aging as of {as_of_date}")
    
    # Read silver layer data
    claims = spark.table("silver.claims").filter(
        (col("outstanding_amount") > 0.01) & 
        (col("submission_date") <= as_of_date) &
        (~col("claim_status").isin("PAID", "CLOSED", "VOID"))
    )
    encounters = spark.table("silver.encounters")
    payments = spark.table("silver.payments")
    
    # Join with encounters for facility information
    ar_data = claims.alias("c") \
        .join(encounters.alias("e"), col("c.encounter_id") == col("e.encounter_id"), "inner") \
        .join(
            payments.alias("p").groupBy("claim_id").agg(
                sum("payment_amount").alias("total_paid"),
                max("payment_date").alias("last_payment_date")
            ),
            col("c.claim_id") == col("p.claim_id"),
            "left"
        )
    
    # Calculate days outstanding as of the as_of_date
    ar_with_aging = ar_data.withColumn(
        "days_outstanding",
        datediff(lit(as_of_date).cast(DateType()), col("c.submission_date"))
    ).withColumn(
        "age_bucket",
        when(col("days_outstanding") <= 30, "0-30")
        .when(col("days_outstanding") <= 60, "31-60")
        .when(col("days_outstanding") <= 90, "61-90")
        .when(col("days_outstanding") <= 120, "91-120")
        .otherwise("120+")
    )
    
    # Calculate AR aging by facility
    ar_aging_facility = ar_with_aging.groupBy(
        col("e.facility_id").alias("facility_id"),
        col("age_bucket")
    ).agg(
        count("*").alias("claim_count"),
        sum(col("c.outstanding_amount")).alias("outstanding_amount"),
        avg(col("days_outstanding")).alias("avg_days_outstanding"),
        countDistinct(col("c.patient_id")).alias("unique_patients")
    ).withColumn(
        "as_of_date", lit(as_of_date).cast(DateType())
    ).withColumn(
        "calculation_date", current_date()
    )
    
    # Pivot to get aging buckets as columns
    ar_aging_pivot = ar_aging_facility.groupBy("facility_id", "as_of_date", "calculation_date") \
        .pivot("age_bucket", ["0-30", "31-60", "61-90", "91-120", "120+"]) \
        .agg(
            first("outstanding_amount").alias("amount"),
            first("claim_count").alias("claims"),
            first("avg_days_outstanding").alias("avg_days")
        )
    
    # Calculate totals and percentages
    ar_aging_summary = ar_aging_pivot.withColumn(
        "total_ar",
        coalesce(col("0-30_amount"), lit(0)) + 
        coalesce(col("31-60_amount"), lit(0)) + 
        coalesce(col("61-90_amount"), lit(0)) + 
        coalesce(col("91-120_amount"), lit(0)) + 
        coalesce(col("120+_amount"), lit(0))
    ).withColumn(
        "total_claims",
        coalesce(col("0-30_claims"), lit(0)) +
        coalesce(col("31-60_claims"), lit(0)) +
        coalesce(col("61-90_claims"), lit(0)) +
        coalesce(col("91-120_claims"), lit(0)) +
        coalesce(col("120+_claims"), lit(0))
    ).withColumn(
        "current_percent",
        when(col("total_ar") > 0, col("0-30_amount") / col("total_ar") * 100).otherwise(0)
    ).withColumn(
        "over_90_percent",
        when(col("total_ar") > 0, 
             (coalesce(col("91-120_amount"), lit(0)) + coalesce(col("120+_amount"), lit(0))) / col("total_ar") * 100)
        .otherwise(0)
    )
    
    return ar_aging_summary

# COMMAND ----------

# MAGIC %md
# MAGIC ## Patient Analytics

# COMMAND ----------

def calculate_patient_analytics(start_date: str, end_date: str) -> DataFrame:
    """Calculate patient visit patterns and analytics"""
    
    logger.info(f"Calculating patient analytics from {start_date} to {end_date}")
    
    # Read silver layer data
    encounters = spark.table("silver.encounters").filter(
        (col("encounter_date") >= start_date) & (col("encounter_date") <= end_date)
    )
    
    # Calculate patient visit patterns
    patient_analytics = encounters.groupBy(
        col("patient_id"),
        col("facility_id"),
        date_trunc("month", col("encounter_date")).alias("month_year")
    ).agg(
        # Visit Metrics
        count("*").alias("total_visits"),
        countDistinct(col("provider_id")).alias("unique_providers_seen"),
        min(col("encounter_date")).alias("first_visit_date"),
        max(col("encounter_date")).alias("last_visit_date"),
        
        # Financial Metrics
        sum(coalesce(col("total_charges"), lit(0))).alias("total_charges"),
        avg(coalesce(col("total_charges"), lit(0))).alias("avg_charge_per_visit"),
        
        # Visit Types
        sum(when(col("is_new_patient"), 1).otherwise(0)).alias("new_patient_visits"),
        sum(when(col("is_emergency"), 1).otherwise(0)).alias("emergency_visits"),
        
        # Quality Metrics
        avg(coalesce(col("documentation_score"), lit(0))).alias("avg_documentation_score"),
        
        # Diagnosis Diversity
        countDistinct(col("primary_diagnosis_code")).alias("unique_diagnoses"),
        
        # Most Common Diagnosis
        first(col("primary_diagnosis_code")).alias("most_common_diagnosis"),
        
        # Visit Frequency Analysis
        collect_list(col("encounter_date")).alias("visit_dates")
    ).withColumn(
        "days_between_visits",
        when(col("total_visits") > 1, 
             datediff(col("last_visit_date"), col("first_visit_date")) / (col("total_visits") - 1))
        .otherwise(0)
    ).withColumn(
        "patient_type",
        when(col("total_visits") == 1, "Single Visit")
        .when(col("total_visits") <= 3, "Occasional")
        .when(col("total_visits") <= 10, "Regular")
        .otherwise("Frequent")
    ).withColumn(
        "is_high_value",
        when(col("total_charges") > 5000, True).otherwise(False)
    ).withColumn(
        "calculation_date", current_date()
    ).withColumn(
        "start_date", lit(start_date).cast(DateType())
    ).withColumn(
        "end_date", lit(end_date).cast(DateType())
    )
    
    # Calculate facility-level patient summaries
    facility_patient_summary = patient_analytics.groupBy(
        col("facility_id"),
        col("month_year")
    ).agg(
        countDistinct(col("patient_id")).alias("unique_patients"),
        sum(col("total_visits")).alias("total_encounters"),
        
        # Patient Mix
        sum(when(col("patient_type") == "Single Visit", 1).otherwise(0)).alias("single_visit_patients"),
        sum(when(col("patient_type") == "Occasional", 1).otherwise(0)).alias("occasional_patients"),
        sum(when(col("patient_type") == "Regular", 1).otherwise(0)).alias("regular_patients"),
        sum(when(col("patient_type") == "Frequent", 1).otherwise(0)).alias("frequent_patients"),
        
        # High Value Patients
        sum(when(col("is_high_value"), 1).otherwise(0)).alias("high_value_patients"),
        sum(when(col("is_high_value"), col("total_charges")).otherwise(0)).alias("high_value_revenue"),
        
        # Average Metrics
        avg(col("total_visits")).alias("avg_visits_per_patient"),
        avg(col("total_charges")).alias("avg_charges_per_patient"),
        avg(col("days_between_visits")).alias("avg_days_between_visits")
    ).withColumn(
        "calculation_date", current_date()
    )
    
    return patient_analytics, facility_patient_summary

# COMMAND ----------

# MAGIC %md
# MAGIC ## Gold Layer Table Creation

# COMMAND ----------

def create_gold_tables():
    """Create all gold layer tables"""
    
    logger.info("Creating gold layer tables")
    
    # Financial KPIs table
    financial_kpis_schema = StructType([
        StructField("facility_id", StringType(), False),
        StructField("month_year", TimestampType(), False),
        StructField("total_encounters", LongType(), True),
        StructField("unique_patients", LongType(), True),
        StructField("active_providers", LongType(), True),
        StructField("total_claims", LongType(), True),
        StructField("total_charges", DecimalType(15, 2), True),
        StructField("total_billed", DecimalType(15, 2), True),
        StructField("total_collections", DecimalType(15, 2), True),
        StructField("total_adjustments", DecimalType(15, 2), True),
        StructField("total_outstanding_ar", DecimalType(15, 2), True),
        StructField("gross_collection_rate", DecimalType(7, 4), True),
        StructField("net_collection_rate", DecimalType(7, 4), True),
        StructField("denial_rate", DecimalType(7, 4), True),
        StructField("avg_days_to_payment", DecimalType(10, 2), True),
        StructField("avg_charge_per_encounter", DecimalType(12, 2), True),
        StructField("avg_collection_per_encounter", DecimalType(12, 2), True),
        StructField("new_patient_rate", DecimalType(7, 4), True),
        StructField("emergency_rate", DecimalType(7, 4), True),
        StructField("calculation_date", DateType(), True),
        StructField("start_date", DateType(), True),
        StructField("end_date", DateType(), True)
    ])
    
    create_delta_table("gold.financial_kpis", financial_kpis_schema, ["facility_id"])
    
    # Provider performance table
    provider_performance_schema = StructType([
        StructField("provider_id", StringType(), False),
        StructField("facility_id", StringType(), False),
        StructField("month_year", TimestampType(), False),
        StructField("total_encounters", LongType(), True),
        StructField("unique_patients", LongType(), True),
        StructField("days_worked", LongType(), True),
        StructField("total_charges", DecimalType(15, 2), True),
        StructField("total_collections", DecimalType(15, 2), True),
        StructField("collection_rate", DecimalType(7, 4), True),
        StructField("encounters_per_day", DecimalType(8, 2), True),
        StructField("collections_per_encounter", DecimalType(12, 2), True),
        StructField("avg_documentation_score", DecimalType(7, 4), True),
        StructField("high_quality_rate", DecimalType(7, 4), True),
        StructField("denial_rate", DecimalType(7, 4), True),
        StructField("revenue_rank_in_facility", IntegerType(), True),
        StructField("revenue_percentile_in_facility", DecimalType(7, 4), True),
        StructField("calculation_date", DateType(), True)
    ])
    
    create_delta_table("gold.provider_performance", provider_performance_schema, ["provider_id"])
    
    # Denial analytics table
    denial_analytics_schema = StructType([
        StructField("denial_reason_code", StringType(), False),
        StructField("denial_reason_description", StringType(), True),
        StructField("month_year", TimestampType(), False),
        StructField("denial_count", LongType(), True),
        StructField("denied_claims", LongType(), True),
        StructField("affected_patients", LongType(), True),
        StructField("affected_providers", LongType(), True),
        StructField("total_denied_amount", DecimalType(15, 2), True),
        StructField("avg_denied_amount", DecimalType(12, 2), True),
        StructField("avg_days_outstanding", DecimalType(10, 2), True),
        StructField("calculation_date", DateType(), True)
    ])
    
    create_delta_table("gold.denial_analytics", denial_analytics_schema, ["denial_reason_code"])
    
    # AR aging table
    ar_aging_schema = StructType([
        StructField("facility_id", StringType(), False),
        StructField("as_of_date", DateType(), False),
        StructField("0-30_amount", DecimalType(15, 2), True),
        StructField("31-60_amount", DecimalType(15, 2), True),
        StructField("61-90_amount", DecimalType(15, 2), True),
        StructField("91-120_amount", DecimalType(15, 2), True),
        StructField("120+_amount", DecimalType(15, 2), True),
        StructField("total_ar", DecimalType(15, 2), True),
        StructField("current_percent", DecimalType(7, 4), True),
        StructField("over_90_percent", DecimalType(7, 4), True),
        StructField("calculation_date", DateType(), True)
    ])
    
    create_delta_table("gold.ar_aging", ar_aging_schema, ["facility_id"])
    
    logger.info("Gold layer tables created successfully")

def create_delta_table(table_name: str, schema: StructType, partition_cols: List[str] = None):
    """Create Delta table with specified schema"""
    
    table_path = f"{GOLD_STORAGE_PATH}{table_name.split('.')[1]}/"
    
    # Create empty DataFrame with schema
    empty_df = spark.createDataFrame([], schema)
    
    # Write as Delta table
    writer = empty_df.write.format("delta").mode("overwrite")
    
    if partition_cols:
        writer = writer.partitionBy(partition_cols)
    
    writer.option("path", table_path).saveAsTable(table_name)
    
    logger.info(f"Created gold table: {table_name}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Gold Layer Orchestration

# COMMAND ----------

def run_gold_aggregation(start_date: str, end_date: str):
    """Run complete gold layer aggregation"""
    
    logger.info(f"Starting gold layer aggregation from {start_date} to {end_date}")
    
    try:
        # Create tables if they don't exist
        create_gold_tables()
        
        # Calculate financial KPIs
        logger.info("Calculating financial KPIs...")
        financial_kpis = calculate_financial_kpis(start_date, end_date)
        
        # Write financial KPIs
        (financial_kpis.write
         .format("delta")
         .mode("overwrite")
         .option("mergeSchema", "true")
         .saveAsTable("gold.financial_kpis"))
        
        logger.info(f"Financial KPIs completed: {financial_kpis.count()} records")
        
        # Calculate monthly trends
        logger.info("Calculating monthly trends...")
        monthly_trends = calculate_monthly_trends()
        
        # Write monthly trends
        (monthly_trends.write
         .format("delta")
         .mode("overwrite")
         .option("mergeSchema", "true")
         .saveAsTable("gold.monthly_trends"))
        
        logger.info(f"Monthly trends completed: {monthly_trends.count()} records")
        
        # Calculate provider performance
        logger.info("Calculating provider performance...")
        provider_performance = calculate_provider_performance(start_date, end_date)
        
        # Write provider performance
        (provider_performance.write
         .format("delta")
         .mode("overwrite")
         .option("mergeSchema", "true")
         .saveAsTable("gold.provider_performance"))
        
        logger.info(f"Provider performance completed: {provider_performance.count()} records")
        
        # Calculate denial analytics
        logger.info("Calculating denial analytics...")
        denial_by_reason, denial_by_facility = calculate_denial_analytics(start_date, end_date)
        
        # Write denial analytics
        (denial_by_reason.write
         .format("delta")
         .mode("overwrite")
         .option("mergeSchema", "true")
         .saveAsTable("gold.denial_analytics"))
        
        (denial_by_facility.write
         .format("delta")
         .mode("overwrite")
         .option("mergeSchema", "true")
         .saveAsTable("gold.denial_by_facility"))
        
        logger.info(f"Denial analytics completed")
        
        # Calculate AR aging
        logger.info("Calculating AR aging...")
        ar_aging = calculate_ar_aging()
        
        # Write AR aging
        (ar_aging.write
         .format("delta")
         .mode("overwrite")
         .option("mergeSchema", "true")
         .saveAsTable("gold.ar_aging"))
        
        logger.info(f"AR aging completed: {ar_aging.count()} records")
        
        # Calculate patient analytics
        logger.info("Calculating patient analytics...")
        patient_analytics, facility_patient_summary = calculate_patient_analytics(start_date, end_date)
        
        # Write patient analytics
        (facility_patient_summary.write
         .format("delta")
         .mode("overwrite")
         .option("mergeSchema", "true")
         .saveAsTable("gold.patient_analytics"))
        
        logger.info(f"Patient analytics completed")
        
        # Record aggregation success
        record_aggregation_metrics(start_date, end_date, "SUCCESS")
        
        logger.info(f"Gold layer aggregation completed successfully for {start_date} to {end_date}")
        
    except Exception as e:
        logger.error(f"Gold layer aggregation failed: {str(e)}")
        record_aggregation_metrics(start_date, end_date, "FAILED")
        raise

def record_aggregation_metrics(start_date: str, end_date: str, status: str):
    """Record aggregation metrics for monitoring"""
    
    metrics_data = [{
        "start_date": start_date,
        "end_date": end_date,
        "aggregation_timestamp": datetime.utcnow().isoformat(),
        "status": status,
        "processing_stage": "GOLD_AGGREGATION"
    }]
    
    metrics_df = spark.createDataFrame(metrics_data)
    
    (metrics_df.write
     .format("delta")
     .mode("append")
     .saveAsTable("gold.aggregation_metrics"))

# COMMAND ----------

# MAGIC %md
# MAGIC ## Workflow Execution

# COMMAND ----------

# MAGIC %python
# MAGIC # Execute gold aggregation workflow
# MAGIC try:
# MAGIC     # Calculate for last month
# MAGIC     end_date = date.today().replace(day=1) - timedelta(days=1)  # Last day of previous month
# MAGIC     start_date = end_date.replace(day=1)  # First day of previous month
# MAGIC     
# MAGIC     # Main aggregation workflow
# MAGIC     run_gold_aggregation(start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d"))
# MAGIC     
# MAGIC     print(f"Gold layer aggregation completed for {start_date} to {end_date}")
# MAGIC     
# MAGIC except Exception as e:
# MAGIC     print(f"Aggregation workflow failed: {str(e)}")
# MAGIC     raise

# COMMAND ----------

# MAGIC %md
# MAGIC ## Data Quality and Validation

# COMMAND ----------

def validate_gold_layer_data():
    """Validate gold layer data quality"""
    
    logger.info("Validating gold layer data quality")
    
    validation_results = {}
    
    # Validate financial KPIs
    financial_kpis = spark.table("gold.financial_kpis")
    validation_results["financial_kpis"] = {
        "record_count": financial_kpis.count(),
        "null_facilities": financial_kpis.filter(col("facility_id").isNull()).count(),
        "negative_charges": financial_kpis.filter(col("total_charges") < 0).count(),
        "invalid_rates": financial_kpis.filter(
            (col("gross_collection_rate") < 0) | (col("gross_collection_rate") > 1)
        ).count()
    }
    
    # Validate provider performance
    provider_performance = spark.table("gold.provider_performance")
    validation_results["provider_performance"] = {
        "record_count": provider_performance.count(),
        "null_providers": provider_performance.filter(col("provider_id").isNull()).count(),
        "zero_encounters": provider_performance.filter(col("total_encounters") == 0).count()
    }
    
    # Validate AR aging
    ar_aging = spark.table("gold.ar_aging")
    validation_results["ar_aging"] = {
        "record_count": ar_aging.count(),
        "negative_ar": ar_aging.filter(col("total_ar") < 0).count(),
        "invalid_percentages": ar_aging.filter(
            (col("current_percent") < 0) | (col("current_percent") > 100)
        ).count()
    }
    
    print("Gold Layer Validation Results:")
    for table, results in validation_results.items():
        print(f"\n{table}:")
        for metric, value in results.items():
            print(f"  {metric}: {value}")
    
    return validation_results

# Run validation
validation_results = validate_gold_layer_data()

# COMMAND ----------

# MAGIC %md
# MAGIC ## Performance Optimization

# COMMAND ----------

# MAGIC %sql
# MAGIC -- Optimize gold tables for analytical queries
# MAGIC OPTIMIZE gold.financial_kpis ZORDER BY (facility_id, month_year);
# MAGIC OPTIMIZE gold.provider_performance ZORDER BY (provider_id, month_year);
# MAGIC OPTIMIZE gold.denial_analytics ZORDER BY (denial_reason_code, month_year);
# MAGIC OPTIMIZE gold.ar_aging ZORDER BY (facility_id, as_of_date);
# MAGIC 
# MAGIC -- Create useful views for dashboard consumption
# MAGIC CREATE OR REPLACE VIEW gold.latest_financial_kpis AS
# MAGIC SELECT * FROM gold.financial_kpis
# MAGIC WHERE month_year = (SELECT MAX(month_year) FROM gold.financial_kpis);
# MAGIC 
# MAGIC CREATE OR REPLACE VIEW gold.top_providers_by_revenue AS
# MAGIC SELECT * FROM gold.provider_performance
# MAGIC WHERE revenue_rank_in_facility <= 10
# MAGIC AND month_year = (SELECT MAX(month_year) FROM gold.provider_performance);
# MAGIC 
# MAGIC CREATE OR REPLACE VIEW gold.top_denial_reasons AS
# MAGIC SELECT * FROM gold.denial_analytics
# MAGIC WHERE month_year = (SELECT MAX(month_year) FROM gold.denial_analytics)
# MAGIC ORDER BY total_denied_amount DESC
# MAGIC LIMIT 20;

# COMMAND ----------

# MAGIC %md
# MAGIC ## Summary
# MAGIC 
# MAGIC This notebook provides comprehensive gold layer aggregation for the Cerebra-MD platform:
# MAGIC 
# MAGIC 1. **Financial KPIs**: Revenue, collection rates, and financial performance metrics
# MAGIC 2. **Provider Analytics**: Individual provider performance and rankings
# MAGIC 3. **Denial Analytics**: Root cause analysis and denial trending
# MAGIC 4. **AR Aging**: Accounts receivable aging analysis by facility
# MAGIC 5. **Patient Analytics**: Visit patterns and patient segmentation
# MAGIC 6. **Monthly Trends**: Time series analysis for trending and forecasting
# MAGIC 
# MAGIC The gold layer provides:
# MAGIC - **Business-Ready Data**: Pre-aggregated KPIs for fast dashboard queries
# MAGIC - **Comprehensive Analytics**: 360-degree view of healthcare operations
# MAGIC - **Performance Optimization**: Delta Lake with Z-ordering for analytical workloads
# MAGIC - **Data Quality**: Built-in validation and quality checks
# MAGIC - **Scalability**: Designed for large healthcare organizations
# MAGIC - **Real-time Insights**: Fresh data for operational decision making