import os
import httpx
import json
import asyncio
import logging
from typing import List, Dict, Any, AsyncGenerator, Optional
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

# Import settings directly
from app.settings import settings

# Set up logging
logger = logging.getLogger(__name__)

class GroqAPIError(Exception):
    """GROQ API-specific exception with status code"""
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(f"GROQ API Error: {status_code}, {message}")

class GroqService:
    """
    Service for interacting with the GROQ API.
    Handles streaming LLM responses with error handling.
    """
    
    def __init__(self):
        """Initialize with API key and settings"""
        self.api_key = settings.GROQ_API_KEY
        if not self.api_key:
            logger.error("GROQ_API_KEY environment variable is not set")
            raise ValueError("GROQ_API_KEY environment variable is not set")
        
        # Log masked API key for debugging
        masked_key = f"{self.api_key[:6]}...{self.api_key[-4:]}" if len(self.api_key) > 10 else "***masked***"
        logger.info(f"Using GROQ API key: {masked_key}")
        
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"
        self.model = settings.GROQ_MODEL
        self.timeout = settings.GROQ_TIMEOUT_SECONDS
        self.max_retries = settings.GROQ_MAX_RETRIES
        
        logger.info(f"Initialized GROQ service with model: {self.model}, timeout: {self.timeout}s, max_retries: {self.max_retries}")
    
    @retry(
        retry=retry_if_exception_type((httpx.ReadTimeout, httpx.ConnectTimeout, httpx.ReadError)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        reraise=True
    )
    async def generate_stream(self, messages: List[Dict[str, str]]) -> AsyncGenerator[str, None]:
        """
        Generate streaming response with auto-retry
        
        Args:
            messages: List of role/content message objects
            
        Yields:
            Text chunks from the LLM
        """
        if not messages:
            logger.warning("Empty messages list provided to generate_stream")
            return
            
        # Request headers
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # Request payload
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.7,     # Controls randomness
            "max_tokens": 1024,     # Max response length
            "stream": True,         # Enable streaming
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                async with client.stream(
                    "POST",
                    self.base_url,
                    headers=headers,
                    json=payload,
                    timeout=self.timeout
                ) as response:
                    # Check for error response
                    if response.status_code != 200:
                        error_body = await response.aread()
                        error_message = f"GROQ API Error: {response.status_code}"
                        try:
                            error_json = json.loads(error_body)
                            if "error" in error_json and "message" in error_json["error"]:
                                error_message = error_json["error"]["message"]
                        except:
                            error_message = f"GROQ API Error: {response.status_code}, Body: {error_body.decode('utf-8', errors='replace')}"
                        
                        logger.error(error_message)
                        raise GroqAPIError(response.status_code, error_message)
                    
                    # Process streaming response
                    full_response = ""
                    async for chunk in response.aiter_text():
                        if chunk.strip():
                            # Process each line in the chunk
                            for line in chunk.split("\n"):
                                if line.startswith("data: ") and line != "data: [DONE]":
                                    try:
                                        # Parse JSON from stream
                                        data = json.loads(line[6:])
                                        if "choices" in data and len(data["choices"]) > 0:
                                            choice = data["choices"][0]
                                            if "delta" in choice and "content" in choice["delta"]:
                                                content = choice["delta"]["content"]
                                                if content:
                                                    full_response += content
                                                    yield content
                                    except json.JSONDecodeError:
                                        logger.warning(f"Could not parse JSON from line: {line}")
                    
                    # Log completion
                    if full_response:
                        logger.info(f"Total response length: {len(full_response)}")
        except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.ConnectError) as e:
            logger.error(f"Connection error while calling GROQ API: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in GROQ API call: {str(e)}")
            raise
    
    async def validate_api_key(self) -> Dict[str, Any]:
        """
        Test if API key is valid
        Returns status dict with validation result
        """
        # Simple test message
        test_messages = [{"role": "user", "content": "Hello"}]
        
        try:
            # Non-streaming request for validation
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": self.model,
                "messages": test_messages,
                "max_tokens": 5,  # Minimal for validation
                "stream": False
            }
            
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(
                    self.base_url,
                    headers=headers,
                    json=payload
                )
                
                if response.status_code == 200:
                    return {
                        "valid": True,
                        "message": "API key is valid."
                    }
                else:
                    error_body = response.text
                    error_message = f"API key validation failed. Status code: {response.status_code}"
                    try:
                        error_json = json.loads(error_body)
                        if "error" in error_json and "message" in error_json["error"]:
                            error_message = error_json["error"]["message"]
                    except:
                        pass
                    
                    return {
                        "valid": False,
                        "message": error_message
                    }
        except Exception as e:
            return {
                "valid": False,
                "message": f"Error validating API key: {str(e)}"
            } 