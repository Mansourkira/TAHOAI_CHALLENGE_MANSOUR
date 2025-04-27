import os
import logging
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

def main():
    # Import settings directly
    from app.settings import settings
    
    # Get configuration from settings
    logger.info(f"Starting backend server with settings from environment variables")
    
    # Check required settings
    logger.info(f"GROQ API Key: {settings.api_key_preview}")
    
    # App configuration
    app_module = "app.main:app"
    
    logger.info(f"Starting server on {settings.HOST}:{settings.PORT} with reload={settings.DEBUG}")
    uvicorn.run(
        app_module,
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL
    )

if __name__ == "__main__":
    main() 