/**
 * Types for API responses
 */
export interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  conversation_id: number;
}

export interface Conversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  messages: Message[];
}

export interface ConversationSummary {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message?: {
    content: string;
    role: "user" | "assistant";
  };
}

export interface ConversationStats {
  total_conversations: number;
  total_messages: number;
  avg_messages_per_conversation: number;
}

// Backend URL from environment or default
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

/**
 * API client for direct calls to the FastAPI backend
 */
export const apiClient = {
  /**
   * Get a list of conversations
   */
  async getConversations(
    limit = 10,
    offset = 0
  ): Promise<ConversationSummary[]> {
    try {
      const response = await fetch(
        `${BACKEND_URL}/conversations?limit=${limit}&offset=${offset}`
      );
      if (!response.ok) {
        throw new Error(`Failed to get conversations: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error("Error fetching conversations:", error);
      throw error;
    }
  },

  /**
   * Get a specific conversation by ID
   */
  async getConversation(conversationId: number): Promise<Conversation> {
    try {
      const response = await fetch(
        `${BACKEND_URL}/conversations/${conversationId}`
      );
      if (!response.ok) {
        throw new Error(`Failed to get conversation: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error(`Error fetching conversation ${conversationId}:`, error);
      throw error;
    }
  },

  /**
   * Create a new conversation
   */
  async createConversation(title?: string): Promise<Conversation> {
    try {
      const response = await fetch(`${BACKEND_URL}/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: title || "New conversation" }),
      });
      if (!response.ok) {
        throw new Error(`Failed to create conversation: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error("Error creating conversation:", error);
      throw error;
    }
  },

  /**
   * Update the title of a conversation
   */
  async updateConversationTitle(
    conversationId: number,
    title: string
  ): Promise<Conversation> {
    try {
      const response = await fetch(
        `${BACKEND_URL}/conversations/${conversationId}/title`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title }),
        }
      );
      if (!response.ok) {
        throw new Error(
          `Failed to update conversation title: ${response.status}`
        );
      }
      return response.json();
    } catch (error) {
      console.error(
        `Error updating conversation ${conversationId} title:`,
        error
      );
      throw error;
    }
  },

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: number): Promise<void> {
    try {
      const response = await fetch(
        `${BACKEND_URL}/conversations/${conversationId}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        throw new Error(`Failed to delete conversation: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error deleting conversation ${conversationId}:`, error);
      throw error;
    }
  },

  /**
   * Get chat statistics
   */
  async getStats(): Promise<ConversationStats> {
    try {
      const response = await fetch(`${BACKEND_URL}/stats`);
      if (!response.ok) {
        throw new Error(`Failed to get stats: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error("Error fetching stats:", error);
      throw error;
    }
  },

  /**
   * Send a chat message directly to the backend
   */
  async sendChatMessage(message: string, conversationId: number): Promise<any> {
    try {
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          conversation_id: conversationId,
        }),
      });
      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error("Error sending chat message:", error);
      throw error;
    }
  },
};
