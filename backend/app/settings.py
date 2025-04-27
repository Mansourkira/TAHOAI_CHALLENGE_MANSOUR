from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import logging
import os
import sys

logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    """
    Application settings loaded from environment variables
    """
    # API settings - Basic app information
    APP_NAME: str = "Taho AI Chat API"
    APP_VERSION: str = "1.0.0"
    
    # Server settings - Host, port and debug configuration
    HOST: str = "0.0.0.0"  # Listen on all network interfaces
    PORT: int = 8000       # Default HTTP port for the API
    DEBUG: bool = True     # Enable debug mode (hot reloading)
    LOG_LEVEL: str = "info"  # Logging verbosity level
    
    # GROQ API settings - LLM service configuration
    GROQ_API_KEY: str      # API key (required, no default)
    GROQ_MODEL: str = "llama3-70b-8192"  # LLM model to use
    GROQ_TIMEOUT_SECONDS: int = 60  # Request timeout
    GROQ_MAX_RETRIES: int = 2      # Number of retries on failure
    
    # CORS settings - Frontend connection
    CORS_ORIGINS: str = "http://localhost:3000"  # Allowed origins for CORS
    
    # Database settings - SQLite by default
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/chat.db"
    
    model_config = SettingsConfigDict(
        case_sensitive=True,  # Environment variables are case-sensitive
        extra="ignore",       # Ignore extra env vars
    )
    
    def get_cors_origins(self) -> List[str]:
        """Split comma-separated CORS origins into a list"""
        return self.CORS_ORIGINS.split(",")
    
    @property
    def api_key_preview(self) -> str:
        """Returns first 4 chars of API key with rest masked (for logging)"""
        if not self.GROQ_API_KEY:
            return "NOT_SET"
        return f"{self.GROQ_API_KEY[:4]}{'*' * 16}"


def create_settings() -> Settings:
    """
    Create settings from environment variables.
    Exits with error if GROQ_API_KEY is missing.
    """
    try:
        if not os.getenv("GROQ_API_KEY"):
            logger.error("GROQ_API_KEY environment variable is not set.")
            print("ERROR: GROQ_API_KEY environment variable is required but not set.", file=sys.stderr)
            sys.exit(1)
        
        settings = Settings()
        logger.info(f"Loaded settings: APP_NAME={settings.APP_NAME}, API_KEY={settings.api_key_preview}")
        return settings
    except Exception as e:
        logger.error(f"Error loading settings: {str(e)}")
        print(f"ERROR: Failed to load settings: {str(e)}", file=sys.stderr)
        sys.exit(1)


# Create a global instance of the settings
settings = create_settings() 