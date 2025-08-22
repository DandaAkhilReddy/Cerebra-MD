# Deployment Guide - Cerebra-MD Platform

## Overview
Complete deployment guide for Cerebra-MD healthcare analytics platform across development, staging, and production environments.

## Prerequisites

### Azure Resources Required
- **Azure Subscription** with Contributor access
- **Resource Group**: `cerebra-md-rg`
- **Azure Active Directory** tenant for authentication
- **GitHub Repository** access for CI/CD

### Local Development Setup
- **Node.js 18+** and npm 8+
- **Python 3.11+** with pip
- **Azure CLI** installed and authenticated
- **Git** configured with SSH keys
- **Docker Desktop** (optional for containerized development)

## Environment-Specific Deployments

### Development Environment

#### 1. Azure Resources
```bash
# Create resource group
az group create --name cerebra-md-dev-rg --location eastus2

# Deploy infrastructure
cd infra
az deployment group create \
  --resource-group cerebra-md-dev-rg \
  --template-file azure.bicep \
  --parameters environment=dev
```

#### 2. Backend Deployment
```bash
# Deploy FastAPI backend to Azure App Service
cd backend
az webapp up --name cerebra-api-dev --resource-group cerebra-md-dev-rg
```

#### 3. Frontend Deployment
```bash
# Build and deploy React frontend
cd ../
npm run build
az storage blob upload-batch --destination '$web' --source dist --account-name cerebradevstg
```

### Staging Environment

#### 1. Database Migration
```bash
# Run database migrations
python manage.py migrate --environment=staging
```

#### 2. Data Pipeline Setup
```bash
# Deploy Databricks notebooks
databricks workspace import_dir ./data/notebooks /CerebraMD/staging
```

### Production Environment

#### 1. Infrastructure Deployment
```bash
# Production infrastructure
az deployment group create \
  --resource-group cerebra-md-prod-rg \
  --template-file azure.bicep \
  --parameters environment=prod
```

#### 2. Security Configuration
```bash
# Configure Key Vault secrets
az keyvault secret set --vault-name cerebra-kv-prod --name "DatabaseConnectionString" --value "$DB_CONNECTION"
az keyvault secret set --vault-name cerebra-kv-prod --name "AdvancedMDApiKey" --value "$ADVMD_API_KEY"
```

## CI/CD Pipeline Configuration

### GitHub Actions Setup
1. Configure repository secrets:
   - `AZURE_CREDENTIALS`
   - `AZURE_SUBSCRIPTION_ID`
   - `AZURE_RESOURCE_GROUP`

### Automated Deployment Flow
```yaml
# Production deployment trigger
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```

## Database Setup

### Initial Schema Creation
```sql
-- Run initial database setup
CREATE SCHEMA cerebra_md;
CREATE USER cerebra_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON SCHEMA cerebra_md TO cerebra_user;
```

### Data Migration
```bash
# Run Databricks ETL jobs
databricks jobs run-now --job-id 123456
```

## Monitoring & Alerts Setup

### Application Insights Configuration
```bash
# Enable Application Insights
az monitor app-insights component create \
  --app cerebra-md-insights \
  --resource-group cerebra-md-prod-rg
```

### Alert Rules
- API response time > 2 seconds
- Error rate > 5%
- Database connection failures
- Databricks job failures

## Security Hardening

### Network Security
- Configure Azure Firewall rules
- Set up Virtual Network peering
- Enable DDoS protection

### Access Control
- Configure Azure AD authentication
- Set up role-based access control (RBAC)
- Enable multi-factor authentication

## Backup & Disaster Recovery

### Database Backup
- Automated daily backups
- Point-in-time recovery enabled
- Cross-region backup replication

### Application Backup
- Source code in GitHub
- Infrastructure as Code in repository
- Configuration management through Azure Key Vault

## Performance Optimization

### Frontend Optimization
- Enable Azure CDN
- Configure compression
- Implement caching strategies

### Backend Optimization
- Enable auto-scaling
- Configure connection pooling
- Set up Redis caching

## Troubleshooting Common Issues

### Deployment Failures
1. **Authentication Issues**: Verify Azure CLI login
2. **Resource Naming**: Check naming conventions
3. **Permissions**: Ensure adequate access rights

### Runtime Issues
1. **Database Connectivity**: Check connection strings
2. **API Timeouts**: Verify network security groups
3. **Memory Issues**: Monitor application performance

## Rollback Procedures

### Emergency Rollback
```bash
# Rollback to previous stable version
az webapp deployment slot swap --name cerebra-api-prod --resource-group cerebra-md-prod-rg --slot staging --target-slot production
```

### Database Rollback
```bash
# Point-in-time recovery
az sql db restore --resource-group cerebra-md-prod-rg --server cerebra-sql-prod --name cerebra-db --dest-name cerebra-db-rollback --time "2024-01-01T12:00:00"
```

## Post-Deployment Verification

### Health Checks
- API endpoint availability
- Database connectivity
- Frontend loading performance
- Data pipeline execution

### Smoke Tests
```bash
# Run automated smoke tests
npm run test:smoke
pytest tests/smoke/
```

## Maintenance Procedures

### Regular Updates
- Monthly security patches
- Quarterly dependency updates
- Bi-annual infrastructure reviews

### Performance Reviews
- Weekly performance monitoring
- Monthly cost optimization
- Quarterly capacity planning

---

*Deployment guide for Cerebra-MD Healthcare Analytics Platform*