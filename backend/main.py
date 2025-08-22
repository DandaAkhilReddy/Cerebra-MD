"""
Cerebra-MD Backend API
FastAPI application serving KPIs for HHA Medicine dashboard
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Cerebra-MD API",
    description="Analytics API for HHA Medicine healthcare dashboard",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.azurewebsites.net"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Cerebra-MD API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "service": "cerebra-md-api"
    }

@app.get("/v1/kpis/funnel")
async def get_funnel_kpis():
    """
    Get Encounter → Claim funnel KPIs
    Returns mock data for now
    """
    return {
        "data": [
            {
                "facility_id": 1,
                "facility_name": "HHA Main Hospital",
                "doctor_id": 101,
                "doctor_name": "Dr. Vamshi",
                "report_date": "2025-01-15",
                "encounters": 45,
                "submitted": 42,
                "accepted": 38,
                "denied": 4,
                "reworked": 2,
                "paid": 36,
                "submission_rate": 93.3,
                "fpy": 90.5,
                "denial_rate": 9.5,
                "rework_success": 50.0,
                "last_refresh_ts": datetime.utcnow().isoformat()
            }
        ]
    }

@app.get("/v1/kpis/denials")
async def get_denial_kpis():
    """
    Get denial analytics KPIs
    Returns mock data for now
    """
    return {
        "data": [
            {
                "report_period": "2025-01",
                "reason_code": "11",
                "reason_description": "The diagnosis is inconsistent with the procedure",
                "denial_count": 15,
                "denial_pct": 35.7,
                "is_avoidable": True
            },
            {
                "report_period": "2025-01", 
                "reason_code": "16",
                "reason_description": "Claim lacks information",
                "denial_count": 12,
                "denial_pct": 28.6,
                "is_avoidable": True
            }
        ]
    }

@app.get("/v1/kpis/cash")
async def get_cash_kpis():
    """
    Get cash realization and TAT KPIs
    Returns mock data for now
    """
    return {
        "data": [
            {
                "report_period": "2025-01-01",
                "facility_id": 1,
                "facility_name": "HHA Main Hospital",
                "payer_id": 200,
                "payer_name": "Medicare",
                "total_claim_amt": 125000.00,
                "total_payment_amt": 118500.00,
                "total_adjustment_amt": 3500.00,
                "cash_realization_pct": 94.8,
                "tat_p50_days": 28,
                "tat_p90_days": 45,
                "last_refresh_ts": datetime.utcnow().isoformat()
            }
        ]
    }

@app.get("/v1/kpis/ops") 
async def get_operational_kpis():
    """
    Get operational throughput KPIs
    Returns mock data for now
    """
    return {
        "data": [
            {
                "facility_id": 1,
                "facility_name": "HHA Main Hospital",
                "doctor_id": 101,
                "doctor_name": "Dr. Vamshi",
                "report_date": "2025-01-15",
                "encounters": 45,
                "avg_days_to_submit": 2.3,
                "pct_submitted_within_48h": 89.5,
                "encounters_per_day": 15.0,
                "productivity_score": 125.0,
                "last_refresh_ts": datetime.utcnow().isoformat()
            }
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )