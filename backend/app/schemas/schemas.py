from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime
import enum

class RoleEnum(str, enum.Enum):
    """Chat message role types"""
    USER = "user"           # User input message
    ASSISTANT = "assistant" # AI assistant response
    SYSTEM = "system"       # System configuration message

class MessageBase(BaseModel):
    """Base message schema with role and content"""
    role: RoleEnum = Field(
        ..., 
        description="Role of the message sender (user, assistant, system)"
    )
    content: str = Field(
        ..., 
        min_length=1, 
        description="The content of the message"
    )

class MessageCreate(MessageBase):
    """Schema for creating new messages"""
    pass

class Message(MessageBase):
    """Complete message schema with metadata"""
    id: int = Field(..., description="Unique identifier for the message")
    conversation_id: int = Field(..., description="ID of the conversation this message belongs to")
    created_at: datetime = Field(..., description="Timestamp when the message was created")
    
    class Config:
        from_attributes = True  # ORM mode for SQLAlchemy models

class ConversationBase(BaseModel):
    """Base conversation schema with title"""
    title: str = Field(
        "New Conversation", 
        max_length=255, 
        description="Title of the conversation"
    )

class ConversationCreate(ConversationBase):
    """Schema for creating new conversations"""
    pass

class Conversation(ConversationBase):
    """Complete conversation schema with messages"""
    id: int = Field(..., description="Unique identifier for the conversation")
    created_at: datetime = Field(..., description="Timestamp when the conversation was created")
    updated_at: datetime = Field(..., description="Timestamp when the conversation was last updated")
    messages: List[Message] = Field(
        default_factory=list, 
        description="List of messages in this conversation"
    )
    
    class Config:
        from_attributes = True  # ORM mode for SQLAlchemy models

class ConversationSummary(BaseModel):
    """Conversation list item with minimal information"""
    id: int = Field(..., description="Unique identifier for the conversation")
    title: str = Field(..., description="Title of the conversation")
    created_at: datetime = Field(..., description="Timestamp when the conversation was created")
    updated_at: datetime = Field(..., description="Timestamp when the conversation was last updated")
    message_count: Optional[int] = Field(None, description="Number of messages in this conversation")
    last_message: Optional[Message] = Field(None, description="The most recent message in this conversation")
    
    class Config:
        from_attributes = True  # ORM mode for SQLAlchemy models

class ChatRequest(BaseModel):
    """Input schema for chat endpoint"""
    message: str = Field(
        ..., 
        min_length=1, 
        description="The message content from the user"
    )
    conversation_id: Optional[int] = Field(
        None, 
        description="ID of an existing conversation, or null to create a new one"
    )

class ChatResponse(BaseModel):
    """Response schema for chat endpoint"""
    conversation_id: int = Field(..., description="ID of the conversation")
    user_message: Message = Field(..., description="The user message that was sent")
    ai_response: Message = Field(..., description="The AI response message")

class StreamResponse(BaseModel):
    """WebSocket streaming response schema"""
    text: str = Field(..., description="Chunk of text in the streaming response")
    conversation_id: int = Field(..., description="ID of the conversation")
    status: Literal["streaming", "complete", "error"] = Field(
        ..., 
        description="Status of the streaming response"
    )
    error: Optional[str] = Field(None, description="Error message if status is 'error'")

class ConversationStatsResponse(BaseModel):
    """Statistics about conversations"""
    total_conversations: int = Field(..., description="Total number of conversations")
    total_messages: int = Field(..., description="Total number of messages")
    avg_messages_per_conversation: float = Field(..., description="Average number of messages per conversation")

    @validator('avg_messages_per_conversation')
    def round_average(cls, v):
        """Round to 2 decimal places"""
        return round(v, 2) 