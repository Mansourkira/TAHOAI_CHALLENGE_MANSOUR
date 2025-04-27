from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, update, delete, func
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional, Dict, Any, Tuple
import logging

from app.database.models import Conversation, Message, RoleType

# Set up logging
logger = logging.getLogger(__name__)

class ConversationRepository:
    """
    Repository for managing conversations and messages in the database.
    
    Provides methods for creating, retrieving, updating, and deleting
    conversations and messages, as well as specialized methods for
    chat functionality.
    """
    
    def __init__(self, db: AsyncSession):
        """
        Initialize the repository with a database session.
        
        Args:
            db: An async SQLAlchemy session
        """
        self.db = db
    
    async def create_conversation(self, title: str = "New Conversation") -> Conversation:
        """
        Create a new conversation.
        
        Args:
            title: Title for the conversation (default: "New Conversation")
            
        Returns:
            The created Conversation object
        
        Raises:
            SQLAlchemyError: If there's a database error
        """
        try:
            conversation = Conversation(title=title)
            self.db.add(conversation)
            await self.db.commit()
            await self.db.refresh(conversation)
            logger.info(f"Created new conversation with ID {conversation.id}")
            return conversation
        except SQLAlchemyError as e:
            logger.error(f"Error creating conversation: {str(e)}")
            await self.db.rollback()
            raise
    
    async def get_conversation(self, conversation_id: int) -> Optional[Conversation]:
        """
        Get a conversation by ID, including its messages.
        
        Args:
            conversation_id: ID of the conversation to retrieve
            
        Returns:
            The Conversation object or None if not found
        
        Raises:
            SQLAlchemyError: If there's a database error
        """
        try:
            query = select(Conversation).where(Conversation.id == conversation_id)
            query = query.options(selectinload(Conversation.messages))
            
            result = await self.db.execute(query)
            conversation = result.scalar_one_or_none()
            
            if conversation:
                logger.debug(f"Retrieved conversation {conversation_id} with {len(conversation.messages)} messages")
            else:
                logger.debug(f"Conversation {conversation_id} not found")
            
            return conversation
        except SQLAlchemyError as e:
            logger.error(f"Error retrieving conversation {conversation_id}: {str(e)}")
            raise
    
    async def list_conversations(self, limit: int = 10, offset: int = 0) -> List[Conversation]:
        """
        List conversations with pagination, ordered by most recently updated.
        
        Args:
            limit: Maximum number of conversations to return
            offset: Number of conversations to skip
            
        Returns:
            List of Conversation objects
        
        Raises:
            SQLAlchemyError: If there's a database error
        """
        try:
            query = select(Conversation).order_by(desc(Conversation.updated_at))
            query = query.limit(limit).offset(offset)
            
            result = await self.db.execute(query)
            conversations = result.scalars().all()
            
            logger.debug(f"Listed {len(conversations)} conversations (limit={limit}, offset={offset})")
            return conversations
        except SQLAlchemyError as e:
            logger.error(f"Error listing conversations: {str(e)}")
            raise
    
    async def list_conversations_with_messages(self, limit: int = 10, offset: int = 0) -> List[Conversation]:
        """
        List conversations with their messages, ordered by most recently updated.
        
        Args:
            limit: Maximum number of conversations to return
            offset: Number of conversations to skip
            
        Returns:
            List of Conversation objects with messages loaded
        
        Raises:
            SQLAlchemyError: If there's a database error
        """
        try:
            query = select(Conversation).order_by(desc(Conversation.updated_at))
            query = query.options(selectinload(Conversation.messages))
            query = query.limit(limit).offset(offset)
            
            result = await self.db.execute(query)
            conversations = result.scalars().all()
            
            logger.debug(f"Listed {len(conversations)} conversations with messages (limit={limit}, offset={offset})")
            return conversations
        except SQLAlchemyError as e:
            logger.error(f"Error listing conversations with messages: {str(e)}")
            raise
    
    async def get_conversation_count(self) -> int:
        """
        Get the total number of conversations.
        
        Returns:
            Total number of conversations
        
        Raises:
            SQLAlchemyError: If there's a database error
        """
        try:
            result = await self.db.execute(select(func.count()).select_from(Conversation))
            count = result.scalar_one()
            return count
        except SQLAlchemyError as e:
            logger.error(f"Error counting conversations: {str(e)}")
            raise
    
    async def delete_conversation(self, conversation_id: int) -> bool:
        """
        Delete a conversation and all its messages.
        
        Args:
            conversation_id: ID of the conversation to delete
            
        Returns:
            True if the conversation was deleted, False if not found
        
        Raises:
            SQLAlchemyError: If there's a database error
        """
        try:
            # Check if conversation exists
            conversation = await self.get_conversation(conversation_id)
            if not conversation:
                logger.debug(f"Conversation {conversation_id} not found for deletion")
                return False
            
            # Delete the conversation (messages will be cascade deleted)
            await self.db.execute(
                delete(Conversation).where(Conversation.id == conversation_id)
            )
            await self.db.commit()
            logger.info(f"Deleted conversation {conversation_id}")
            return True
        except SQLAlchemyError as e:
            logger.error(f"Error deleting conversation {conversation_id}: {str(e)}")
            await self.db.rollback()
            raise
    
    async def update_conversation_title(self, conversation_id: int, title: str) -> Optional[Conversation]:
        """
        Update the title of a conversation.
        
        Args:
            conversation_id: ID of the conversation to update
            title: New title for the conversation
            
        Returns:
            Updated Conversation object or None if not found
        
        Raises:
            SQLAlchemyError: If there's a database error
        """
        try:
            # Check if conversation exists
            conversation = await self.get_conversation(conversation_id)
            if not conversation:
                logger.debug(f"Conversation {conversation_id} not found for title update")
                return None
            
            # Update the conversation title
            await self.db.execute(
                update(Conversation)
                .where(Conversation.id == conversation_id)
                .values(title=title)
            )
            await self.db.commit()
            
            # Retrieve and return the updated conversation
            conversation = await self.get_conversation(conversation_id)
            logger.info(f"Updated title for conversation {conversation_id}")
            return conversation
        except SQLAlchemyError as e:
            logger.error(f"Error updating title for conversation {conversation_id}: {str(e)}")
            await self.db.rollback()
            raise
    
    async def add_message(self, conversation_id: int, role: str, content: str) -> Message:
        """
        Add a message to a conversation.
        
        Args:
            conversation_id: ID of the conversation to add the message to
            role: Role of the message sender (user or assistant)
            content: Content of the message
            
        Returns:
            The created Message object
        
        Raises:
            SQLAlchemyError: If there's a database error
            ValueError: If the role is invalid
        """
        try:
            # Validate role
            if role not in ["user", "assistant"]:
                raise ValueError(f"Invalid role: {role}. Must be 'user' or 'assistant'")
            
            # Create message
            message = Message(
                conversation_id=conversation_id,
                role=role,
                content=content
            )
            self.db.add(message)
            
            # Update conversation's updated_at timestamp
            await self.db.execute(
                update(Conversation)
                .where(Conversation.id == conversation_id)
                .values(updated_at=func.current_timestamp())
            )
            
            await self.db.commit()
            await self.db.refresh(message)
            logger.debug(f"Added {role} message to conversation {conversation_id}")
            return message
        except SQLAlchemyError as e:
            logger.error(f"Error adding message to conversation {conversation_id}: {str(e)}")
            await self.db.rollback()
            raise
    
    async def get_messages(self, conversation_id: int) -> List[Message]:
        """
        Get all messages for a conversation, ordered by creation time.
        
        Args:
            conversation_id: ID of the conversation to get messages for
            
        Returns:
            List of Message objects
        
        Raises:
            SQLAlchemyError: If there's a database error
        """
        try:
            query = (
                select(Message)
                .where(Message.conversation_id == conversation_id)
                .order_by(Message.created_at)
            )
            result = await self.db.execute(query)
            messages = result.scalars().all()
            logger.debug(f"Retrieved {len(messages)} messages for conversation {conversation_id}")
            return messages
        except SQLAlchemyError as e:
            logger.error(f"Error retrieving messages for conversation {conversation_id}: {str(e)}")
            raise
    
    async def get_message_history(self, conversation_id: int) -> List[Dict[str, str]]:
        """
        Get conversation history in format suitable for GROQ API.
        
        Args:
            conversation_id: ID of the conversation to get history for
            
        Returns:
            List of message dictionaries with role and content
        
        Raises:
            SQLAlchemyError: If there's a database error
        """
        try:
            messages = await self.get_messages(conversation_id)
            
            # Format messages for GROQ API
            history = [{"role": msg.role, "content": msg.content} for msg in messages]
            return history
        except SQLAlchemyError as e:
            logger.error(f"Error getting message history for conversation {conversation_id}: {str(e)}")
            raise
    
    async def get_stats(self) -> Dict[str, Any]:
        """
        Get statistics about conversations and messages.
        
        Returns:
            Dictionary with conversation statistics
        
        Raises:
            SQLAlchemyError: If there's a database error
        """
        try:
            # Get total conversations
            conversation_count_query = select(func.count()).select_from(Conversation)
            conversation_count_result = await self.db.execute(conversation_count_query)
            total_conversations = conversation_count_result.scalar_one()
            
            # Get total messages
            message_count_query = select(func.count()).select_from(Message)
            message_count_result = await self.db.execute(message_count_query)
            total_messages = message_count_result.scalar_one()
            
            # Calculate average messages per conversation
            avg_messages = 0 if total_conversations == 0 else total_messages / total_conversations
            
            return {
                "total_conversations": total_conversations,
                "total_messages": total_messages,
                "avg_messages_per_conversation": round(avg_messages, 2)
            }
        except SQLAlchemyError as e:
            logger.error(f"Error getting conversation statistics: {str(e)}")
            raise 