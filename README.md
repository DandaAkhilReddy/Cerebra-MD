# Cerebra-MD — HHA Analytics Platform

🧠 **Vision**: Secure, scalable analytics platform for hospital inpatient revenue cycle:  
AdvancedMD → Databricks (Delta Lake) → React dashboards (Cerebra-MD UI)

## 📊 What We Track
- **Encounter → Claim Funnel** (submission rates, first-pass yield)
- **Denial Analytics** (by reason, payer, doctor, facility)  
- **Cash Realization & TAT** (payment speed, collection rates)
- **Operational Throughput** (encounters/day, submission timeliness)

## 🏗️ Architecture
```
AdvancedMD API/ODBC → Azure Storage → Databricks (Bronze→Silver→Gold) → React Dashboard → Users
```

## 📁 Repository Structure
```
/docs/           # Business requirements, architecture, KPI definitions
/frontend/       # React (Next.js) dashboard application  
/data/           # Databricks notebooks, ETL jobs, data quality
/backend/        # FastAPI backend service
/infra/          # Azure infrastructure as code (Bicep)
/.github/        # CI/CD workflows
```

## 👥 Team
- **Akhil Reddy Danda** (Manager/Architect, Frontend lead)
- **Shruti** (Data Engineer, Databricks)  
- **Dinesh** (Backend/Infrastructure, Azure)

## 🎯 Milestones (12 weeks)
1. **Foundations** (weeks 1-4): Access, lakehouse setup, app shell
2. **KPIs v1** (weeks 5-8): Funnel, Denials, Cash realization dashboards
3. **Hardening** (weeks 9-12): CI/CD, monitoring, UAT → Go-Live

## 🔧 Tech Stack
- **Cloud**: Azure (Entra ID, Key Vault, Storage, Monitor, Container Apps)
- **Data**: Databricks (Delta Lake, Jobs, Unity Catalog)  
- **Frontend**: React/Next.js, TypeScript, Tailwind CSS, Recharts
- **Backend**: FastAPI, Python 3.11, Databricks SQL Connector
- **DevOps**: GitHub Actions, Docker, Bicep

## 🔒 Security & Compliance
- HIPAA-compliant data handling
- PHI masking in gold layer (no patient identifiers in dashboards)
- Role-based access control (doctors see only their data)
- Audit logging for all data access

## 🚀 Quick Start
```bash
# Frontend development
cd frontend
npm install
npm run dev

# Backend development
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Data pipeline development  
# Open Databricks workspace and import notebooks from /data/notebooks/

# Infrastructure deployment
cd infra  
az deployment group create --resource-group cerebra-rg --template-file azure.bicep
```

## 📈 Success Metrics
- CFO uses dashboard weekly (≥90% adoption)
- Doctors receive monthly productivity insights (≥70% adoption)  
- Denial rates reduced by ≥10% in 6 months
- Finance reconciliation errors <1% variance

---
*Built with ❤️ by the HHA Medicine IT Team*