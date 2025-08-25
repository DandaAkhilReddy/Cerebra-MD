# =============================================================================
# FastAPI Backend - Main Application Entry Point
# Cerebra-MD Healthcare Analytics Platform
# =============================================================================

from fastapi import FastAPI, Depends, HTTPException, Security, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import uvicorn
from datetime import datetime
from typing import Optional
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import routers
from api.routes.kpi_routes import router as kpi_router
from api.routes.auth_routes import router as auth_router
from api.routes.encounter_routes import router as encounters_router
from api.routes.claim_routes import router as claims_router
from api.routes.denial_routes import router as denials_router
from api.routes.provider_routes import router as providers_router
from api.routes.facility_routes import router as facilities_router
from api.routes.report_routes import router as reports_router

# Import core services
from core.database import DatabaseManager
from core.security import SecurityManager
from services.kpi_service import KPIService
from utils.logging_config import setup_logging

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

# Initialize security
security = HTTPBearer()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting Cerebra-MD API server...")
    
    # Initialize database connections
    try:
        db_manager = DatabaseManager()
        await db_manager.initialize()
        logger.info("Database connections initialized")
    except Exception as e:
        logger.error(f"Failed to initialize database: {str(e)}")
        raise
    
    # Initialize services
    try:
        kpi_service = KPIService()
        await kpi_service.initialize()
        logger.info("Services initialized")
    except Exception as e:
        logger.error(f"Failed to initialize services: {str(e)}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down Cerebra-MD API server...")
    
    # Cleanup database connections
    try:
        await db_manager.cleanup()
        logger.info("Database connections closed")
    except Exception as e:
        logger.error(f"Error during database cleanup: {str(e)}")

# Initialize FastAPI application
app = FastAPI(
    title="Cerebra-MD Healthcare Analytics API",
    description="""
    **Cerebra-MD** is a comprehensive healthcare analytics platform that provides:
    
    * **Financial KPIs** - Revenue, collection rates, and financial performance metrics
    * **Denial Analytics** - Root cause analysis and denial management
    * **Provider Performance** - Individual provider productivity and quality metrics
    * **AR Management** - Accounts receivable aging and collection analytics
    * **Patient Analytics** - Visit patterns and patient engagement insights
    * **Real-time Dashboards** - Interactive analytics and reporting
    
    The API provides secure access to healthcare data with HIPAA compliance,
    role-based access control, and comprehensive audit logging.
    """,
    version="1.0.0",
    contact={
        "name": "Cerebra-MD Support",
        "email": "support@cerebra-md.com",
    },
    license_info={
        "name": "Proprietary",
        "url": "https://cerebra-md.com/license",
    },
    servers=[
        {
            "url": os.getenv("API_BASE_URL", "https://api.cerebra-md.com"),
            "description": "Production server"
        },
        {
            "url": "https://staging-api.cerebra-md.com",
            "description": "Staging server"
        },
        {
            "url": "http://localhost:8000",
            "description": "Development server"
        }
    ],
    lifespan=lifespan
)

# Security middleware
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=os.getenv("ALLOWED_HOSTS", "*").split(",")
)

# CORS middleware - configure for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Authentication dependency
async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    """Validate JWT token and return current user"""
    try:
        security_manager = SecurityManager()
        token = credentials.credentials
        user = await security_manager.validate_token(token)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for unhandled errors"""
    logger.error(f"Unhandled error in {request.url}: {str(exc)}", exc_info=True)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred. Please try again later.",
            "timestamp": datetime.utcnow().isoformat(),
            "path": str(request.url)
        }
    )

# HTTP exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions with proper logging"""
    logger.warning(f"HTTP {exc.status_code} error in {request.url}: {exc.detail}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "timestamp": datetime.utcnow().isoformat(),
            "path": str(request.url)
        }
    )

# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for monitoring"""
    try:
        # Check database connectivity
        db_manager = DatabaseManager()
        db_status = await db_manager.health_check()
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "services": {
                "database": db_status,
                "api": "healthy"
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "timestamp": datetime.utcnow().isoformat(),
                "error": str(e)
            }
        )

# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Welcome to Cerebra-MD Healthcare Analytics API",
        "version": "1.0.0",
        "documentation": "/docs",
        "health_check": "/health",
        "timestamp": datetime.utcnow().isoformat()
    }

# Include API routers with dependencies
app.include_router(
    auth_router,
    prefix="/api/v1/auth",
    tags=["Authentication"]
)

app.include_router(
    kpi_router,
    prefix="/api/v1/kpis",
    tags=["KPIs"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    encounters_router,
    prefix="/api/v1/encounters",
    tags=["Encounters"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    claims_router,
    prefix="/api/v1/claims",
    tags=["Claims"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    denials_router,
    prefix="/api/v1/denials",
    tags=["Denials"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    providers_router,
    prefix="/api/v1/providers",
    tags=["Providers"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    facilities_router,
    prefix="/api/v1/facilities",
    tags=["Facilities"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    reports_router,
    prefix="/api/v1/reports",
    tags=["Reports"],
    dependencies=[Depends(get_current_user)]
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )