#!/usr/bin/env python3
"""
Script to test the Groq API key
"""
import os
import sys
import httpx
import json
import logging
import asyncio

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Import the decryption function from start.py
from start import decrypt_api_key

async def test_groq_api(api_key):
    """Test if the GROQ API key is valid by making a simple request"""
    base_url = "https://api.groq.com/openai/v1/chat/completions"
    model = "llama3-70b-8192"
    
    # Simple test message
    test_messages = [{"role": "user", "content": "Hello"}]
    
    # Log masked key for debugging
    masked_key = f"{api_key[:6]}...{api_key[-4:]}" if len(api_key) > 10 else "***masked***"
    logger.info(f"Testing GROQ API with key: {masked_key}")
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model,
        "messages": test_messages,
        "max_tokens": 5,  # Minimal for validation
        "stream": False
    }
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                base_url,
                headers=headers,
                json=payload
            )
            
            logger.info(f"Response status code: {response.status_code}")
            
            if response.status_code == 200:
                logger.info("API key is valid!")
                content = response.json()
                logger.info(f"Response content: {json.dumps(content, indent=2)}")
                return True
            else:
                error_body = response.text
                logger.error(f"Error: {response.status_code}, {error_body}")
                
                try:
                    error_json = json.loads(error_body)
                    if "error" in error_json and "message" in error_json["error"]:
                        logger.error(f"Error message: {error_json['error']['message']}")
                except:
                    pass
                    
                return False
    except Exception as e:
        logger.error(f"Exception during API test: {str(e)}")
        return False

async def main():
    """Main entry point"""
    print("GROQ API Key Test")
    print("================")
    
    # First try to decrypt the key from file
    api_key = decrypt_api_key()
    if api_key:
        logger.info("Successfully decrypted API key from file")
        os.environ["GROQ_API_KEY"] = api_key
    else:
        logger.error("Could not decrypt API key from file")
        # Check if it's set in environment
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            print("ERROR: No GROQ API key available")
            sys.exit(1)
    
    # Test the API key
    success = await test_groq_api(api_key)
    
    if success:
        print("✅ GROQ API key is valid!")
    else:
        print("❌ GROQ API key is invalid!")
        
if __name__ == "__main__":
    asyncio.run(main()) 