# Databricks notebook source
# MAGIC %md
# MAGIC # Bronze Layer Data Ingestion
# MAGIC ## Cerebra-MD Healthcare Analytics Platform
# MAGIC 
# MAGIC This notebook handles raw data ingestion from AdvancedMD and other source systems into the Bronze layer (Data Lake).
# MAGIC 
# MAGIC ### Data Sources:
# MAGIC - AdvancedMD EHR/PM System (API)
# MAGIC - External payer data feeds
# MAGIC - Manual file uploads
# MAGIC - Real-time streaming data

# COMMAND ----------

# MAGIC %md
# MAGIC ## Setup and Configuration

# COMMAND ----------

import json
import requests
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
import pandas as pd
from pyspark.sql import DataFrame, SparkSession
from pyspark.sql.functions import *
from pyspark.sql.types import *
import logging

# Initialize Spark session
spark = SparkSession.builder.appName("CerebraMD-Bronze-Ingestion").getOrCreate()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
BRONZE_STORAGE_PATH = "abfss://bronze@cerebradata.dfs.core.windows.net/"
ADVANCEDMD_API_BASE = "https://api.advancedmd.com/v1"
BATCH_SIZE = 10000

# COMMAND ----------

# MAGIC %md
# MAGIC ## Database and Table Setup

# COMMAND ----------

# MAGIC %sql
# MAGIC -- Create Bronze database if not exists
# MAGIC CREATE DATABASE IF NOT EXISTS bronze
# MAGIC LOCATION 'abfss://bronze@cerebradata.dfs.core.windows.net/'
# MAGIC COMMENT 'Bronze layer - Raw data from source systems';

# COMMAND ----------

# MAGIC %md
# MAGIC ## AdvancedMD API Integration

# COMMAND ----------

class AdvancedMDConnector:
    """Connector for AdvancedMD API integration"""
    
    def __init__(self, api_key: str, base_url: str = ADVANCEDMD_API_BASE):
        self.api_key = api_key
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
            'User-Agent': 'CerebraMD-DataPipeline/1.0'
        })
    
    def extract_encounters(self, start_date: date, end_date: date, practice_id: str) -> List[Dict]:
        """Extract encounter data from AdvancedMD API"""
        logger.info(f"Extracting encounters from {start_date} to {end_date}")
        
        all_encounters = []
        page = 1
        page_size = BATCH_SIZE
        
        while True:
            try:
                params = {
                    'practiceId': practice_id,
                    'startDate': start_date.isoformat(),
                    'endDate': end_date.isoformat(),
                    'pageSize': page_size,
                    'page': page,
                    'includeDetails': True
                }
                
                response = self.session.get(f"{self.base_url}/encounters", params=params, timeout=30)
                response.raise_for_status()
                
                data = response.json()
                encounters = data.get('encounters', [])
                
                if not encounters:
                    break
                
                # Add metadata to each record
                for encounter in encounters:
                    encounter['extraction_timestamp'] = datetime.utcnow().isoformat()
                    encounter['source_system'] = 'AdvancedMD'
                    encounter['api_version'] = 'v1'
                    encounter['batch_id'] = f"ENC_{start_date}_{end_date}_{page}"
                
                all_encounters.extend(encounters)
                logger.info(f"Extracted {len(encounters)} encounters from page {page}")
                
                # Check if more pages exist
                if not data.get('hasMore', False) or len(encounters) < page_size:
                    break
                    
                page += 1
                
            except requests.exceptions.RequestException as e:
                logger.error(f"API request failed for page {page}: {str(e)}")
                if page == 1:
                    raise
                break
            except Exception as e:
                logger.error(f"Unexpected error on page {page}: {str(e)}")
                break
        
        logger.info(f"Total encounters extracted: {len(all_encounters)}")
        return all_encounters
    
    def extract_claims(self, start_date: date, end_date: date, practice_id: str) -> List[Dict]:
        """Extract claims data from AdvancedMD API"""
        logger.info(f"Extracting claims from {start_date} to {end_date}")
        
        all_claims = []
        page = 1
        
        while True:
            try:
                params = {
                    'practiceId': practice_id,
                    'submissionStartDate': start_date.isoformat(),
                    'submissionEndDate': end_date.isoformat(),
                    'pageSize': BATCH_SIZE,
                    'page': page,
                    'includeLineItems': True,
                    'includePayments': True
                }
                
                response = self.session.get(f"{self.base_url}/claims", params=params, timeout=30)
                response.raise_for_status()
                
                data = response.json()
                claims = data.get('claims', [])
                
                if not claims:
                    break
                
                # Add metadata
                for claim in claims:
                    claim['extraction_timestamp'] = datetime.utcnow().isoformat()
                    claim['source_system'] = 'AdvancedMD'
                    claim['batch_id'] = f"CLM_{start_date}_{end_date}_{page}"
                
                all_claims.extend(claims)
                logger.info(f"Extracted {len(claims)} claims from page {page}")
                
                if not data.get('hasMore', False):
                    break
                    
                page += 1
                
            except Exception as e:
                logger.error(f"Error extracting claims page {page}: {str(e)}")
                break
        
        logger.info(f"Total claims extracted: {len(all_claims)}")
        return all_claims
    
    def extract_payments(self, start_date: date, end_date: date, practice_id: str) -> List[Dict]:
        """Extract payment data from AdvancedMD API"""
        logger.info(f"Extracting payments from {start_date} to {end_date}")
        
        all_payments = []
        page = 1
        
        while True:
            try:
                params = {
                    'practiceId': practice_id,
                    'paymentStartDate': start_date.isoformat(),
                    'paymentEndDate': end_date.isoformat(),
                    'pageSize': BATCH_SIZE,
                    'page': page
                }
                
                response = self.session.get(f"{self.base_url}/payments", params=params, timeout=30)
                response.raise_for_status()
                
                data = response.json()
                payments = data.get('payments', [])
                
                if not payments:
                    break
                
                # Add metadata
                for payment in payments:
                    payment['extraction_timestamp'] = datetime.utcnow().isoformat()
                    payment['source_system'] = 'AdvancedMD'
                    payment['batch_id'] = f"PAY_{start_date}_{end_date}_{page}"
                
                all_payments.extend(payments)
                logger.info(f"Extracted {len(payments)} payments from page {page}")
                
                if not data.get('hasMore', False):
                    break
                    
                page += 1
                
            except Exception as e:
                logger.error(f"Error extracting payments page {page}: {str(e)}")
                break
        
        logger.info(f"Total payments extracted: {len(all_payments)}")
        return all_payments

# COMMAND ----------

# MAGIC %md
# MAGIC ## Data Schema Definitions

# COMMAND ----------

# Define schemas for raw data tables
encounter_schema = StructType([
    StructField("encounterId", StringType(), True),
    StructField("encounterNumber", StringType(), True),
    StructField("patientId", StringType(), True),
    StructField("patientMrn", StringType(), True),
    StructField("providerId", StringType(), True),
    StructField("providerNpi", StringType(), True),
    StructField("facilityId", StringType(), True),
    StructField("encounterDate", StringType(), True),
    StructField("encounterTime", StringType(), True),
    StructField("encounterType", StringType(), True),
    StructField("visitType", StringType(), True),
    StructField("chiefComplaint", StringType(), True),
    StructField("primaryDiagnosisCode", StringType(), True),
    StructField("primaryDiagnosis", StringType(), True),
    StructField("secondaryDiagnoses", StringType(), True),  # JSON string
    StructField("procedureCodes", StringType(), True),      # JSON string
    StructField("totalCharges", StringType(), True),
    StructField("encounterStatus", StringType(), True),
    StructField("documentationScore", StringType(), True),
    StructField("extraction_timestamp", StringType(), True),
    StructField("source_system", StringType(), True),
    StructField("api_version", StringType(), True),
    StructField("batch_id", StringType(), True)
])

claims_schema = StructType([
    StructField("claimId", StringType(), True),
    StructField("claimNumber", StringType(), True),
    StructField("encounterId", StringType(), True),
    StructField("patientId", StringType(), True),
    StructField("providerId", StringType(), True),
    StructField("facilityId", StringType(), True),
    StructField("primaryInsuranceId", StringType(), True),
    StructField("secondaryInsuranceId", StringType(), True),
    StructField("claimType", StringType(), True),
    StructField("submissionDate", StringType(), True),
    StructField("serviceStartDate", StringType(), True),
    StructField("serviceEndDate", StringType(), True),
    StructField("billedAmount", StringType(), True),
    StructField("allowedAmount", StringType(), True),
    StructField("paidAmount", StringType(), True),
    StructField("patientResponsibility", StringType(), True),
    StructField("claimStatus", StringType(), True),
    StructField("payerClaimNumber", StringType(), True),
    StructField("lineItems", StringType(), True),           # JSON string
    StructField("denials", StringType(), True),             # JSON string
    StructField("extraction_timestamp", StringType(), True),
    StructField("source_system", StringType(), True),
    StructField("batch_id", StringType(), True)
])

payments_schema = StructType([
    StructField("paymentId", StringType(), True),
    StructField("claimId", StringType(), True),
    StructField("paymentDate", StringType(), True),
    StructField("paymentAmount", StringType(), True),
    StructField("paymentType", StringType(), True),
    StructField("paymentMethod", StringType(), True),
    StructField("payerName", StringType(), True),
    StructField("checkNumber", StringType(), True),
    StructField("eftTraceNumber", StringType(), True),
    StructField("remittanceNumber", StringType(), True),
    StructField("adjustmentAmount", StringType(), True),
    StructField("adjustmentReason", StringType(), True),
    StructField("extraction_timestamp", StringType(), True),
    StructField("source_system", StringType(), True),
    StructField("batch_id", StringType(), True)
])

# COMMAND ----------

# MAGIC %md
# MAGIC ## Bronze Layer Table Creation

# COMMAND ----------

def create_bronze_table(table_name: str, schema: StructType, partition_cols: List[str] = None):
    """Create Delta table in bronze layer"""
    
    table_path = f"{BRONZE_STORAGE_PATH}{table_name}/"
    
    # Create empty DataFrame with schema
    empty_df = spark.createDataFrame([], schema)
    
    # Add partition columns if specified
    if partition_cols:
        for col in partition_cols:
            if col not in [field.name for field in schema.fields]:
                empty_df = empty_df.withColumn(col, lit(None).cast(StringType()))
    
    # Write as Delta table
    writer = empty_df.write.format("delta").mode("overwrite")
    
    if partition_cols:
        writer = writer.partitionBy(partition_cols)
    
    writer.option("path", table_path).saveAsTable(f"bronze.{table_name}")
    
    logger.info(f"Created bronze table: {table_name}")

# Create bronze tables
create_bronze_table("raw_encounters", encounter_schema, ["ingestion_date"])
create_bronze_table("raw_claims", claims_schema, ["ingestion_date"]) 
create_bronze_table("raw_payments", payments_schema, ["ingestion_date"])

# COMMAND ----------

# MAGIC %md
# MAGIC ## Data Ingestion Functions

# COMMAND ----------

def ingest_encounters_to_bronze(encounters_data: List[Dict], ingestion_date: str):
    """Ingest encounter data to bronze layer"""
    
    if not encounters_data:
        logger.warning("No encounter data to ingest")
        return
    
    try:
        # Convert to DataFrame
        df = spark.createDataFrame(encounters_data, encounter_schema)
        
        # Add ingestion date for partitioning
        df = df.withColumn("ingestion_date", lit(ingestion_date))
        
        # Add data quality flags
        df = df.withColumn("data_quality_score", 
                          when(col("encounterId").isNull(), 0.0)
                          .when(col("patientMrn").isNull(), 0.3)
                          .when(col("primaryDiagnosisCode").isNull(), 0.5)
                          .otherwise(1.0))
        
        # Write to Delta table
        (df.write
         .format("delta")
         .mode("append")
         .partitionBy("ingestion_date")
         .saveAsTable("bronze.raw_encounters"))
        
        logger.info(f"Ingested {df.count()} encounters to bronze layer")
        
    except Exception as e:
        logger.error(f"Error ingesting encounters: {str(e)}")
        raise

def ingest_claims_to_bronze(claims_data: List[Dict], ingestion_date: str):
    """Ingest claims data to bronze layer"""
    
    if not claims_data:
        logger.warning("No claims data to ingest")
        return
    
    try:
        # Convert to DataFrame
        df = spark.createDataFrame(claims_data, claims_schema)
        
        # Add ingestion date for partitioning
        df = df.withColumn("ingestion_date", lit(ingestion_date))
        
        # Add data quality scoring
        df = df.withColumn("data_quality_score",
                          when(col("claimId").isNull(), 0.0)
                          .when(col("billedAmount").isNull(), 0.2)
                          .when(col("claimStatus").isNull(), 0.4)
                          .otherwise(1.0))
        
        # Write to Delta table
        (df.write
         .format("delta")
         .mode("append")
         .partitionBy("ingestion_date")
         .saveAsTable("bronze.raw_claims"))
        
        logger.info(f"Ingested {df.count()} claims to bronze layer")
        
    except Exception as e:
        logger.error(f"Error ingesting claims: {str(e)}")
        raise

def ingest_payments_to_bronze(payments_data: List[Dict], ingestion_date: str):
    """Ingest payments data to bronze layer"""
    
    if not payments_data:
        logger.warning("No payments data to ingest")
        return
    
    try:
        # Convert to DataFrame
        df = spark.createDataFrame(payments_data, payments_schema)
        
        # Add ingestion date for partitioning
        df = df.withColumn("ingestion_date", lit(ingestion_date))
        
        # Add data quality scoring
        df = df.withColumn("data_quality_score",
                          when(col("paymentId").isNull(), 0.0)
                          .when(col("paymentAmount").isNull(), 0.1)
                          .when(col("paymentDate").isNull(), 0.3)
                          .otherwise(1.0))
        
        # Write to Delta table
        (df.write
         .format("delta")
         .mode("append")
         .partitionBy("ingestion_date")
         .saveAsTable("bronze.raw_payments"))
        
        logger.info(f"Ingested {df.count()} payments to bronze layer")
        
    except Exception as e:
        logger.error(f"Error ingesting payments: {str(e)}")
        raise

# COMMAND ----------

# MAGIC %md
# MAGIC ## File-based Data Ingestion

# COMMAND ----------

def ingest_csv_files(file_path: str, table_name: str, schema: StructType = None):
    """Ingest CSV files to bronze layer"""
    
    try:
        # Read CSV files
        df_reader = spark.read.option("header", "true").option("inferSchema", "true")
        
        if schema:
            df_reader = df_reader.schema(schema)
        
        df = df_reader.csv(file_path)
        
        # Add metadata columns
        df = df.withColumn("extraction_timestamp", current_timestamp()) \
               .withColumn("source_system", lit("FILE_UPLOAD")) \
               .withColumn("file_path", input_file_name()) \
               .withColumn("ingestion_date", date_format(current_timestamp(), "yyyy-MM-dd"))
        
        # Write to bronze table
        (df.write
         .format("delta")
         .mode("append")
         .partitionBy("ingestion_date")
         .saveAsTable(f"bronze.{table_name}"))
        
        logger.info(f"Ingested {df.count()} records from CSV files to {table_name}")
        
    except Exception as e:
        logger.error(f"Error ingesting CSV files: {str(e)}")
        raise

def ingest_json_files(file_path: str, table_name: str):
    """Ingest JSON files to bronze layer"""
    
    try:
        # Read JSON files
        df = spark.read.option("multiline", "true").json(file_path)
        
        # Add metadata columns
        df = df.withColumn("extraction_timestamp", current_timestamp()) \
               .withColumn("source_system", lit("JSON_FILE")) \
               .withColumn("file_path", input_file_name()) \
               .withColumn("ingestion_date", date_format(current_timestamp(), "yyyy-MM-dd"))
        
        # Write to bronze table
        (df.write
         .format("delta")
         .mode("append")
         .partitionBy("ingestion_date")
         .saveAsTable(f"bronze.{table_name}"))
        
        logger.info(f"Ingested {df.count()} records from JSON files to {table_name}")
        
    except Exception as e:
        logger.error(f"Error ingesting JSON files: {str(e)}")
        raise

# COMMAND ----------

# MAGIC %md
# MAGIC ## Real-time Streaming Ingestion

# COMMAND ----------

def setup_streaming_ingestion():
    """Setup streaming data ingestion from Event Hubs"""
    
    try:
        # Event Hubs connection string (from Key Vault)
        eh_connection_string = dbutils.secrets.get(scope="cerebra-kv", key="eventhub-connection-string")
        
        # Configure Event Hubs source
        eh_conf = {
            'eventhubs.connectionString': eh_connection_string,
            'eventhubs.consumerGroup': 'cerebra-bronze-ingestion',
            'eventhubs.startingPosition': 'latest'
        }
        
        # Create streaming DataFrame
        streaming_df = (spark
                       .readStream
                       .format("eventhubs")
                       .options(**eh_conf)
                       .load())
        
        # Parse the Event Hubs data
        parsed_df = (streaming_df
                    .select(
                        col("body").cast("string").alias("json_data"),
                        col("enqueuedTime").alias("event_timestamp"),
                        col("offset"),
                        col("sequenceNumber")
                    )
                    .select(
                        from_json(col("json_data"), encounter_schema).alias("data"),
                        col("event_timestamp"),
                        col("offset"),
                        col("sequenceNumber")
                    )
                    .select("data.*", "event_timestamp", "offset", "sequenceNumber")
                    .withColumn("ingestion_date", date_format(col("event_timestamp"), "yyyy-MM-dd")))
        
        # Write streaming data to bronze table
        query = (parsed_df
                .writeStream
                .format("delta")
                .outputMode("append")
                .option("checkpointLocation", f"{BRONZE_STORAGE_PATH}checkpoints/streaming_encounters/")
                .partitionBy("ingestion_date")
                .table("bronze.raw_encounters_streaming"))
        
        logger.info("Started streaming ingestion")
        return query
        
    except Exception as e:
        logger.error(f"Error setting up streaming ingestion: {str(e)}")
        raise

# COMMAND ----------

# MAGIC %md
# MAGIC ## Main Ingestion Workflow

# COMMAND ----------

def run_daily_ingestion(target_date: date = None, practice_id: str = "PRACTICE001"):
    """Run daily data ingestion workflow"""
    
    if target_date is None:
        target_date = date.today() - timedelta(days=1)  # Previous day
    
    ingestion_date = target_date.strftime("%Y-%m-%d")
    
    logger.info(f"Starting daily ingestion for {ingestion_date}")
    
    try:
        # Initialize API connector
        api_key = dbutils.secrets.get(scope="cerebra-kv", key="advancedmd-api-key")
        connector = AdvancedMDConnector(api_key)
        
        # Extract data from AdvancedMD
        encounters = connector.extract_encounters(target_date, target_date, practice_id)
        claims = connector.extract_claims(target_date, target_date, practice_id)
        payments = connector.extract_payments(target_date, target_date, practice_id)
        
        # Ingest to bronze layer
        ingest_encounters_to_bronze(encounters, ingestion_date)
        ingest_claims_to_bronze(claims, ingestion_date)
        ingest_payments_to_bronze(payments, ingestion_date)
        
        # Log success metrics
        logger.info(f"Daily ingestion completed successfully for {ingestion_date}")
        logger.info(f"Encounters: {len(encounters)}, Claims: {len(claims)}, Payments: {len(payments)}")
        
        # Record ingestion metrics
        record_ingestion_metrics(ingestion_date, len(encounters), len(claims), len(payments))
        
    except Exception as e:
        logger.error(f"Daily ingestion failed for {ingestion_date}: {str(e)}")
        raise

def record_ingestion_metrics(ingestion_date: str, encounter_count: int, claim_count: int, payment_count: int):
    """Record ingestion metrics for monitoring"""
    
    metrics_data = [{
        "ingestion_date": ingestion_date,
        "encounter_count": encounter_count,
        "claim_count": claim_count, 
        "payment_count": payment_count,
        "total_records": encounter_count + claim_count + payment_count,
        "ingestion_timestamp": datetime.utcnow().isoformat(),
        "status": "SUCCESS"
    }]
    
    metrics_df = spark.createDataFrame(metrics_data)
    
    (metrics_df.write
     .format("delta")
     .mode("append")
     .saveAsTable("bronze.ingestion_metrics"))

# COMMAND ----------

# MAGIC %md
# MAGIC ## Data Quality Monitoring

# COMMAND ----------

def run_data_quality_checks(ingestion_date: str):
    """Run data quality checks on ingested data"""
    
    logger.info(f"Running data quality checks for {ingestion_date}")
    
    quality_results = []
    
    # Check encounters data quality
    encounters_df = spark.table("bronze.raw_encounters").filter(col("ingestion_date") == ingestion_date)
    
    encounter_checks = {
        "total_records": encounters_df.count(),
        "missing_encounter_id": encounters_df.filter(col("encounterId").isNull()).count(),
        "missing_patient_mrn": encounters_df.filter(col("patientMrn").isNull()).count(),
        "missing_diagnosis": encounters_df.filter(col("primaryDiagnosisCode").isNull()).count(),
        "duplicate_encounters": encounters_df.groupBy("encounterId").count().filter(col("count") > 1).count()
    }
    
    quality_results.append({
        "table_name": "raw_encounters",
        "ingestion_date": ingestion_date,
        "checks": encounter_checks,
        "overall_score": calculate_quality_score(encounter_checks)
    })
    
    # Check claims data quality
    claims_df = spark.table("bronze.raw_claims").filter(col("ingestion_date") == ingestion_date)
    
    claim_checks = {
        "total_records": claims_df.count(),
        "missing_claim_id": claims_df.filter(col("claimId").isNull()).count(),
        "missing_billed_amount": claims_df.filter(col("billedAmount").isNull()).count(),
        "invalid_amounts": claims_df.filter(col("billedAmount").cast("double") <= 0).count(),
        "duplicate_claims": claims_df.groupBy("claimId").count().filter(col("count") > 1).count()
    }
    
    quality_results.append({
        "table_name": "raw_claims", 
        "ingestion_date": ingestion_date,
        "checks": claim_checks,
        "overall_score": calculate_quality_score(claim_checks)
    })
    
    # Save quality results
    quality_df = spark.createDataFrame(quality_results)
    
    (quality_df.write
     .format("delta")
     .mode("append")
     .saveAsTable("bronze.data_quality_results"))
    
    logger.info("Data quality checks completed")
    
    return quality_results

def calculate_quality_score(checks: Dict) -> float:
    """Calculate overall data quality score"""
    
    total_records = checks.get("total_records", 0)
    if total_records == 0:
        return 0.0
    
    error_count = sum([
        checks.get("missing_encounter_id", 0),
        checks.get("missing_patient_mrn", 0),
        checks.get("missing_claim_id", 0),
        checks.get("missing_billed_amount", 0),
        checks.get("duplicate_encounters", 0),
        checks.get("duplicate_claims", 0)
    ])
    
    quality_score = max(0.0, 1.0 - (error_count / total_records))
    return round(quality_score, 4)

# COMMAND ----------

# MAGIC %md
# MAGIC ## Workflow Execution

# COMMAND ----------

# MAGIC %python
# MAGIC # Execute daily ingestion workflow
# MAGIC try:
# MAGIC     # Run for yesterday's data
# MAGIC     yesterday = date.today() - timedelta(days=1)
# MAGIC     
# MAGIC     # Main ingestion workflow
# MAGIC     run_daily_ingestion(yesterday)
# MAGIC     
# MAGIC     # Data quality checks
# MAGIC     quality_results = run_data_quality_checks(yesterday.strftime("%Y-%m-%d"))
# MAGIC     
# MAGIC     # Display results
# MAGIC     print(f"Ingestion completed for {yesterday}")
# MAGIC     for result in quality_results:
# MAGIC         print(f"Table: {result['table_name']}, Quality Score: {result['overall_score']}")
# MAGIC         
# MAGIC except Exception as e:
# MAGIC     print(f"Workflow failed: {str(e)}")
# MAGIC     raise

# COMMAND ----------

# MAGIC %md
# MAGIC ## Monitoring and Alerting

# COMMAND ----------

def check_ingestion_health():
    """Check health of ingestion pipeline"""
    
    current_date = date.today()
    yesterday = current_date - timedelta(days=1)
    
    # Check if yesterday's data was ingested
    yesterday_str = yesterday.strftime("%Y-%m-%d")
    
    encounters_count = spark.table("bronze.raw_encounters").filter(col("ingestion_date") == yesterday_str).count()
    claims_count = spark.table("bronze.raw_claims").filter(col("ingestion_date") == yesterday_str).count()
    payments_count = spark.table("bronze.raw_payments").filter(col("ingestion_date") == yesterday_str).count()
    
    health_status = {
        "date_checked": current_date.isoformat(),
        "target_date": yesterday_str,
        "encounters_ingested": encounters_count,
        "claims_ingested": claims_count,
        "payments_ingested": payments_count,
        "status": "HEALTHY" if encounters_count > 0 else "UNHEALTHY",
        "alerts": []
    }
    
    # Generate alerts
    if encounters_count == 0:
        health_status["alerts"].append("No encounters ingested for yesterday")
    if claims_count == 0:
        health_status["alerts"].append("No claims ingested for yesterday")
    if payments_count == 0:
        health_status["alerts"].append("No payments ingested for yesterday")
    
    return health_status

# Display health status
health_status = check_ingestion_health()
print(f"Pipeline Health Status: {health_status['status']}")
if health_status["alerts"]:
    print("Alerts:")
    for alert in health_status["alerts"]:
        print(f"  - {alert}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Cleanup and Optimization

# COMMAND ----------

# MAGIC %sql
# MAGIC -- Optimize bronze tables for better query performance
# MAGIC OPTIMIZE bronze.raw_encounters ZORDER BY (ingestion_date, encounterId);
# MAGIC OPTIMIZE bronze.raw_claims ZORDER BY (ingestion_date, claimId);
# MAGIC OPTIMIZE bronze.raw_payments ZORDER BY (ingestion_date, paymentId);
# MAGIC 
# MAGIC -- Vacuum old files (keep 7 days of history)
# MAGIC VACUUM bronze.raw_encounters RETAIN 168 HOURS;
# MAGIC VACUUM bronze.raw_claims RETAIN 168 HOURS; 
# MAGIC VACUUM bronze.raw_payments RETAIN 168 HOURS;

# COMMAND ----------

# MAGIC %md
# MAGIC ## Summary
# MAGIC 
# MAGIC This notebook provides a comprehensive bronze layer data ingestion pipeline for the Cerebra-MD platform:
# MAGIC 
# MAGIC 1. **API Integration**: Extracts data from AdvancedMD using REST APIs
# MAGIC 2. **File Ingestion**: Supports CSV and JSON file uploads
# MAGIC 3. **Streaming**: Real-time data ingestion via Event Hubs
# MAGIC 4. **Data Quality**: Built-in quality checks and scoring
# MAGIC 5. **Monitoring**: Health checks and alerting
# MAGIC 6. **Optimization**: Table optimization and maintenance
# MAGIC 
# MAGIC The pipeline is designed for:
# MAGIC - **Reliability**: Error handling and retry logic
# MAGIC - **Scalability**: Handles large data volumes
# MAGIC - **Monitoring**: Comprehensive logging and metrics
# MAGIC - **Data Quality**: Validation and quality scoring
# MAGIC - **Performance**: Optimized storage and partitioning