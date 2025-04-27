# Taho AI Challenge - Chat Application

A full-stack AI chat application with a Next.js frontend and FastAPI backend using GROQ API for LLM chat completions.

![Taho AI System Architecture](public/taho-ai-architecture.png)

## Project Structure

- `/frontend`: Next.js application for the user interface
- `/backend`: FastAPI application providing chat API endpoints and LLM integration

## Getting Started

### Prerequisites

- Node.js (v16+)
- Python (v3.9+)
- GROQ API key (get one from [GROQ.ai](https://console.groq.com/))

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

4. Create a `.env` file:

```bash
# Database settings
DATABASE_URL=sqlite+aiosqlite:///./data/chat.db

# GROQ API settings
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama3-70b-8192

# Server settings
HOST=0.0.0.0
PORT=8000
CORS_ORIGINS=http://localhost:3000
```

5. Run the server:

```bash
python start.py
```

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

## Deployment

### Deploying the Frontend to Vercel

The Next.js frontend is optimized for deployment on Vercel:

1. Create a Vercel account if you don't have one at [vercel.com](https://vercel.com)
2. Install the Vercel CLI:
   ```bash
   npm install -g vercel
   ```
3. From the `frontend` directory, run:
   ```bash
   vercel
   ```
4. Follow the prompts to link your project and deploy
5. Set the following environment variables in the Vercel project settings:
   - `NEXT_PUBLIC_WEBSOCKET_URL`: Your deployed backend WebSocket URL
   - `NEXT_PUBLIC_API_URL`: Your deployed backend API URL

### Deploying the Backend

For the backend, you have several options:

1. **Railway**:

   - Push your code to GitHub
   - Create a new project in Railway from your GitHub repo
   - Set the required environment variables

2. **Render**:

   - Create a new Web Service in Render
   - Connect your GitHub repository
   - Set the build command to `pip install -r requirements.txt`
   - Set the start command to `python start.py`
   - Add the environment variables from the `.env` file

3. **Heroku**:
   - Create a `Procfile` with `web: uvicorn main:app --host=0.0.0.0 --port=${PORT}`
   - Deploy using the Heroku CLI or GitHub integration
   - Configure environment variables in the Heroku dashboard

Remember to update the CORS settings in your backend to allow requests from your Vercel frontend domain.

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

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.status === "streaming") {
    // Append the streaming text to the UI
    console.log("Received chunk:", data.text);
  } else if (data.status === "complete") {
    // Stream complete, update UI accordingly
    console.log("Stream complete");
  } else if (data.status === "error") {
    // Handle error
    console.error("Error:", data.error);
  }
};
```
