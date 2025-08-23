# =============================================================================
# Database Connection Manager
# Cerebra-MD Healthcare Analytics Platform
# =============================================================================

import logging
import asyncio
from typing import Optional, Dict, Any, AsyncGenerator
from contextlib import asynccontextmanager
import os
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
import aiodns
from databricks import sql as databricks_sql
import pyodbc
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

logger = logging.getLogger(__name__)

class DatabaseManager:
    """Database connection manager for multiple data sources"""
    
    def __init__(self):
        self.sql_engine = None
        self.sql_async_engine = None
        self.databricks_connection = None
        self.session_factory = None
        self.async_session_factory = None
        self.key_vault_client = None
        
    async def initialize(self):
        """Initialize all database connections"""
        logger.info("Initializing database connections...")
        
        try:
            # Initialize Azure Key Vault client
            await self._init_key_vault()
            
            # Initialize SQL Server connection
            await self._init_sql_server()
            
            # Initialize Databricks connection
            await self._init_databricks()
            
            logger.info("All database connections initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize database connections: {str(e)}")
            raise
    
    async def _init_key_vault(self):
        """Initialize Azure Key Vault client"""
        try:
            key_vault_url = os.getenv("AZURE_KEY_VAULT_URL")
            if key_vault_url:
                credential = DefaultAzureCredential()
                self.key_vault_client = SecretClient(
                    vault_url=key_vault_url,
                    credential=credential
                )
                logger.info("Azure Key Vault client initialized")
            else:
                logger.warning("Azure Key Vault URL not configured")
        except Exception as e:
            logger.error(f"Failed to initialize Key Vault client: {str(e)}")
            raise
    
    async def _get_secret(self, secret_name: str) -> Optional[str]:
        """Get secret from Azure Key Vault"""
        try:
            if self.key_vault_client:
                secret = self.key_vault_client.get_secret(secret_name)
                return secret.value
            else:
                # Fallback to environment variables for development
                return os.getenv(secret_name.upper().replace("-", "_"))
        except Exception as e:
            logger.error(f"Failed to get secret {secret_name}: {str(e)}")
            return None
    
    async def _init_sql_server(self):
        """Initialize SQL Server database connection"""
        try:
            # Get connection details from Key Vault or environment
            sql_server = await self._get_secret("sql-server-host") or os.getenv("SQL_SERVER_HOST")
            sql_database = await self._get_secret("sql-database") or os.getenv("SQL_DATABASE", "CerebraMD")
            sql_username = await self._get_secret("sql-username") or os.getenv("SQL_USERNAME")
            sql_password = await self._get_secret("sql-password") or os.getenv("SQL_PASSWORD")
            
            if not all([sql_server, sql_database]):
                logger.warning("SQL Server configuration incomplete, using in-memory SQLite")
                # Fallback to SQLite for development
                sync_url = "sqlite:///:memory:"
                async_url = "sqlite+aiosqlite:///:memory:"
            else:
                # Build connection strings
                driver = "ODBC Driver 17 for SQL Server"
                sync_url = (
                    f"mssql+pyodbc://{sql_username}:{sql_password}@{sql_server}"
                    f"/{sql_database}?driver={driver.replace(' ', '+')}"
                    f"&Encrypt=yes&TrustServerCertificate=no&Connection+Timeout=30"
                )
                async_url = (
                    f"mssql+aioodbc://{sql_username}:{sql_password}@{sql_server}"
                    f"/{sql_database}?driver={driver.replace(' ', '+')}"
                    f"&Encrypt=yes&TrustServerCertificate=no&Connection+Timeout=30"
                )
            
            # Create engines
            self.sql_engine = create_engine(
                sync_url,
                pool_pre_ping=True,
                pool_recycle=3600,
                echo=os.getenv("SQL_ECHO", "false").lower() == "true"
            )
            
            self.sql_async_engine = create_async_engine(
                async_url,
                pool_pre_ping=True,
                pool_recycle=3600,
                echo=os.getenv("SQL_ECHO", "false").lower() == "true"
            )
            
            # Create session factories
            self.session_factory = sessionmaker(
                bind=self.sql_engine,
                class_=Session,
                expire_on_commit=False
            )
            
            self.async_session_factory = async_sessionmaker(
                bind=self.sql_async_engine,
                class_=AsyncSession,
                expire_on_commit=False
            )
            
            # Test connection
            async with self.sql_async_engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
            
            logger.info(f"SQL Server connection initialized: {sql_server}/{sql_database}")
            
        except Exception as e:
            logger.error(f"Failed to initialize SQL Server connection: {str(e)}")
            raise
    
    async def _init_databricks(self):
        """Initialize Databricks connection"""
        try:
            # Get Databricks connection details
            server_hostname = await self._get_secret("databricks-server-hostname") or os.getenv("DATABRICKS_SERVER_HOSTNAME")
            http_path = await self._get_secret("databricks-http-path") or os.getenv("DATABRICKS_HTTP_PATH")
            access_token = await self._get_secret("databricks-access-token") or os.getenv("DATABRICKS_ACCESS_TOKEN")
            
            if not all([server_hostname, http_path, access_token]):
                logger.warning("Databricks configuration incomplete, analytics features may be limited")
                return
            
            # Create connection (will be used on-demand)
            self.databricks_config = {
                "server_hostname": server_hostname,
                "http_path": http_path,
                "access_token": access_token
            }
            
            # Test connection
            await self._test_databricks_connection()
            
            logger.info(f"Databricks connection configured: {server_hostname}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Databricks connection: {str(e)}")
            # Don't raise here - Databricks is optional for basic functionality
    
    async def _test_databricks_connection(self):
        """Test Databricks connection"""
        try:
            connection = databricks_sql.connect(
                server_hostname=self.databricks_config["server_hostname"],
                http_path=self.databricks_config["http_path"],
                access_token=self.databricks_config["access_token"]
            )
            
            cursor = connection.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
            cursor.close()
            connection.close()
            
        except Exception as e:
            logger.error(f"Databricks connection test failed: {str(e)}")
            raise
    
    @asynccontextmanager
    async def get_db_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get async database session"""
        if not self.async_session_factory:
            raise RuntimeError("Database not initialized")
        
        async with self.async_session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()
    
    @asynccontextmanager
    async def get_databricks_connection(self):
        """Get Databricks connection"""
        if not hasattr(self, 'databricks_config'):
            raise RuntimeError("Databricks not configured")
        
        connection = None
        try:
            connection = databricks_sql.connect(
                server_hostname=self.databricks_config["server_hostname"],
                http_path=self.databricks_config["http_path"],
                access_token=self.databricks_config["access_token"]
            )
            yield connection
        finally:
            if connection:
                connection.close()
    
    async def execute_sql_query(self, query: str, params: Dict[str, Any] = None) -> list:
        """Execute SQL query and return results"""
        async with self.get_db_session() as session:
            result = await session.execute(text(query), params or {})
            return result.fetchall()
    
    async def execute_databricks_query(self, query: str) -> list:
        """Execute Databricks query and return results"""
        async with self.get_databricks_connection() as connection:
            cursor = connection.cursor()
            cursor.execute(query)
            results = cursor.fetchall()
            cursor.close()
            return results
    
    async def health_check(self) -> Dict[str, str]:
        """Check database connectivity"""
        status = {}
        
        # Check SQL Server
        try:
            async with self.sql_async_engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
            status["sql_server"] = "healthy"
        except Exception as e:
            logger.error(f"SQL Server health check failed: {str(e)}")
            status["sql_server"] = "unhealthy"
        
        # Check Databricks
        try:
            if hasattr(self, 'databricks_config'):
                await self._test_databricks_connection()
                status["databricks"] = "healthy"
            else:
                status["databricks"] = "not_configured"
        except Exception as e:
            logger.error(f"Databricks health check failed: {str(e)}")
            status["databricks"] = "unhealthy"
        
        return status
    
    async def cleanup(self):
        """Cleanup database connections"""
        logger.info("Cleaning up database connections...")
        
        try:
            if self.sql_async_engine:
                await self.sql_async_engine.dispose()
            if self.sql_engine:
                self.sql_engine.dispose()
            
            logger.info("Database connections cleaned up")
            
        except Exception as e:
            logger.error(f"Error during database cleanup: {str(e)}")

# Global database manager instance
db_manager = DatabaseManager()

# Dependency for FastAPI
async def get_database() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for database session"""
    async with db_manager.get_db_session() as session:
        yield session

async def get_databricks() -> AsyncGenerator[Any, None]:
    """FastAPI dependency for Databricks connection"""
    async with db_manager.get_databricks_connection() as connection:
        yield connection