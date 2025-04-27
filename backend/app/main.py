from fastapi import FastAPI, WebSocket, Depends, HTTPException, WebSocketDisconnect, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
import json
import logging
import os
from typing import List, Optional, Dict, Any
from datetime import datetime

# Import settings directly
from app.settings import settings
from app.database.database import get_db, init_db, get_db_session
from app.repositories.conversation_repository import ConversationRepository
from app.services.groq_service import GroqService
from app.database.models import Conversation as ConversationModel, Message as MessageModel, RoleType
from app.schemas.schemas import (
    ConversationCreate, 
    Conversation, 
    ConversationSummary,
    ConversationStatsResponse,
    ChatRequest,
    Message,
    MessageCreate
)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.APP_NAME,
    description="FastAPI backend for AI Chat application using GROQ API for chat completions",
    version=settings.APP_VERSION,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handler for more user-friendly error responses
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Uncaught exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again later."},
    )

# Initialize database
@app.on_event("startup")
async def startup_db_client():
    try:
        logger.info("Initializing database...")
        await init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {str(e)}")
        raise

# Health check endpoint
@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """Health check endpoint to verify API is running"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": app.version
    }

# GROQ API validation endpoint
@app.get("/validate-groq-api", status_code=status.HTTP_200_OK)
async def validate_groq_api():
    """Validate that the GROQ API key is working"""
    try:
        groq_service = GroqService()
        result = await groq_service.validate_api_key()
        
        if result["valid"]:
            return {
                "status": "valid",
                "message": result["message"]
            }
        else:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "status": "invalid",
                    "message": result["message"]
                }
            )
    except Exception as e:
        logger.error(f"Error validating GROQ API key: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "status": "error",
                "message": f"Error validating GROQ API key: {str(e)}"
            }
        )

# REST endpoints for conversations
@app.post("/conversations", response_model=Conversation, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    conversation: ConversationCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new conversation.
    
    Args:
        conversation: Conversation data with optional title
        
    Returns:
        The created conversation with ID and timestamps
    """
    try:
        repo = ConversationRepository(db)
        new_conversation = await repo.create_conversation(conversation.title)
        return new_conversation
    except Exception as e:
        logger.error(f"Error creating conversation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create conversation"
        )

@app.get("/conversations", response_model=List[ConversationSummary])
async def list_conversations(
    limit: int = 10,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """
    List all conversations with pagination.
    
    Args:
        limit: Maximum number of conversations to return (default: 10)
        offset: Number of conversations to skip (default: 0)
        
    Returns:
        List of conversation summaries
    """
    try:
        repo = ConversationRepository(db)
        conversations = await repo.list_conversations(limit, offset)
        return conversations
    except Exception as e:
        logger.error(f"Error listing conversations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list conversations"
        )

@app.get("/conversations/{conversation_id}", response_model=Conversation)
async def get_conversation(
    conversation_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific conversation by ID.
    
    Args:
        conversation_id: The ID of the conversation to retrieve
        
    Returns:
        The conversation with all messages
    """
    try:
        repo = ConversationRepository(db)
        conversation = await repo.get_conversation(conversation_id)
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation with ID {conversation_id} not found"
            )
            
        return conversation
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting conversation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get conversation"
        )

@app.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a conversation by ID.
    
    Args:
        conversation_id: The ID of the conversation to delete
    """
    try:
        repo = ConversationRepository(db)
        conversation = await repo.get_conversation(conversation_id)
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation with ID {conversation_id} not found"
            )
            
        await repo.delete_conversation(conversation_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting conversation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete conversation"
        )

@app.put("/conversations/{conversation_id}/title", response_model=Conversation)
async def update_conversation_title(
    conversation_id: int,
    conversation: ConversationCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update the title of a conversation.
    
    Args:
        conversation_id: The ID of the conversation to update
        conversation: The conversation data with the new title
        
    Returns:
        The updated conversation
    """
    try:
        repo = ConversationRepository(db)
        existing_conversation = await repo.get_conversation(conversation_id)
        
        if not existing_conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation with ID {conversation_id} not found"
            )
        
        updated_conversation = await repo.update_conversation_title(conversation_id, conversation.title)
        return updated_conversation
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating conversation title: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update conversation title"
        )

@app.get("/stats", response_model=ConversationStatsResponse)
async def get_stats(
    db: AsyncSession = Depends(get_db)
):
    """
    Get statistics about conversations.
    
    Returns:
        Statistics about conversations including total, message counts, etc.
    """
    try:
        repo = ConversationRepository(db)
        stats = await repo.get_stats()
        return stats
    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get conversation statistics"
        )

@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time chat interactions.
    
    This endpoint allows for:
    - Sending messages to the AI through a WebSocket connection
    - Receiving streaming responses as they're generated
    - Managing conversation state
    """
    db = None
    conversation_id = None
    
    try:
        await websocket.accept()
        logger.info("WebSocket connection accepted")
        
        # Create one service instance to reuse
        groq_service = GroqService()
        
        while True:
            # Wait for a message from the client
            message_json = await websocket.receive_text()
            
            try:
                db = await get_db_session()  # Get a fresh session for each message
                repo = ConversationRepository(db)
                
                # Parse the message JSON
                try:
                    data = json.loads(message_json)
                    message = data.get("message", "").strip()
                    conversation_id = data.get("conversation_id")
                    
                    logger.info(f"Received message: {message[:50]}...")
                    
                    if not message:
                        await websocket.send_json({
                            "status": "error",
                            "error": "Message cannot be empty",
                            "conversation_id": conversation_id or 0
                        })
                        continue
                        
                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON: {message_json}")
                    await websocket.send_json({
                        "status": "error",
                        "error": "Invalid message format",
                        "conversation_id": 0
                    })
                    continue
                
                # Create a new conversation if needed
                if not conversation_id:
                    conversation = await repo.create_conversation("New conversation")
                    conversation_id = conversation.id
                    logger.info(f"Created new conversation with ID {conversation_id}")
                else:
                    # Verify conversation exists
                    conversation = await repo.get_conversation(conversation_id)
                    if not conversation:
                        await websocket.send_json({
                            "status": "error",
                            "error": f"Conversation with ID {conversation_id} not found",
                            "conversation_id": conversation_id
                        })
                        continue
            
                # Save user message
                user_message = await repo.add_message(conversation_id, "user", message)
                logger.info(f"Saved user message with ID {user_message.id}")
                
                # Get conversation history for context
                conversation_messages = await repo.get_messages(conversation_id)
                groq_messages = [{"role": msg.role, "content": msg.content} for msg in conversation_messages]
                
                # Send initial status to client with conversation ID
                await websocket.send_json({
                    "status": "streaming",
                    "conversation_id": conversation_id,
                    "text": ""  # Empty initial text
                })
                
                # Stream response from GROQ API
                ai_response_text = ""
                stream_generator = groq_service.generate_stream(groq_messages)
                
                # Process the generator chunks safely
                try:
                    async for chunk in stream_generator:
                        ai_response_text += chunk
                        await websocket.send_json({
                            "status": "streaming",
                            "text": chunk,
                            "conversation_id": conversation_id
                        })

                    # Log the final response length for debugging
                    logger.info(f"WebSocket stream completed, response length: {len(ai_response_text)}")
                except Exception as stream_error:
                    logger.error(f"Error streaming response: {str(stream_error)}", exc_info=True)
                    await websocket.send_json({
                        "status": "error",
                        "error": f"Error streaming response: {str(stream_error)}",
                        "conversation_id": conversation_id
                    })
                    continue
                
                # Save assistant message only if we got any response
                if ai_response_text:
                    await repo.add_message(conversation_id, "assistant", ai_response_text)
                    logger.info(f"Saved assistant response for conversation {conversation_id}")
                else:
                    # If we didn't get a response, add a fallback message
                    await repo.add_message(conversation_id, "assistant", "I'm sorry, I couldn't generate a response.")
                    logger.warning(f"No AI response received, using fallback message for conversation {conversation_id}")
                
                # Send completion status
                await websocket.send_json({
                    "status": "complete",
                    "conversation_id": conversation_id
                })
                
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {str(e)}", exc_info=True)
                await websocket.send_json({
                    "status": "error",
                    "error": f"Error processing message: {str(e)}",
                    "conversation_id": conversation_id or 0
                })
            finally:
                # Close the database session if it was created
                if db is not None:
                    await db.close()
    
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}", exc_info=True)
        try:
            await websocket.send_json({
                "status": "error",
                "error": f"WebSocket error: {str(e)}",
                "conversation_id": 0
            })
        except:
            # If we can't send the error, just log it
            logger.error("Could not send error response to client")

@app.post("/chat", status_code=status.HTTP_200_OK)
async def chat(
    chat_request: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Send a message and get a response from the AI.
    
    Args:
        chat_request: The chat request with the message and optional conversation ID
        
    Returns:
        The AI response and conversation ID
    """
    try:
        message = chat_request.message
        conversation_id = chat_request.conversation_id
        
        if not message.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message cannot be empty"
            )
        
        # Create services
        groq_service = GroqService()
        repo = ConversationRepository(db)
        
        # Create conversation if it doesn't exist
        if not conversation_id:
            conversation = await repo.create_conversation("New conversation")
            conversation_id = conversation.id
            logger.info(f"Created new conversation with ID {conversation_id}")
        else:
            # Verify conversation exists
            conversation = await repo.get_conversation(conversation_id)
            if not conversation:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Conversation with ID {conversation_id} not found"
                )
        
        # Save user message
        user_message = await repo.add_message(conversation_id, "user", message)
        logger.info(f"Saved user message with ID {user_message.id}")
        
        # Get conversation history for context
        conversation_messages = await repo.get_messages(conversation_id)
        groq_messages = [{"role": msg.role, "content": msg.content} for msg in conversation_messages]
        
        # Get response from GROQ API (non-streaming for REST endpoint)
        ai_response_text = ""
        try:
            async for chunk in groq_service.generate_stream(groq_messages):
                ai_response_text += chunk
            
            # Log the response length for debugging
            logger.info(f"Received AI response with length {len(ai_response_text)}")
            
            # Ensure we have a valid response before saving
            if not ai_response_text.strip():
                logger.warning("Received empty AI response, using fallback message")
                ai_response_text = "I'm sorry, I couldn't generate a response at this time."
        except Exception as stream_error:
            logger.error(f"Error getting AI response: {str(stream_error)}", exc_info=True)
            ai_response_text = f"I apologize, but I encountered an error: {str(stream_error)}"
        
        # Save assistant message
        ai_message = await repo.add_message(conversation_id, "assistant", ai_response_text)
        logger.info(f"Saved assistant response for conversation {conversation_id}")
        
        return {
            "conversation_id": conversation_id,
            "user_message": {
                "id": user_message.id,
                "content": user_message.content,
                "role": user_message.role,
                "created_at": user_message.created_at
            },
            "ai_response": {
                "id": ai_message.id,
                "content": ai_message.content,
                "role": ai_message.role,
                "created_at": ai_message.created_at
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process chat message: {str(e)}"
        )

@app.get("/history", response_model=List[Conversation])
async def get_chat_history(
    limit: int = 10,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """
    Get chat history (all conversations with their messages).
    
    Args:
        limit: Maximum number of conversations to return (default: 10)
        offset: Number of conversations to skip (default: 0)
        
    Returns:
        List of conversations with messages
    """
    try:
        repo = ConversationRepository(db)
        # Get all conversations with messages
        conversations = await repo.list_conversations_with_messages(limit, offset)
        return conversations
    except Exception as e:
        logger.error(f"Error getting chat history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get chat history"
        )

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting server on {settings.HOST}:{settings.PORT} with reload={settings.DEBUG}")
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG) 