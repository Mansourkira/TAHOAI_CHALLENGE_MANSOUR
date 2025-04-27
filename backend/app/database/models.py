from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Index, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import datetime
from typing import List, Optional
import enum

Base = declarative_base()

class RoleType(str, enum.Enum):
    """Message sender roles enum"""
    USER = "user"           # Messages from the user
    ASSISTANT = "assistant" # Messages from the AI assistant
    SYSTEM = "system"       # System messages (configuration/instructions)

class Conversation(Base):
    """
    Conversation model - represents a chat session
    """
    __tablename__ = "conversations"

    # Primary fields
    id = Column(Integer, primary_key=True, index=True)  # Unique identifier
    title = Column(String(255), default="New Conversation", nullable=False)  # Conversation title
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)  # Creation timestamp
    updated_at = Column(DateTime, 
                        default=datetime.datetime.utcnow, 
                        onupdate=datetime.datetime.utcnow,
                        nullable=False)  # Last update timestamp
    
    # Relationships
    messages = relationship("Message", 
                           back_populates="conversation", 
                           cascade="all, delete-orphan",  # Delete messages when conversation is deleted
                           lazy="selectin")  # Eager loading of messages
    
    # Indexes for faster querying
    __table_args__ = (
        Index('ix_conversations_updated_at', updated_at.desc()),  # Index for sorting by recency
    )
    
    def __repr__(self) -> str:
        return f"<Conversation(id={self.id}, title='{self.title}')>"

class Message(Base):
    """
    Message model - individual messages in a conversation
    """
    __tablename__ = "messages"

    # Primary fields
    id = Column(Integer, primary_key=True, index=True)  # Unique identifier
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)  # Parent conversation
    role = Column(String(10), nullable=False)  # Message sender (user/assistant/system)
    content = Column(Text, nullable=False)  # Message content
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)  # Creation timestamp
    
    # Relationships
    conversation = relationship("Conversation", back_populates="messages")  # Parent conversation
    
    # Indexes for faster querying
    __table_args__ = (
        Index('ix_messages_conversation_id_created_at', conversation_id, created_at),  # For chronological message retrieval
    )
    
    def __repr__(self) -> str:
        truncated_content = self.content[:30] + "..." if len(self.content) > 30 else self.content
        return f"<Message(id={self.id}, role='{self.role}', content='{truncated_content}')>"
    
    @property
    def is_user(self) -> bool:
        """Check if message is from user"""
        return self.role == RoleType.USER
    
    @property
    def is_assistant(self) -> bool:
        """Check if message is from assistant"""
        return self.role == RoleType.ASSISTANT 