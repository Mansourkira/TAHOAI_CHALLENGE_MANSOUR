# Taho AI Challenge - Chat Application

A full-stack AI chat application with a Next.js frontend and FastAPI backend using GROQ API for LLM chat completions.

![Taho AI System Architecture](frontend/public/taho-ai-architecture.png)

## Project Structure

- `/frontend`: Next.js application for the user interface
- `/backend`: FastAPI application providing chat API endpoints and LLM integration

## Getting Started

### Prerequisites

- Node.js (v16+)
- Python (v3.9+)
- GROQ API key (optional, you can use the built-in key or get one from [GROQ Console](https://console.groq.com/))

### Backend Setup

1. Navigate to the backend directory:

```bash
cd backend
```

2. Create a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Run the application using the interactive script:

```bash
python run.py
```

This will launch an interactive menu where you can:

- Navigate options using the UP/DOWN arrow keys
- Select an option by pressing ENTER

You'll be presented with two options:

- Use the built-in encrypted API key (for demo/recruiters)
- Enter your own GROQ API key

The script will handle setting up the environment and starting the backend server.

The backend will be available at [http://localhost:8000](http://localhost:8000).

### Frontend Setup

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file:

```bash
# API configuration
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8000/ws/chat
NEXT_PUBLIC_API_URL=http://localhost:8000
```

4. Run the development server:

```bash
npm run dev
```

The frontend will be available at [http://localhost:3000](http://localhost:3000).

## System Architecture

The application follows a modern architecture with the following components:

1. **Frontend (Next.js)**

   - React components with TypeScript
   - WebSocket client for real-time communication
   - Tailwind CSS for styling

2. **Backend (FastAPI)**

   - RESTful API endpoints for conversation management
   - WebSocket server for real-time chat
   - Integration with GROQ API for LLM responses

3. **Database (SQLite)**

   - Stores conversation history and messages
   - Async SQLAlchemy for database operations

4. **External API (GROQ)**
   - Powers the AI chat functionality
   - Provides LLM responses via API

## API Documentation

Once the backend server is running, you can access the API documentation at:

- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

## API Endpoints

### REST API

- `GET /conversations`: List all conversations
- `POST /conversations`: Create a new conversation
- `GET /conversations/{conversation_id}`: Get a specific conversation with messages

### WebSocket

- `ws://localhost:8000/ws/chat`: Chat endpoint for streaming responses

#### WebSocket Usage Example

```javascript
const ws = new WebSocket("ws://localhost:8000/ws/chat");

ws.onopen = () => {
  // Send a message
  ws.send(
    JSON.stringify({
      message: "Hello, how can you help me?",
      conversation_id: 1, // Optional, omit to create a new conversation
    })
  );
};
```
