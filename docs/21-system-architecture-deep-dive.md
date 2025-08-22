# System Architecture Deep Dive - Cerebra-MD Platform

## Overview
Comprehensive technical architecture documentation for the Cerebra-MD healthcare analytics platform, detailing all system components, data flows, integration patterns, and scalability considerations.

## High-Level Architecture

### System Overview
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AdvancedMD    │────│   Azure Data     │────│   Cerebra-MD    │
│   EHR/PM        │    │   Platform       │    │   Dashboard     │
│                 │    │                  │    │                 │
│ • Patient Data  │    │ • Data Lake      │    │ • React UI      │
│ • Claims        │    │ • Databricks     │    │ • Analytics     │
│ • Billing       │    │ • SQL Database   │    │ • Reports       │
│ • Providers     │    │ • FastAPI        │    │ • Alerts        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Architecture Principles
1. **Cloud-First**: Fully cloud-native Azure architecture
2. **Microservices**: Loosely coupled, independently deployable services
3. **Event-Driven**: Asynchronous processing for scalability
4. **Security by Design**: Multi-layer security controls
5. **Data-Centric**: Modern data lake and analytics architecture
6. **HIPAA Compliant**: Healthcare data protection standards
7. **Cost-Optimized**: Right-sized resources with auto-scaling

## Data Architecture

### Medallion Architecture (Bronze-Silver-Gold)

#### Bronze Layer (Raw Data)
```
Purpose: Landing zone for raw data from source systems
Storage: Azure Data Lake Storage Gen2
Format: Parquet files with schema evolution
Retention: 7 years for compliance
```

**Data Sources**:
- AdvancedMD EHR via REST API
- AdvancedMD Practice Management via ODBC
- External payer data feeds
- Manual data uploads (CSV files)

**Data Structure**:
```
/bronze/
├── advancedmd/
│   ├── patients/
│   │   ├── year=2024/month=01/day=15/
│   │   └── patients_20240115_batch001.parquet
│   ├── encounters/
│   ├── claims/
│   └── providers/
├── external/
│   ├── payer_data/
│   └── reference_data/
└── manual/
    └── uploads/
```

#### Silver Layer (Cleansed Data)
```
Purpose: Standardized, validated, business-ready data
Storage: Delta Lake tables with versioning
Quality: Great Expectations validation rules
Governance: Unity Catalog metadata management
```

**Data Transformations**:
- Data type standardization
- Duplicate removal and deduplication logic
- Business rule application
- Reference data joins
- Data quality scoring

**Delta Tables**:
```sql
-- Example silver table structure
CREATE TABLE silver.encounters (
    encounter_id STRING,
    patient_id STRING,
    provider_id STRING,
    facility_id STRING,
    encounter_date DATE,
    procedure_codes ARRAY<STRING>,
    diagnosis_codes ARRAY<STRING>,
    charge_amount DECIMAL(10,2),
    data_quality_score DOUBLE,
    created_timestamp TIMESTAMP,
    updated_timestamp TIMESTAMP
) USING DELTA
PARTITIONED BY (encounter_date)
```

#### Gold Layer (Business Analytics)
```
Purpose: Aggregated KPIs and business metrics
Storage: Delta Lake with optimized query performance
Access: Direct connection to dashboard and reports
Refresh: Near real-time (15-minute intervals)
```

**Business Views**:
```sql
-- Revenue Cycle KPIs
CREATE VIEW gold.revenue_cycle_kpis AS
SELECT 
    month_year,
    facility_name,
    total_charges,
    total_collections,
    net_collection_rate,
    days_in_ar,
    denial_rate,
    first_pass_success_rate
FROM gold.monthly_financial_summary;

-- Physician Performance Metrics
CREATE VIEW gold.physician_performance AS
SELECT 
    provider_id,
    provider_name,
    specialty,
    encounters_per_day,
    revenue_per_rvu,
    documentation_score,
    patient_satisfaction_score
FROM gold.provider_productivity;
```

### Data Integration Patterns

#### Real-Time Streaming
```python
# Azure Service Bus for real-time events
from azure.servicebus import ServiceBusClient

def process_realtime_claims(message):
    """Process real-time claim updates"""
    claim_data = json.loads(message.body)
    
    # Immediate processing for critical updates
    if claim_data['event_type'] == 'denial':
        trigger_denial_workflow(claim_data)
    
    # Stream to Delta Live Tables
    delta_writer.write_stream(claim_data)
```

#### Batch Processing
```python
# Databricks jobs for daily/hourly batch processing
def daily_etl_job():
    """Daily ETL processing pipeline"""
    
    # Extract from AdvancedMD API
    raw_data = extract_advancedmd_data(yesterday)
    
    # Transform and load to silver layer
    cleansed_data = cleanse_and_validate(raw_data)
    write_to_delta("silver.encounters", cleansed_data)
    
    # Aggregate to gold layer
    kpi_data = calculate_kpis(cleansed_data)
    write_to_delta("gold.daily_kpis", kpi_data)
```

## Application Architecture

### Frontend Layer

#### React Application Structure
```
src/
├── components/           # Reusable UI components
│   ├── Charts/          # Chart components (Recharts)
│   ├── Tables/          # Data grid components
│   ├── Filters/         # Filter and search components
│   └── Common/          # Shared UI elements
├── pages/               # Route-level components
│   ├── Dashboard.tsx    # Executive summary
│   ├── Denials.tsx      # Denial management
│   ├── AR.tsx          # AR management
│   └── Reports.tsx      # Custom reports
├── services/            # API integration
│   ├── api.ts          # Axios client configuration
│   ├── auth.ts         # Authentication service
│   └── websocket.ts    # Real-time updates
├── hooks/               # Custom React hooks
│   ├── useAuth.ts      # Authentication hook
│   ├── useWebSocket.ts # WebSocket connection
│   └── useLocalStorage.ts # Local storage utilities
├── utils/               # Utility functions
│   ├── formatters.ts   # Data formatting
│   ├── validators.ts   # Input validation
│   └── constants.ts    # Application constants
└── types/               # TypeScript definitions
    ├── api.ts          # API response types
    ├── dashboard.ts    # Dashboard data types
    └── user.ts         # User and auth types
```

#### State Management
```typescript
// React Query for server state management
import { useQuery, useMutation } from '@tanstack/react-query';

const useDashboardData = (filters: DashboardFilters) => {
  return useQuery({
    queryKey: ['dashboard', filters],
    queryFn: () => api.getDashboardKPIs(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 15 * 60 * 1000, // 15 minutes
  });
};
```

### Backend Layer

#### FastAPI Application Structure
```python
# Main application structure
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer

app = FastAPI(
    title="Cerebra-MD Analytics API",
    description="Healthcare Revenue Cycle Analytics API",
    version="1.0.0"
)

# Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://cerebra-md-dashboard.azurewebsites.net"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# API routes
@app.get("/v1/kpis/financial")
async def get_financial_kpis(
    start_date: date,
    end_date: date,
    facility_ids: List[str] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """Get financial KPIs for specified date range"""
    return await kpi_service.get_financial_metrics(
        start_date, end_date, facility_ids, current_user
    )
```

#### Service Layer Architecture
```python
# Business logic services
class RevenueAnalyticsService:
    def __init__(self, databricks_client: DatabricksClient):
        self.db = databricks_client
    
    async def calculate_denial_metrics(
        self, 
        filters: DenialFilters
    ) -> DenialMetrics:
        """Calculate denial-related KPIs"""
        
        query = f"""
        SELECT 
            COUNT(*) as total_denials,
            COUNT(*) * 100.0 / total_claims as denial_rate,
            AVG(days_to_resolution) as avg_resolution_days,
            SUM(denied_amount) as total_denied_amount
        FROM gold.denials_summary 
        WHERE denial_date BETWEEN '{filters.start_date}' 
        AND '{filters.end_date}'
        """
        
        result = await self.db.execute_query(query)
        return DenialMetrics.from_query_result(result)
```

### Security Architecture

#### Authentication & Authorization
```python
# Azure AD integration
from azure.identity import DefaultAzureCredential
from fastapi import HTTPException, Depends
import jwt

class AuthService:
    def __init__(self):
        self.credential = DefaultAzureCredential()
        self.tenant_id = os.getenv('AZURE_TENANT_ID')
    
    async def verify_token(self, token: str) -> User:
        """Verify Azure AD JWT token"""
        try:
            # Decode and verify JWT
            payload = jwt.decode(
                token, 
                key=self.get_public_key(),
                algorithms=['RS256'],
                audience=os.getenv('AZURE_CLIENT_ID')
            )
            
            return User.from_jwt_payload(payload)
        except jwt.InvalidTokenError:
            raise HTTPException(401, "Invalid authentication token")
```

#### Data Protection
```python
# HIPAA-compliant data handling
class DataProtectionService:
    def mask_phi(self, data: Dict) -> Dict:
        """Mask personally identifiable information"""
        protected_fields = [
            'patient_name', 'ssn', 'phone_number', 
            'address', 'email', 'date_of_birth'
        ]
        
        masked_data = data.copy()
        for field in protected_fields:
            if field in masked_data:
                masked_data[field] = self.apply_masking(masked_data[field])
        
        return masked_data
    
    def audit_data_access(self, user: User, resource: str, action: str):
        """Log all data access for HIPAA compliance"""
        audit_log = {
            'user_id': user.id,
            'username': user.username,
            'resource': resource,
            'action': action,
            'timestamp': datetime.utcnow(),
            'ip_address': request.remote_addr
        }
        
        self.audit_logger.info(json.dumps(audit_log))
```

## Infrastructure Architecture

### Azure Resource Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                     Azure Subscription                          │
├─────────────────────────────────────────────────────────────────┤
│  Resource Groups:                                               │
│  ├── cerebra-md-prod-rg     (Production Environment)           │
│  ├── cerebra-md-dev-rg      (Development Environment)          │
│  └── cerebra-md-dr-rg       (Disaster Recovery)                │
├─────────────────────────────────────────────────────────────────┤
│  Compute Resources:                                             │
│  ├── App Service Plan       (Premium P2V3, Auto-scaling)       │
│  ├── Container Apps         (Microservices hosting)            │
│  ├── Databricks Workspace   (Data processing)                  │
│  └── Function Apps          (Serverless functions)             │
├─────────────────────────────────────────────────────────────────┤
│  Storage Resources:                                             │
│  ├── Data Lake Storage Gen2 (Raw data, Delta tables)           │
│  ├── Blob Storage           (Static assets, backups)           │
│  ├── Azure SQL Database     (Application metadata)             │
│  └── CosmosDB               (Session storage, caching)         │
├─────────────────────────────────────────────────────────────────┤
│  Networking:                                                    │
│  ├── Virtual Network        (Network isolation)                │
│  ├── Application Gateway    (Load balancing, SSL termination)  │
│  ├── Traffic Manager        (Global load balancing)            │
│  └── Private Endpoints      (Secure connectivity)              │
├─────────────────────────────────────────────────────────────────┤
│  Security & Monitoring:                                         │
│  ├── Key Vault             (Secrets management)                │
│  ├── Security Center       (Threat detection)                 │
│  ├── Application Insights  (Application monitoring)           │
│  ├── Log Analytics         (Centralized logging)              │
│  └── Azure Monitor         (Metrics and alerting)             │
└─────────────────────────────────────────────────────────────────┘
```

### Network Architecture
```
Internet
    │
    ▼
┌─────────────────┐
│ Application     │
│ Gateway         │
│ (WAF enabled)   │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Virtual Network │
│ (10.0.0.0/16)   │
├─────────────────┤
│ Subnets:        │
│ • Web (10.0.1.0/24)     │
│ • App (10.0.2.0/24)     │
│ • Data (10.0.3.0/24)    │
│ • Management            │
│   (10.0.4.0/24)        │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Private         │
│ Endpoints       │
│ (Data access)   │
└─────────────────┘
```

### Scalability Architecture

#### Auto-Scaling Configuration
```yaml
# App Service auto-scaling rules
autoscale_settings:
  cpu_threshold:
    scale_out: 70%    # Scale out when CPU > 70%
    scale_in: 30%     # Scale in when CPU < 30%
  memory_threshold:
    scale_out: 80%    # Scale out when memory > 80%
    scale_in: 40%     # Scale in when memory < 40%
  instance_limits:
    minimum: 2        # Always keep 2 instances
    maximum: 10       # Never exceed 10 instances
    default: 3        # Start with 3 instances
```

#### Databricks Auto-Scaling
```python
# Databricks cluster configuration
cluster_config = {
    "cluster_name": "cerebra-etl-cluster",
    "spark_version": "13.3.x-scala2.12",
    "node_type_id": "Standard_DS4_v2",
    "driver_node_type_id": "Standard_DS4_v2",
    "autoscale": {
        "min_workers": 2,
        "max_workers": 8
    },
    "auto_termination_minutes": 60,
    "enable_elastic_disk": True
}
```

## Performance Architecture

### Caching Strategy
```python
# Multi-layer caching implementation
class CacheManager:
    def __init__(self):
        # Layer 1: In-memory cache (Redis)
        self.redis_client = redis.Redis(
            host='cerebra-cache.redis.cache.windows.net',
            port=6380,
            password=os.getenv('REDIS_PASSWORD'),
            ssl=True
        )
        
        # Layer 2: CDN cache for static assets
        self.cdn_client = CDNManagementClient(credential, subscription_id)
        
        # Layer 3: Database query cache
        self.query_cache = TTLCache(maxsize=1000, ttl=300)  # 5 minutes
    
    async def get_dashboard_data(self, user_id: str, filters: Dict):
        cache_key = f"dashboard:{user_id}:{hash(str(filters))}"
        
        # Check Redis cache first
        cached_data = await self.redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
        
        # Fallback to database query
        data = await self.query_database(filters)
        
        # Cache for future requests (5 minutes TTL)
        await self.redis_client.setex(
            cache_key, 
            300, 
            json.dumps(data, default=str)
        )
        
        return data
```

### Database Performance Optimization
```sql
-- Optimized queries with proper indexing
CREATE INDEX idx_encounters_date_provider 
ON silver.encounters (encounter_date, provider_id) 
INCLUDE (charge_amount, procedure_codes);

-- Partitioned tables for better query performance
CREATE TABLE gold.monthly_kpis (
    month_year DATE,
    facility_id STRING,
    total_revenue DECIMAL(12,2),
    collection_rate DECIMAL(5,2),
    denial_rate DECIMAL(5,2)
) 
USING DELTA
PARTITIONED BY (month_year);

-- Pre-aggregated materialized views
CREATE MATERIALIZED VIEW mv_daily_financial_summary AS
SELECT 
    DATE(encounter_date) as business_date,
    facility_id,
    SUM(charge_amount) as total_charges,
    SUM(payment_amount) as total_payments,
    COUNT(DISTINCT encounter_id) as total_encounters
FROM silver.encounters e
JOIN silver.payments p ON e.encounter_id = p.encounter_id
GROUP BY DATE(encounter_date), facility_id;
```

## Monitoring and Observability

### Application Performance Monitoring
```python
# Custom telemetry and monitoring
from opencensus.ext.azure.log_exporter import AzureLogHandler
from opencensus.ext.azure.trace_exporter import AzureExporter
from opencensus.trace.samplers import ProbabilitySampler
from opencensus.trace.tracer import Tracer

# Configure Application Insights
tracer = Tracer(
    exporter=AzureExporter(
        connection_string=os.getenv('APPLICATIONINSIGHTS_CONNECTION_STRING')
    ),
    sampler=ProbabilitySampler(1.0)
)

# Custom metrics collection
def track_kpi_calculation_time(kpi_type: str):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            
            with tracer.span(f"calculate_{kpi_type}_kpis") as span:
                span.add_annotation(f"Starting {kpi_type} KPI calculation")
                
                try:
                    result = await func(*args, **kwargs)
                    span.add_annotation(f"Completed {kpi_type} KPI calculation")
                    
                    # Track execution time
                    execution_time = time.time() - start_time
                    telemetry_client.track_metric(
                        f"{kpi_type}_calculation_time_seconds", 
                        execution_time
                    )
                    
                    return result
                    
                except Exception as e:
                    span.add_annotation(f"Error in {kpi_type} KPI calculation: {str(e)}")
                    telemetry_client.track_exception()
                    raise
                    
        return wrapper
    return decorator

@track_kpi_calculation_time("financial")
async def calculate_financial_kpis(filters: KPIFilters):
    """Calculate financial KPIs with performance tracking"""
    pass
```

### Health Check Implementation
```python
# Comprehensive health checks
from fastapi import status
from typing import Dict, Any

class HealthCheckService:
    async def check_system_health(self) -> Dict[str, Any]:
        """Comprehensive system health check"""
        health_status = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "checks": {}
        }
        
        # Database connectivity check
        health_status["checks"]["database"] = await self.check_database()
        
        # Databricks cluster health
        health_status["checks"]["databricks"] = await self.check_databricks()
        
        # External API connectivity
        health_status["checks"]["advancedmd_api"] = await self.check_advancedmd_api()
        
        # Cache service health
        health_status["checks"]["redis_cache"] = await self.check_redis()
        
        # Storage service health
        health_status["checks"]["storage"] = await self.check_storage()
        
        # Determine overall health
        failed_checks = [
            check for check, result in health_status["checks"].items() 
            if result["status"] != "healthy"
        ]
        
        if failed_checks:
            health_status["status"] = "degraded" if len(failed_checks) == 1 else "unhealthy"
            health_status["failed_checks"] = failed_checks
        
        return health_status
```

---

*System Architecture Deep Dive for Cerebra-MD Healthcare Analytics Platform*