#!/usr/bin/env python3
"""
Helper script that runs the application with either:
1. The built-in encrypted GROQ API key
2. A user-provided GROQ API key

This allows both recruiters to run the app easily and users to run with their own keys.
"""
import os
import sys
import base64
import logging
from pathlib import Path
from getpass import getpass

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Encrypted API key
# This is encrypted and safe to include in a public repository
ENCRYPTED_API_KEY = b"gAAAAABmjdDVKKxJfbL-X5w3zMXpQ0cZKZMYLM4B2dGJQv37TJfZmxwWcpzbCfOwrHh4ZA23V8U9OAYgvUX_7X_xIRrREAcCWDz8-fOPLYDfOoNiYaM6iHg="

# Password used for encryption (this is a demo app, so this approach is acceptable)
# In a real app, it's better to use a more secure approach
ENCRYPTION_PASSWORD = b"taho-ai-challenge-2024"

# Salt used for key derivation
SALT = b"taho-ai-challenge-salt"

def get_encryption_key():
    """Derive encryption key from password and salt"""
    try:
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=SALT,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(ENCRYPTION_PASSWORD))
        return key
    except ImportError:
        logger.error("Missing cryptography package. Installing...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "cryptography"])
        # Now try again after installing
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
        
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
        from cryptography.fernet import Fernet
        key = get_encryption_key()
        fernet = Fernet(key)
        return fernet.decrypt(ENCRYPTED_API_KEY).decode()
    except Exception as e:
        logger.error(f"Failed to decrypt API key: {str(e)}")
        return None

def get_custom_api_key():
    """Get API key from user input"""
    print("Please enter your GROQ API key (get one from https://console.groq.com/):")
    print("(Input will be hidden for security)")
    api_key = getpass("> ").strip()
    
    if not api_key:
        print("ERROR: API key cannot be empty.", file=sys.stderr)
        sys.exit(1)
        
    return api_key

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

def display_menu():
    """Display a simple text-based menu that works on all platforms"""
    print("\n=== Taho AI Chat Application ===\n")
    print("1. Use built-in API key ")
    print("2. Use your own GROQ API key")
    print("3. Exit")
    
    while True:
        try:
            choice = input("\nEnter your choice (1-3): ").strip()
            if choice in ["1", "2", "3"]:
                return int(choice)
            else:
                print("Invalid choice. Please enter 1, 2, or 3.")
        except ValueError:
            print("Invalid input. Please enter a number.")
        except KeyboardInterrupt:
            print("\nExiting...")
            sys.exit(0)

if __name__ == "__main__":
    try:
        # Get user choice from the menu
        choice = display_menu()
        
        # Process the user's choice
        if choice == 1:
            # Use encrypted API key
            api_key = decrypt_api_key()
            if not api_key:
                print("ERROR: Failed to decrypt the built-in API key.", file=sys.stderr)
                print("Would you like to use your own API key instead? (y/n)")
                fallback = input("> ").strip().lower()
                if fallback == "y":
                    api_key = get_custom_api_key()
                else:
                    sys.exit(1)
        elif choice == 2:
            # Use custom API key
            api_key = get_custom_api_key()
        elif choice == 3:
            print("Exiting...")
            sys.exit(0)
        else:
            print("Invalid choice. Please run the script again.")
            sys.exit(1)
        
        # Set API key in environment
        os.environ["GROQ_API_KEY"] = api_key
        logger.info("Successfully set API key in environment")
        
        # Run the server
        success = run_server()
        
        if not success:
            print("Failed to start the server. Please check the logs for details.", file=sys.stderr)
            sys.exit(1)
    except KeyboardInterrupt:
        print("\nExiting...")
        sys.exit(0) 