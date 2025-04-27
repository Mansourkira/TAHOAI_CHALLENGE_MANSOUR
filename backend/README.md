# Taho AI Chat Application - Backend

This is the backend API server for the Taho AI Chat Application. It provides a FastAPI-based interface to interact with the Groq LLM service.

## Requirements

- Python 3.9 or higher
- Dependencies listed in `requirements.txt`

## How to Run

The application is designed to run with minimal configuration. We provide a secure way to run the application without needing to manually configure an API key.

### Option 1: Using the Run Script (Recommended)

Simply run:

```bash
python run.py
```

This script:

1. Automatically configures the required API key
2. Sets up the environment
3. Starts the server

### Option 2: Manual Configuration

If you prefer to use your own Groq API key:

1. Set the environment variable:

   ```bash
   # Windows Command Prompt
   set GROQ_API_KEY=your_api_key_here

   # Windows PowerShell
   $env:GROQ_API_KEY="your_api_key_here"

   # Linux/Mac
   export GROQ_API_KEY=your_api_key_here
   ```

2. Start the server:
   ```bash
   python start.py
   ```

## API Documentation

Once the server is running, you can access the API documentation at:

- http://localhost:8000/docs - Swagger UI
- http://localhost:8000/redoc - ReDoc UI

## Development

For development, set the `DEBUG` environment variable to `True` to enable auto-reload:

```bash
set DEBUG=True  # Windows Command Prompt
$env:DEBUG="True"  # Windows PowerShell
export DEBUG=True  # Linux/Mac
```

## Troubleshooting

If you encounter any issues:

1. Check that Python 3.9+ is installed
2. Ensure all dependencies are installed: `pip install -r requirements.txt`
3. If you're using your own API key, verify it's valid and properly configured
4. Check the application logs for detailed error messages
