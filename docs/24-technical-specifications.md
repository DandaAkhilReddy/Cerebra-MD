# Technical Specifications - Cerebra-MD Platform

## Overview
Comprehensive technical specifications for the Cerebra-MD healthcare revenue cycle analytics platform, including detailed technology stack, architecture patterns, coding standards, and implementation specifications.

## Technology Stack Specifications

### Frontend Technology Stack

#### Core Framework
```json
{
  "framework": "React 18.3.1",
  "build_tool": "Vite 5.4.5",
  "language": "TypeScript 5.5.4",
  "styling": "Material-UI 5.15.3",
  "state_management": "React Query (TanStack Query) 5.52.0",
  "routing": "React Router DOM 6.21.2",
  "charts": "Recharts 2.12.7",
  "date_handling": "date-fns 3.6.0",
  "http_client": "Axios 1.7.4"
}
```

#### Development Dependencies
```json
{
  "bundler": "Vite with ESBuild",
  "linting": "ESLint 8.57.0 with TypeScript plugin",
  "testing": "Vitest with React Testing Library",
  "type_checking": "TypeScript strict mode",
  "code_formatting": "Prettier 3.0+",
  "pre_commit": "Husky with lint-staged"
}
```

#### Browser Support Matrix
```yaml
supported_browsers:
  chrome: ">= 90"
  firefox: ">= 88" 
  safari: ">= 14"
  edge: ">= 90"
  mobile_safari: ">= 14"
  chrome_mobile: ">= 90"

unsupported:
  - "Internet Explorer (all versions)"
  - "Chrome < 90"
  - "Safari < 14"
```

### Backend Technology Stack

#### Core Framework
```python
# requirements.txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
python-multipart==0.0.6
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-dotenv==1.0.0

# Database drivers
asyncpg==0.29.0  # PostgreSQL async driver
databricks-sql-connector==3.0.0
redis==5.0.1

# Azure SDK
azure-identity==1.15.0
azure-keyvault-secrets==4.7.0
azure-storage-blob==12.19.0
azure-monitor-opentelemetry-exporter==1.0.0

# Data processing
pandas==2.1.3
numpy==1.25.2
great-expectations==0.18.0

# API documentation
fastapi-swagger-ui-dark==1.0.0
```

#### Python Configuration
```python
# Python version and configuration
PYTHON_VERSION = "3.11.6"
PYTHON_PATH = "/opt/python/3.11/bin/python"

# Virtual environment configuration
VENV_PATH = ".venv"
PIP_REQUIREMENTS = "requirements.txt"
DEV_REQUIREMENTS = "requirements-dev.txt"

# Code quality tools
FORMATTER = "black"
LINTER = "ruff" 
TYPE_CHECKER = "mypy"
IMPORT_SORTER = "isort"

# Testing framework
TEST_FRAMEWORK = "pytest"
COVERAGE_MINIMUM = 85
```

### Database Technology Stack

#### Primary Database (Azure SQL)
```sql
-- Database configuration
EDITION: Premium
SERVICE_TIER: P2 (250 DTUs)
MAX_SIZE: 500 GB
BACKUP_RETENTION: 7 days
GEO_REPLICATION: Enabled (West US 2)
ENCRYPTION: Transparent Data Encryption (TDE)
COLLATION: SQL_Latin1_General_CP1_CI_AS

-- Connection pool settings
MIN_POOL_SIZE: 10
MAX_POOL_SIZE: 100
CONNECTION_TIMEOUT: 30 seconds
COMMAND_TIMEOUT: 60 seconds
```

#### Analytics Database (Databricks)
```yaml
databricks_configuration:
  runtime_version: "13.3.x-scala2.12"
  cluster_type: "Standard"
  node_type: "Standard_DS4_v2"  # 8 cores, 28 GB RAM
  driver_node_type: "Standard_DS5_v2"  # 16 cores, 56 GB RAM
  
  auto_scaling:
    min_workers: 2
    max_workers: 8
    
  auto_termination: 60  # minutes
  
  spark_configuration:
    spark.sql.adaptive.enabled: "true"
    spark.sql.adaptive.coalescePartitions.enabled: "true" 
    spark.databricks.delta.optimizeWrite.enabled: "true"
    spark.databricks.delta.autoCompact.enabled: "true"
    spark.serializer: "org.apache.spark.serializer.KryoSerializer"
    spark.network.timeout: "800s"
```

#### Cache Layer (Redis)
```yaml
redis_configuration:
  tier: "Premium"
  capacity: "P1" # 6GB
  version: "6.0"
  persistence: "RDB"
  clustering: false
  
  settings:
    maxmemory-policy: "allkeys-lru"
    timeout: 300  # seconds
    tcp-keepalive: 60
    maxclients: 10000
```

## Architecture Specifications

### Microservices Architecture Pattern

#### Service Boundaries
```yaml
services:
  gateway_service:
    responsibility: "API Gateway, Authentication, Rate Limiting"
    technology: "Azure API Management"
    endpoints: ["/api/v1/*"]
    
  analytics_service:
    responsibility: "KPI Calculations, Report Generation"  
    technology: "FastAPI + Databricks"
    endpoints: ["/api/v1/kpis/*", "/api/v1/reports/*"]
    
  patient_service:
    responsibility: "Patient Data Management"
    technology: "FastAPI + Azure SQL"
    endpoints: ["/api/v1/patients/*"]
    
  billing_service:
    responsibility: "Claims, Denials, Payments"
    technology: "FastAPI + Azure SQL" 
    endpoints: ["/api/v1/claims/*", "/api/v1/denials/*"]
    
  notification_service:
    responsibility: "Alerts, Email, SMS"
    technology: "Azure Functions + Service Bus"
    endpoints: ["/api/v1/notifications/*"]
```

#### Inter-Service Communication
```python
# Service communication patterns
class ServiceCommunicationPattern:
    SYNC_HTTP = "HTTP/HTTPS REST API calls"
    ASYNC_MESSAGING = "Azure Service Bus queues/topics"
    EVENT_STREAMING = "Azure Event Hubs"
    
    patterns = {
        "analytics_to_billing": ASYNC_MESSAGING,
        "patient_to_billing": SYNC_HTTP, 
        "notification_triggers": EVENT_STREAMING,
        "report_generation": ASYNC_MESSAGING
    }

# Circuit breaker pattern implementation
from circuitbreaker import circuit

@circuit(failure_threshold=5, recovery_timeout=30)
async def call_external_service(service_url: str, payload: dict):
    """Call external service with circuit breaker pattern"""
    async with httpx.AsyncClient() as client:
        response = await client.post(service_url, json=payload)
        response.raise_for_status()
        return response.json()
```

### Data Flow Architecture

#### ETL Pipeline Specifications
```python
# Databricks ETL pipeline configuration
class ETLPipelineConfig:
    """ETL pipeline configuration and specifications"""
    
    # Bronze layer - raw data ingestion
    BRONZE_CONFIG = {
        "source_systems": ["AdvancedMD", "External APIs", "Manual Uploads"],
        "ingestion_frequency": "15 minutes",
        "file_format": "parquet",
        "compression": "snappy",
        "partitioning": ["year", "month", "day", "hour"],
        "retention_period": "7 years",
        "schema_evolution": True
    }
    
    # Silver layer - data cleansing and standardization
    SILVER_CONFIG = {
        "processing_frequency": "30 minutes",
        "data_quality_checks": "Great Expectations",
        "deduplication": True,
        "standardization_rules": "business_rules.json",
        "validation_threshold": 0.95,  # 95% data quality required
        "error_handling": "quarantine_and_alert"
    }
    
    # Gold layer - business metrics and KPIs
    GOLD_CONFIG = {
        "aggregation_frequency": "60 minutes",
        "kpi_calculations": "real_time",
        "materialized_views": True,
        "optimization": "z_order_clustering",
        "access_control": "unity_catalog",
        "performance_sla": "< 5 seconds query response"
    }

# Data lineage tracking
class DataLineageTracker:
    def track_transformation(
        self, 
        source_table: str, 
        target_table: str,
        transformation_logic: str,
        job_id: str
    ):
        lineage_record = {
            "transformation_id": str(uuid4()),
            "source_table": source_table,
            "target_table": target_table, 
            "transformation_logic": transformation_logic,
            "job_id": job_id,
            "timestamp": datetime.utcnow(),
            "status": "completed"
        }
        
        # Store in Unity Catalog metadata
        self.catalog.create_lineage_record(lineage_record)
```

### Security Architecture Specifications

#### Authentication & Authorization
```python
# Azure AD B2C configuration
AZURE_AD_CONFIG = {
    "tenant_id": "your-tenant-id",
    "client_id": "your-client-id", 
    "authority": "https://login.microsoftonline.com/your-tenant-id",
    "scopes": ["https://graph.microsoft.com/.default"],
    "redirect_uri": "https://cerebra-md-dashboard.azurewebsites.net/auth/callback"
}

# Role-based access control
class RBACConfiguration:
    ROLES = {
        "admin": {
            "permissions": ["read:all", "write:all", "delete:all", "admin:system"],
            "data_access": "all_facilities"
        },
        "finance_manager": {
            "permissions": ["read:financial", "write:financial", "export:reports"],
            "data_access": "assigned_facilities"
        },
        "physician": {
            "permissions": ["read:own_data", "read:patient_data"],
            "data_access": "own_patients_only"
        },
        "billing_specialist": {
            "permissions": ["read:billing", "write:billing", "process:claims"],
            "data_access": "assigned_facilities"
        }
    }

# JWT token configuration  
JWT_CONFIG = {
    "algorithm": "RS256",
    "expiration_time": 3600,  # 1 hour
    "refresh_expiration": 86400,  # 24 hours
    "issuer": "cerebra-md-api",
    "audience": "cerebra-md-dashboard"
}
```

#### Data Encryption Specifications
```python
# Encryption at rest configuration
ENCRYPTION_AT_REST = {
    "database": {
        "method": "Transparent Data Encryption (TDE)",
        "key_management": "Azure Key Vault",
        "algorithm": "AES-256"
    },
    "storage": {
        "method": "Storage Service Encryption (SSE)", 
        "key_management": "Customer-managed keys",
        "algorithm": "AES-256"
    },
    "databricks": {
        "method": "Customer-managed keys for DBFS",
        "key_management": "Azure Key Vault",
        "algorithm": "AES-256"
    }
}

# Encryption in transit configuration  
ENCRYPTION_IN_TRANSIT = {
    "api_communication": "TLS 1.3",
    "database_connections": "SSL/TLS enforced",
    "inter_service": "mTLS (mutual TLS)",
    "client_browser": "HTTPS only with HSTS"
}

# Field-level encryption for PHI
class PHIEncryption:
    def __init__(self):
        self.key_vault_client = SecretClient(
            vault_url="https://cerebra-kv.vault.azure.net/",
            credential=DefaultAzureCredential()
        )
        
    def encrypt_phi_field(self, value: str, field_type: str) -> str:
        """Encrypt PHI fields using deterministic encryption"""
        encryption_key = self.key_vault_client.get_secret(f"phi-{field_type}-key")
        
        # Use Fernet for symmetric encryption
        fernet = Fernet(encryption_key.value.encode())
        encrypted_value = fernet.encrypt(value.encode())
        
        return base64.b64encode(encrypted_value).decode()
    
    def decrypt_phi_field(self, encrypted_value: str, field_type: str) -> str:
        """Decrypt PHI fields"""
        encryption_key = self.key_vault_client.get_secret(f"phi-{field_type}-key")
        
        fernet = Fernet(encryption_key.value.encode()) 
        decrypted_bytes = fernet.decrypt(base64.b64decode(encrypted_value))
        
        return decrypted_bytes.decode()
```

### Performance Specifications

#### Response Time Requirements
```yaml
performance_requirements:
  api_endpoints:
    dashboard_kpis: "< 500ms (P95)"
    complex_reports: "< 2000ms (P95)"
    simple_queries: "< 200ms (P95)"
    export_generation: "< 30 seconds"
    
  frontend_performance:
    first_contentful_paint: "< 1.5 seconds"
    largest_contentful_paint: "< 2.5 seconds"
    time_to_interactive: "< 3 seconds"
    cumulative_layout_shift: "< 0.1"
    
  database_performance:
    simple_queries: "< 100ms"
    complex_analytics: "< 5 seconds"
    data_ingestion: "< 15 minutes for daily batch"
    backup_operations: "< 30 minutes"
```

#### Scalability Specifications
```yaml
scalability_targets:
  concurrent_users:
    normal_load: 100
    peak_load: 500
    maximum_supported: 1000
    
  data_volume:
    daily_ingestion: "5GB"
    monthly_growth: "150GB" 
    annual_retention: "7 years"
    total_capacity: "10TB+"
    
  transaction_volume:
    api_requests_per_second: 1000
    database_transactions_per_second: 500
    report_generations_per_hour: 100
```

## Coding Standards and Guidelines

### Python Coding Standards

#### Code Style Configuration
```python
# pyproject.toml
[tool.black]
line-length = 88
target-version = ['py311']
include = '\.pyi?$'
extend-exclude = '''
/(
  # directories
  \.eggs
  | \.git
  | \.tox
  | \.venv
  | build
  | dist
)/
'''

[tool.ruff]
target-version = "py311"
line-length = 88
select = [
    "E",  # pycodestyle errors
    "W",  # pycodestyle warnings
    "F",  # Pyflakes
    "I",  # isort
    "B",  # flake8-bugbear
    "C4", # flake8-comprehensions
    "UP", # pyupgrade
]

[tool.mypy]
python_version = "3.11"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
```

#### FastAPI Code Structure
```python
# Standard FastAPI application structure
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import List, Optional
import structlog

# Structured logging configuration
logger = structlog.get_logger(__name__)

# Application factory pattern
def create_app() -> FastAPI:
    """Create and configure FastAPI application"""
    
    app = FastAPI(
        title="Cerebra-MD Analytics API",
        description="Healthcare Revenue Cycle Analytics Platform",
        version="1.0.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json"
    )
    
    # Add middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["https://cerebra-md-dashboard.azurewebsites.net"],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["*"],
    )
    
    # Include routers
    app.include_router(auth_router, prefix="/api/v1/auth", tags=["authentication"])
    app.include_router(kpi_router, prefix="/api/v1/kpis", tags=["analytics"])
    app.include_router(reports_router, prefix="/api/v1/reports", tags=["reports"])
    
    return app

# Pydantic models with validation
class DashboardFilters(BaseModel):
    """Dashboard filter parameters with validation"""
    
    start_date: date = Field(..., description="Start date for analysis")
    end_date: date = Field(..., description="End date for analysis") 
    facility_ids: Optional[List[str]] = Field(default=[], description="Facility IDs to include")
    provider_ids: Optional[List[str]] = Field(default=[], description="Provider IDs to include")
    
    class Config:
        # Enable validation on assignment
        validate_assignment = True
        # JSON schema extra examples
        schema_extra = {
            "example": {
                "start_date": "2024-01-01",
                "end_date": "2024-01-31", 
                "facility_ids": ["FAC001", "FAC002"],
                "provider_ids": ["PROV001"]
            }
        }
    
    @validator('end_date')
    def end_date_must_be_after_start_date(cls, v, values):
        if 'start_date' in values and v <= values['start_date']:
            raise ValueError('end_date must be after start_date')
        return v

# Dependency injection pattern
class DatabaseDependency:
    """Database connection dependency"""
    
    def __init__(self):
        self.connection_pool = None
    
    async def get_connection(self):
        if not self.connection_pool:
            self.connection_pool = await asyncpg.create_pool(
                dsn=settings.database_url,
                min_size=10,
                max_size=100
            )
        
        async with self.connection_pool.acquire() as connection:
            yield connection

# Error handling with custom exceptions
class CerebraMDException(Exception):
    """Base exception for Cerebra-MD application"""
    
    def __init__(self, message: str, error_code: str = None):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)

class DataValidationError(CerebraMDException):
    """Raised when data validation fails"""
    pass

class InsufficientPermissionsError(CerebraMDException):
    """Raised when user lacks required permissions"""
    pass
```

### TypeScript/React Coding Standards

#### ESLint Configuration
```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "react-hooks/exhaustive-deps",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "ecmaFeatures": {
      "jsx": true
    }
  },
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

#### React Component Standards
```typescript
// Component structure standards
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

// Interface definitions
interface DashboardProps {
  facilityId: string;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  onDataUpdate?: (data: DashboardData) => void;
}

interface DashboardData {
  totalRevenue: number;
  collectionRate: number;
  denialRate: number;
  encounters: number;
}

// Component with TypeScript and proper patterns
const Dashboard: React.FC<DashboardProps> = ({ 
  facilityId, 
  dateRange, 
  onDataUpdate 
}) => {
  // State management
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['revenue', 'collections']);
  
  // Data fetching with React Query
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['dashboard', facilityId, dateRange],
    queryFn: () => apiService.getDashboardKPIs({
      facilityId,
      startDate: dateRange.startDate.toISOString().split('T')[0],
      endDate: dateRange.endDate.toISOString().split('T')[0]
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: Boolean(facilityId)
  });
  
  // Memoized calculations
  const processedData = useMemo(() => {
    if (!dashboardData) return null;
    
    return {
      ...dashboardData,
      netCollectionRate: dashboardData.collections / dashboardData.charges,
      denialImpact: dashboardData.denialAmount / dashboardData.charges
    };
  }, [dashboardData]);
  
  // Callback handlers
  const handleMetricSelection = useCallback((metrics: string[]) => {
    setSelectedMetrics(metrics);
  }, []);
  
  // Effect for data updates
  useEffect(() => {
    if (processedData && onDataUpdate) {
      onDataUpdate(processedData);
    }
  }, [processedData, onDataUpdate]);
  
  // Loading state
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Error state
  if (error) {
    return (
      <Alert severity="error" action={
        <Button onClick={() => refetch()}>Retry</Button>
      }>
        Failed to load dashboard data
      </Alert>
    );
  }
  
  // Main render
  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Revenue Cycle Dashboard
      </Typography>
      
      {processedData && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6} lg={3}>
            <MetricCard
              title="Total Revenue"
              value={processedData.totalRevenue}
              format="currency"
            />
          </Grid>
          {/* Additional metric cards */}
        </Grid>
      )}
    </Box>
  );
};

export default Dashboard;

// Custom hooks for reusable logic
export const useDashboardData = (facilityId: string, dateRange: DateRange) => {
  return useQuery({
    queryKey: ['dashboard', facilityId, dateRange],
    queryFn: () => apiService.getDashboardKPIs({ facilityId, ...dateRange }),
    enabled: Boolean(facilityId),
    staleTime: 5 * 60 * 1000
  });
};

// Type definitions
export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface MetricCardProps {
  title: string;
  value: number;
  format?: 'currency' | 'percentage' | 'number';
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
}
```

### SQL Coding Standards

#### SQL Style Guide
```sql
-- SQL formatting standards
-- 1. Keywords in UPPERCASE
-- 2. Table/column names in snake_case
-- 3. Consistent indentation (4 spaces)
-- 4. Comments for complex logic

-- Good example - Financial KPI calculation
SELECT 
    f.facility_name,
    DATE_TRUNC('month', e.encounter_date) AS report_month,
    
    -- Revenue metrics
    SUM(e.total_charges) AS total_charges,
    SUM(p.payment_amount) AS total_payments,
    
    -- Collection rate calculation
    ROUND(
        SUM(p.payment_amount) / NULLIF(SUM(e.total_charges), 0) * 100, 
        2
    ) AS net_collection_rate,
    
    -- Volume metrics
    COUNT(DISTINCT e.encounter_id) AS total_encounters,
    COUNT(DISTINCT e.patient_id) AS unique_patients,
    
    -- Performance metrics
    AVG(DATEDIFF(day, c.submission_date, p.payment_date)) AS avg_days_to_payment
    
FROM silver.encounters e
    INNER JOIN dbo.facilities f ON e.facility_id = f.facility_id
    LEFT JOIN silver.claims c ON e.encounter_id = c.encounter_id
    LEFT JOIN silver.payments p ON c.claim_id = p.claim_id
    
WHERE e.encounter_date >= DATE_SUB(CURRENT_DATE(), 365)  -- Last year
    AND e.encounter_status = 'COMPLETED'
    AND f.is_active = 1
    
GROUP BY 
    f.facility_name,
    DATE_TRUNC('month', e.encounter_date)
    
HAVING SUM(e.total_charges) > 1000  -- Minimum threshold
    
ORDER BY 
    f.facility_name,
    report_month DESC;

-- Stored procedure standards
CREATE OR REPLACE PROCEDURE calculate_provider_kpis(
    IN provider_id STRING,
    IN analysis_month DATE,
    OUT result_status STRING
)
LANGUAGE SQL
AS
$$
BEGIN
    -- Input validation
    IF provider_id IS NULL OR analysis_month IS NULL THEN
        SET result_status = 'ERROR: Missing required parameters';
        RETURN;
    END IF;
    
    -- Main calculation logic with error handling
    BEGIN
        INSERT INTO gold.provider_performance (
            analysis_month,
            provider_id,
            provider_name,
            total_encounters,
            total_revenue,
            collection_rate,
            created_timestamp
        )
        SELECT 
            analysis_month,
            p.provider_id,
            p.first_name || ' ' || p.last_name AS provider_name,
            COUNT(e.encounter_id) AS total_encounters,
            SUM(e.total_charges) AS total_revenue,
            SUM(pay.payment_amount) / NULLIF(SUM(e.total_charges), 0) AS collection_rate,
            CURRENT_TIMESTAMP()
        FROM dbo.providers p
            LEFT JOIN silver.encounters e ON p.provider_id = e.provider_id
                AND DATE_TRUNC('month', e.encounter_date) = analysis_month
            LEFT JOIN silver.claims c ON e.encounter_id = c.encounter_id
            LEFT JOIN silver.payments pay ON c.claim_id = pay.claim_id
        WHERE p.provider_id = provider_id
            AND p.employment_status = 'ACTIVE'
        GROUP BY p.provider_id, p.first_name, p.last_name;
        
        SET result_status = 'SUCCESS';
        
    EXCEPTION WHEN OTHERS THEN
        SET result_status = 'ERROR: ' || SQLERRM;
        -- Log error for debugging
        INSERT INTO system.error_log (
            procedure_name,
            error_message,
            parameters,
            error_timestamp
        ) VALUES (
            'calculate_provider_kpis',
            SQLERRM,
            JSON_OBJECT('provider_id', provider_id, 'analysis_month', analysis_month),
            CURRENT_TIMESTAMP()
        );
    END;
END;
$$;
```

## Integration Specifications

### AdvancedMD Integration
```python
# AdvancedMD API integration specifications
class AdvancedMDConnector:
    """AdvancedMD API connector with comprehensive error handling"""
    
    BASE_URL = "https://api.advancedmd.com/v1"
    API_VERSION = "v1"
    TIMEOUT = 30  # seconds
    
    def __init__(self, api_key: str, practice_id: str):
        self.api_key = api_key
        self.practice_id = practice_id
        self.session = httpx.AsyncClient(
            base_url=self.BASE_URL,
            timeout=self.TIMEOUT,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "CerebraMD/1.0"
            }
        )
    
    async def get_encounters(
        self, 
        start_date: date, 
        end_date: date,
        page_size: int = 1000
    ) -> List[Dict]:
        """Extract encounter data with pagination"""
        
        encounters = []
        page = 1
        
        while True:
            params = {
                "practiceId": self.practice_id,
                "startDate": start_date.isoformat(),
                "endDate": end_date.isoformat(),
                "pageSize": page_size,
                "page": page
            }
            
            try:
                response = await self.session.get("/encounters", params=params)
                response.raise_for_status()
                
                data = response.json()
                encounters.extend(data.get("encounters", []))
                
                # Check if more pages exist
                if not data.get("hasMore", False):
                    break
                    
                page += 1
                
            except httpx.HTTPError as e:
                logger.error(
                    "AdvancedMD API error",
                    error=str(e),
                    status_code=getattr(e.response, 'status_code', None)
                )
                raise
                
        return encounters
    
    async def get_claims(
        self,
        start_date: date,
        end_date: date
    ) -> List[Dict]:
        """Extract claims data"""
        # Similar implementation with error handling
        pass

# Data transformation specifications
class AdvancedMDTransformer:
    """Transform AdvancedMD data to Cerebra-MD format"""
    
    def transform_encounter(self, raw_encounter: Dict) -> Dict:
        """Transform encounter data with validation"""
        
        return {
            "encounter_id": raw_encounter["encounterId"],
            "patient_mrn": raw_encounter["patient"]["mrn"],
            "provider_npi": raw_encounter["provider"]["npi"],
            "facility_id": raw_encounter["facility"]["id"],
            "encounter_date": datetime.strptime(
                raw_encounter["encounterDate"], 
                "%Y-%m-%d"
            ).date(),
            "encounter_type": self.standardize_encounter_type(
                raw_encounter["encounterType"]
            ),
            "total_charges": Decimal(str(raw_encounter["totalCharges"])),
            "primary_diagnosis_code": raw_encounter["primaryDiagnosis"]["code"],
            "procedure_codes": [
                proc["code"] for proc in raw_encounter.get("procedures", [])
            ]
        }
```

### Azure Services Integration
```python
# Azure Key Vault integration
from azure.keyvault.secrets import SecretClient
from azure.identity import DefaultAzureCredential

class AzureKeyVaultService:
    """Azure Key Vault service for secrets management"""
    
    def __init__(self, vault_url: str):
        self.vault_url = vault_url
        self.credential = DefaultAzureCredential()
        self.client = SecretClient(
            vault_url=vault_url,
            credential=self.credential
        )
    
    async def get_secret(self, secret_name: str) -> str:
        """Retrieve secret from Key Vault"""
        try:
            secret = self.client.get_secret(secret_name)
            return secret.value
        except Exception as e:
            logger.error(f"Failed to retrieve secret {secret_name}: {e}")
            raise

# Azure Storage integration
from azure.storage.blob import BlobServiceClient

class AzureStorageService:
    """Azure Blob Storage service for file operations"""
    
    def __init__(self, connection_string: str):
        self.blob_service_client = BlobServiceClient.from_connection_string(
            connection_string
        )
    
    async def upload_file(
        self, 
        container_name: str, 
        blob_name: str, 
        data: bytes
    ) -> str:
        """Upload file to blob storage"""
        blob_client = self.blob_service_client.get_blob_client(
            container=container_name,
            blob=blob_name
        )
        
        blob_client.upload_blob(data, overwrite=True)
        return blob_client.url
```

---

*Complete Technical Specifications for Cerebra-MD Healthcare Analytics Platform*