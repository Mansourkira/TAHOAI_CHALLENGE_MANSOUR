#!/usr/bin/env python3
"""
Professional runner script for the Taho AI Chat Application.
Handles secure API key management and server startup.
"""
import os
import sys
import base64
import logging
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

# Secure key file path
KEY_FILE = Path(__file__).parent / "secure" / "api_key.enc"

# Security constants
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

def set_api_key_env():
    """Set the API key as an environment variable"""
    api_key = decrypt_api_key()
    if not api_key:
        logger.error("Failed to decrypt API key - no key available")
        print("ERROR: Failed to set API key.", file=sys.stderr)
        sys.exit(1)
        
    # Set environment variable for child processes
    os.environ["GROQ_API_KEY"] = api_key
    logger.info("API key successfully configured")

def run_server():
    """Run the server with the configured environment"""
    try:
        # Import here to ensure environment is already set
        from app.settings import settings
        
        logger.info(f"Starting Taho AI Chat Server on {settings.HOST}:{settings.PORT}")
        
        # Use uvicorn directly for cleaner output
        import uvicorn
        uvicorn.run(
            "app.main:app",
            host=settings.HOST,
            port=settings.PORT,
            reload=settings.DEBUG,
            log_level=settings.LOG_LEVEL.lower()
        )
        return True
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
        return True
    except Exception as e:
        logger.error(f"Error running server: {str(e)}")
        return False

def check_dependencies():
    """Ensure all required dependencies are installed"""
    try:
        import cryptography
        import uvicorn
        return True
    except ImportError as e:
        print(f"Missing required dependency: {e.name}")
        print("Installing dependencies...")
        try:
            import subprocess
            subprocess.check_call([sys.executable, "-m", "pip", "install", "cryptography", "uvicorn"])
            return True
        except Exception as e:
            print(f"Failed to install dependencies: {str(e)}")
            return False

def main():
    """Main entry point"""
    print(f"Starting Taho AI Chat Application...")
    
    # Ensure dependencies are installed
    if not check_dependencies():
        print("ERROR: Required dependencies could not be installed.")
        sys.exit(1)
    
    # Configure API key
    set_api_key_env()
    
    # Run the server
    success = run_server()
    
    if not success:
        print("Server failed to start properly. See logs for details.")
        sys.exit(1)

if __name__ == "__main__":
    main()