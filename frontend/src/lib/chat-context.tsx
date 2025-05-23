"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { apiClient } from "./api-client";
import {
  ChatMessage,
  ChatWebSocket,
  StreamResponse,
  WebSocketState,
} from "./websocket";

type ChatContextType = {
  messages: ChatMessage[];
  sendMessage: (content: string) => void;
  isLoading: boolean;
  conversationId: number | null;
  setConversationId: (id: number | null) => void;
  clearMessages: () => void;
  connectionStatus: WebSocketState;
  loadConversation: (id: number) => Promise<void>;
};

const ChatContext = createContext<ChatContextType | null>(null);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
};

type ChatProviderProps = {
  children: React.ReactNode;
  websocketUrl?: string;
};

// Get WebSocket URL from environment variables or use default
const DEFAULT_WEBSOCKET_URL = "ws://localhost:8000/ws/chat";
const getWebSocketUrl = () => {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_WEBSOCKET_URL || DEFAULT_WEBSOCKET_URL;
  }
  return DEFAULT_WEBSOCKET_URL;
};

export const ChatProvider: React.FC<ChatProviderProps> = ({
  children,
  websocketUrl = getWebSocketUrl(),
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<WebSocketState>("closed");

  // Use refs to maintain the current ChatWebSocket instance and streaming state
  const webSocketRef = useRef<ChatWebSocket | null>(null);
  const currentResponse = useRef<string>("");
  const streamingMessageId = useRef<string | null>(null);

  // Initialize WebSocket
  useEffect(() => {
    const webSocket = new ChatWebSocket(websocketUrl);
    webSocketRef.current = webSocket;

    const unsubscribeMessage = webSocket.onMessage(handleWebSocketMessage);
    const unsubscribeState = webSocket.onStateChange(setConnectionStatus);

    webSocket.connect();

    return () => {
      unsubscribeMessage();
      unsubscribeState();
      webSocket.disconnect();
    };
  }, [websocketUrl]);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback(
    (response: StreamResponse) => {
      if (response.status === "error") {
        // Show error in UI by adding it as a system message
        setMessages((prev) => [
          ...prev,
          {
            id: uuidv4(),
            role: "assistant",
            content: `Error: ${response.error || "Unknown error occurred"}`,
            conversationId: response.conversation_id,
            timestamp: new Date(),
          },
        ]);
        setIsLoading(false);
        return;
      }

      // Set the conversation ID if we don't have one yet
      if (!conversationId && response.conversation_id) {
        setConversationId(response.conversation_id);
      }

      if (response.status === "streaming") {
        // Ensure text is defined and properly handled
        const textChunk = response.text !== undefined ? response.text : "";

        if (textChunk || textChunk === "") {
          // Add the chunk to the current response
          currentResponse.current += textChunk;

          // Create a new streaming message or update the existing one
          setMessages((prevMessages) => {
            // If we already have a streaming message, update it
            if (streamingMessageId.current) {
              return prevMessages.map((msg) => {
                if (msg.id === streamingMessageId.current) {
                  return { ...msg, content: currentResponse.current };
                }
                return msg;
              });
            }
            // Otherwise create a new message
            else {
              const newMessageId = uuidv4();

              streamingMessageId.current = newMessageId;
              return [
                ...prevMessages,
                {
                  id: newMessageId,
                  role: "assistant",
                  content: currentResponse.current,
                  conversationId: response.conversation_id,
                  timestamp: new Date(),
                },
              ];
            }
          });
        }
      }
      // Handle stream completion
      else if (response.status === "complete") {
        setIsLoading(false);
        // Reset streaming state
        streamingMessageId.current = null;
        currentResponse.current = "";
      }
    },
    [conversationId]
  );

  // Create a conversation if we don't have one
  const ensureConversation = useCallback(async () => {
    if (!conversationId) {
      try {
        const conversation = await apiClient.createConversation(
          "New conversation"
        );
        setConversationId(conversation.id);
        return conversation.id;
      } catch (error) {
        console.error("Error creating conversation:", error);
        throw error;
      }
    }
    return conversationId;
  }, [conversationId]);

  // Send a message to the WebSocket server
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      try {
        setIsLoading(true);

        // Ensure we have a conversation ID
        const activeConversationId = await ensureConversation();

        // Add user message to local state
        const userMessage: ChatMessage = {
          id: uuidv4(),
          role: "user",
          content,
          conversationId: activeConversationId,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);

        // Check if this is the first message in the conversation and update the title if it is
        const shouldUpdateTitle = messages.length === 0;

        // Make sure WebSocket is connected
        if (webSocketRef.current && connectionStatus !== "open") {
          webSocketRef.current.connect();
          // Wait briefly for connection to establish
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // Send message through WebSocket
        if (webSocketRef.current) {
          currentResponse.current = ""; // Reset current response
          streamingMessageId.current = null; // Reset streaming message ID

          webSocketRef.current.sendMessage(content, activeConversationId);
        } else {
          console.error("WebSocket not available");
          setIsLoading(false);
        }

        // Update conversation title if this was the first message
        if (shouldUpdateTitle) {
          try {
            // Create a title from the first user message (truncate if too long)
            const maxTitleLength = 50;
            let newTitle = content.trim();
            if (newTitle.length > maxTitleLength) {
              newTitle = newTitle.substring(0, maxTitleLength) + "...";
            }

            await apiClient.updateConversationTitle(
              activeConversationId,
              newTitle
            );
          } catch (error) {
            console.error("Error updating conversation title:", error);
          }
        }
      } catch (error) {
        console.error("Error sending message:", error);
        setIsLoading(false);
      }
    },
    [connectionStatus, conversationId, ensureConversation, messages.length]
  );

  // Clear the current conversation
  const clearMessages = useCallback(() => {
    // Reset all conversation-related state
    setMessages([]);
    setConversationId(null);
    currentResponse.current = "";
    streamingMessageId.current = null;
  }, []);

  // Load an existing conversation
  const loadConversation = useCallback(async (id: number) => {
    try {
      setIsLoading(true);
      const conversation = await apiClient.getConversation(id);

      setConversationId(conversation.id);
      // Convert messages to the internal format
      const formattedMessages: ChatMessage[] = conversation.messages.map(
        (msg) => ({
          id: `${msg.id}`,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          conversationId: conversation.id,
          timestamp: new Date(msg.created_at),
        })
      );
      setMessages(formattedMessages);
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading conversation:", error);
      setIsLoading(false);
    }
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        sendMessage,
        isLoading,
        conversationId,
        setConversationId,
        clearMessages,
        connectionStatus,
        loadConversation,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
