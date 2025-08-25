# ⚙️ Backend API Server
## The Engine Behind Cerebra-MD Analytics

---

## What is This?

This folder contains the **backend server** - the invisible engine that:
- Processes all requests from the user interface
- Connects to databases and external systems
- Performs calculations and data analysis
- Ensures security and handles authentication
- Manages data flow between systems

Think of it as the "brain" that:
- Receives questions from the frontend
- Finds the answers in databases
- Performs complex calculations
- Sends results back to display

---

## 📁 Folder Structure

### 01-Source-Code/
**What it contains**: The main server application
- **main.py**: The central control program
- **app/**: Core application logic
- **core/**: Fundamental system functions
- **services/**: Business logic and data processing

### 02-Database-Models/
**What it contains**: Data structure definitions
- Patient information models
- Claims data structures
- User account definitions
- Relationship mappings

### 03-API-Endpoints/
**What it contains**: Communication interfaces
- Dashboard data endpoints
- Report generation endpoints
- User authentication endpoints
- Data export endpoints

### 04-Business-Logic/
**What it contains**: Healthcare-specific calculations
- Denial prediction algorithms
- Revenue forecasting models
- KPI calculation engines
- Workflow automation rules

### 05-Configuration/
**What it contains**: Settings and environment files
- requirements.txt: Required software libraries
- .env: Environment variables and secrets
- config files: System configuration

---

## 🏗️ System Architecture

```
Frontend Request → API Gateway → Backend Server → Database
     ↑                                              ↓
   User sees                                    Data stored
   results  ←────── Response Formatted ←────── Raw data
```

### Request Flow Example
1. **User clicks** "Show denial trends"
2. **Frontend sends** API request
3. **Backend receives** request
4. **Server queries** AdvancedMD database
5. **Database returns** raw claim data
6. **Server calculates** denial percentages
7. **Server formats** data for charts
8. **Frontend displays** denial trend graph

---

## 🔧 Technology Stack

### FastAPI Framework
- **What**: Modern Python web framework
- **Why**: Fast, reliable, automatically generates documentation
- **Benefits**: 
  - High performance (comparable to Node.js)
  - Automatic API documentation
  - Built-in security features

### Python 3.11
- **What**: Programming language
- **Why**: Excellent for data processing and healthcare
- **Benefits**:
  - Rich ecosystem of libraries
  - Easy to maintain and debug
  - Great for AI/ML integration

### Pydantic
- **What**: Data validation library
- **Why**: Ensures data quality and prevents errors
- **Benefits**:
  - Automatic data type checking
  - Clear error messages
  - JSON schema generation

### SQLAlchemy
- **What**: Database interaction toolkit
- **Why**: Secure and efficient database operations
- **Benefits**:
  - Prevents SQL injection attacks
  - Database-agnostic code
  - Advanced query capabilities

---

## 🚀 How It Works

### API Endpoints Overview

| Endpoint | Purpose | Example |
|----------|---------|---------|
| **GET /api/dashboard/kpis** | Main dashboard data | Total charges, denial rates |
| **GET /api/denials/trends** | Denial analytics | Monthly denial percentages |
| **GET /api/ar/aging** | AR aging buckets | 30/60/90 day aging |
| **POST /api/reports/generate** | Custom reports | User-defined report parameters |
| **GET /api/users/profile** | User information | Name, role, preferences |

### Real API Response Example
```json
{
  "total_charges": 2300000,
  "collection_rate": 0.96,
  "denial_rate": 0.082,
  "ar_days": 35,
  "timestamp": "2024-12-20T10:30:00Z",
  "period": "current_month"
}
```

---

## 🔒 Security Features

### Authentication
- **JWT Tokens**: Secure session management
- **Azure AD Integration**: Single sign-on capability
- **Role-based Access**: Different permissions by job function
- **Session Timeout**: Automatic logout after inactivity

### Data Protection
- **Encryption**: All data encrypted in transit and at rest
- **Input Validation**: Prevents malicious data injection
- **Rate Limiting**: Prevents system abuse
- **Audit Logging**: Tracks all data access

### HIPAA Compliance
- **PHI Protection**: Patient data never exposed in logs
- **Access Controls**: Minimum necessary access principle
- **Audit Trails**: Complete activity logging
- **Data Masking**: Sensitive data obscured in development

---

## 📊 Performance Specifications

### Response Times
| Operation | Target | Typical |
|-----------|--------|---------|
| **Dashboard Load** | <2 seconds | 800ms |
| **Report Generation** | <10 seconds | 3.2 seconds |
| **Data Export** | <30 seconds | 12 seconds |
| **User Authentication** | <500ms | 150ms |

### Capacity
- **Concurrent Users**: 100+
- **Requests/Second**: 1,000+
- **Database Queries**: 10,000/hour
- **Data Processing**: 1M+ records/hour

### Reliability
- **Uptime Target**: 99.9%
- **Error Rate**: <0.1%
- **Response Success**: >99.5%
- **Data Accuracy**: >99.9%

---

## 🔄 Data Processing Pipeline

### ETL Process (Extract, Transform, Load)

```
AdvancedMD → Extract → Clean → Transform → Load → Serve
    ↓           ↓        ↓        ↓        ↓      ↓
Raw Claims → Validate → Fix → Calculate → Store → Display
```

#### Step Details:
1. **Extract**: Pull data from AdvancedMD API
2. **Clean**: Remove duplicates, fix formatting
3. **Transform**: Calculate KPIs, create summaries
4. **Load**: Store in optimized database
5. **Serve**: Provide fast API responses

---

## 🧠 Business Logic Examples

### Denial Rate Calculation
```python
def calculate_denial_rate(claims):
    total_claims = len(claims)
    denied_claims = len([c for c in claims if c.status == 'denied'])
    denial_rate = denied_claims / total_claims
    return round(denial_rate * 100, 2)
```

### AR Days Calculation
```python
def calculate_ar_days(charges, payments):
    total_ar = sum([c.amount for c in charges if c.status == 'outstanding'])
    daily_charges = sum([c.amount for c in charges]) / 30
    ar_days = total_ar / daily_charges
    return round(ar_days, 1)
```

---

## 🌐 External Integrations

### AdvancedMD API
- **Connection**: Secure REST API
- **Data Types**: Claims, payments, patients, providers
- **Sync Frequency**: Real-time for critical data, hourly for bulk
- **Rate Limits**: 10 requests/second, 100,000 requests/day

### Azure Services
- **Key Vault**: Stores API keys and passwords
- **Monitor**: Tracks system performance
- **Storage**: Backup and archival
- **Active Directory**: User authentication

### Email/SMS Services
- **Purpose**: Alerts and notifications
- **Provider**: SendGrid/Twilio
- **Volume**: 1,000 messages/month
- **Types**: System alerts, report delivery

---

## 🚨 Monitoring & Alerts

### Health Checks
- **Endpoint**: GET /health
- **Frequency**: Every 30 seconds
- **Metrics**: CPU, memory, database connectivity
- **Response**: {"status": "healthy", "timestamp": "..."}

### Automated Alerts
| Condition | Action |
|-----------|--------|
| **API Response Time > 5s** | Email IT team |
| **Error Rate > 1%** | Page on-call engineer |
| **Database Connection Lost** | Immediate escalation |
| **Disk Space < 10%** | Warning notification |

---

## 🔧 Development & Maintenance

### Running the Server
```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
source .env

# Start development server
uvicorn main:app --reload --port 8000

# Server available at: http://localhost:8000
```

### API Documentation
- **Interactive Docs**: http://localhost:8000/docs
- **OpenAPI Spec**: http://localhost:8000/openapi.json
- **Alternative UI**: http://localhost:8000/redoc

### Testing
```bash
# Run unit tests
pytest tests/

# Run integration tests
pytest tests/integration/

# Run performance tests
pytest tests/performance/
```

---

## 📚 Key Files Explained

### main.py
- **Purpose**: Application entry point
- **Contains**: Server startup, route registration, middleware setup
- **Size**: ~200 lines
- **Critical**: Yes - controls entire application

### app/models.py
- **Purpose**: Data structure definitions
- **Contains**: Database table definitions, validation rules
- **Size**: ~500 lines
- **Critical**: Yes - defines all data formats

### services/data_processor.py
- **Purpose**: Business logic and calculations
- **Contains**: KPI calculations, data transformations
- **Size**: ~800 lines
- **Critical**: Yes - core business functionality

### requirements.txt
- **Purpose**: Lists all required software libraries
- **Contains**: Package names and versions
- **Size**: ~40 lines
- **Critical**: Yes - defines what software is needed

---

## 🆘 Troubleshooting

### Common Issues

| Problem | Symptom | Solution |
|---------|---------|----------|
| **Slow Response** | Pages load >5 seconds | Check database connections |
| **Authentication Error** | Login fails | Verify Azure AD configuration |
| **Data Missing** | Charts show no data | Check AdvancedMD API connection |
| **Server Won't Start** | Error on startup | Review environment variables |

### Log Locations
- **Application Logs**: /var/log/cerebra-md/app.log
- **Error Logs**: /var/log/cerebra-md/error.log
- **Access Logs**: /var/log/cerebra-md/access.log
- **Performance Logs**: Azure Monitor

---

## 📞 Support Contacts

### For Emergencies
- **Primary**: On-call engineer (555-0911)
- **Secondary**: IT Help Desk (555-1234)
- **Escalation**: Technical Lead (555-5678)

### For Development
- **Technical Lead**: Akhil Reddy Danda
- **DevOps**: Infrastructure team
- **Security**: Security team
- **Business**: Revenue cycle team

---

*This backend serves as the reliable, secure, high-performance engine powering all Cerebra-MD analytics and workflows.*

*Last Updated: December 2024*