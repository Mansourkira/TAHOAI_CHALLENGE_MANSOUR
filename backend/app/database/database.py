from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
import os
import logging
from pathlib import Path
from app.settings import settings

# Set up logging
logger = logging.getLogger(__name__)

# Create database directory if it doesn't exist
database_dir = Path("./data")
try:
    database_dir.mkdir(exist_ok=True)
    logger.info(f"Database directory ensured at {database_dir.absolute()}")
except Exception as e:
    logger.error(f"Failed to create database directory: {str(e)}")
    raise

# Database URL from settings
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL
logger.info(f"Using database URL: {SQLALCHEMY_DATABASE_URL}")

# SQLite-specific configuration
connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}

try:
    # Create async database engine
    engine = create_async_engine(
        SQLALCHEMY_DATABASE_URL, 
        connect_args=connect_args,
        pool_pre_ping=True,  # Connection health check
        pool_recycle=300,    # Connection lifetime in seconds
        echo=False           # SQL query logging (false=disabled)
    )
    logger.info("Database engine created successfully")
except Exception as e:
    logger.error(f"Failed to create database engine: {str(e)}")
    raise

# Create session factory
SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Base class for models
Base = declarative_base()

async def get_db():
    """
    FastAPI dependency for database access
    """
    db = SessionLocal()
    try:
        logger.debug("Database session created")
        yield db
    except Exception as e:
        logger.error(f"Database session error: {str(e)}")
        await db.rollback()
        raise
    finally:
        logger.debug("Database session closed")
        await db.close()

async def get_db_session():
    """
    Direct session for WebSockets and background tasks
    """
    db = SessionLocal()
    try:
        logger.debug("Direct database session created")
        return db
    except Exception as e:
        logger.error(f"Database session error: {str(e)}")
        await db.close()
        raise

async def init_db():
    """Initialize database schema"""
    from app.database.models import Base
    
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {str(e)}")
        raise 