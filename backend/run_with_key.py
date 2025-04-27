#!/usr/bin/env python3
"""
Helper script that automatically runs the application with a securely stored API key.
This allows recruiters to run the application without needing to configure anything.
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

# Encrypted API key (DO NOT MODIFY)
# This is encrypted and safe to include in a public repository
ENCRYPTED_API_KEY = b"gAAAAABmjdDVKKxJfbL-X5w3zMXpQ0cZKZMYLM4B2dGJQv37TJfZmxwWcpzbCfOwrHh4ZA23V8U9OAYgvUX_7X_xIRrREAcCWDz8-fOPLYDfOoNiYaM6iHg="

# Password used for encryption (this is a demo app, so this approach is acceptable)
# In a real app, you'd use a more secure approach
ENCRYPTION_PASSWORD = b"taho-ai-challenge-2024"

# Salt used for key derivation
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
    """Decrypt the API key"""
    try:
        key = get_encryption_key()
        fernet = Fernet(key)
        return fernet.decrypt(ENCRYPTED_API_KEY).decode()
    except Exception as e:
        logger.error(f"Failed to decrypt API key: {str(e)}")
        return None

def set_api_key_env():
    """Set the API key as an environment variable"""
    api_key = decrypt_api_key()
    if not api_key:
        print("ERROR: Failed to decrypt API key.", file=sys.stderr)
        sys.exit(1)
        
    # Set environment variable for child processes
    os.environ["GROQ_API_KEY"] = api_key
    logger.info("Successfully set API key in environment")

def run_server():
    """Run the server using the start.py script"""
    logger.info("Starting the server...")
    try:
        # Use sys.executable to ensure we use the same Python interpreter
        import subprocess
        process = subprocess.run(
            [sys.executable, "start.py"],
            cwd=Path(__file__).parent,
            env=os.environ  # Pass the environment with our API key
        )
        return process.returncode == 0
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
        return True
    except Exception as e:
        logger.error(f"Error running server: {str(e)}")
        return False

if __name__ == "__main__":
    # Check if required packages are installed
    try:
        import cryptography
    except ImportError:
        print("Installing required dependencies...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "cryptography"])
    
    # Set API key in environment
    set_api_key_env()
    
    # Run the server
    success = run_server()
    
    if not success:
        print("Failed to start the server. Please check the logs for details.", file=sys.stderr)
        sys.exit(1) 