import os
import sys
import logging
import uvicorn
import base64
from pathlib import Path
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Secure key file path and encryption constants
KEY_FILE = Path(__file__).parent / "secure" / "api_key.enc"
ENCRYPTION_PASSWORD = b"taho-ai-challenge-2024"
SALT = b"taho-ai-challenge-salt"

def get_encryption_key():
    """Derive encryption key from password and salt"""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=SALT,
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(ENCRYPTION_PASSWORD))
    return key

def decrypt_api_key():
    """Decrypt the API key from file"""
    if not KEY_FILE.exists():
        logger.error("Encrypted API key file not found")
        return None
    
    try:
        # Read the encrypted key
        with open(KEY_FILE, "rb") as f:
            encrypted_key = f.read()
        
        # Decrypt it
        key = get_encryption_key()
        fernet = Fernet(key)
        decrypted_key = fernet.decrypt(encrypted_key).decode()
        logger.info("Successfully decrypted API key from file")
        return decrypted_key
    except Exception as e:
        logger.error(f"Failed to decrypt API key from file: {str(e)}")
        return None

def main():
    # First attempt to decrypt and set the API key
    api_key = decrypt_api_key()
    if api_key:
        # Set environment variable
        os.environ["GROQ_API_KEY"] = api_key
        logger.info("Successfully set GROQ_API_KEY from encrypted file")
    else:
        logger.error("Could not set GROQ_API_KEY from encrypted file")
        if not os.getenv("GROQ_API_KEY"):
            print("ERROR: GROQ_API_KEY environment variable is required but not set.")
            sys.exit(1)
    
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