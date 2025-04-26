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
  clearMessages: () => void;
  connectionStatus: WebSocketState;
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
        console.error("WebSocket error:", response.error);
        setIsLoading(false);
        return;
      }

      // Set the conversation ID if we don't have one yet
      if (!conversationId && response.conversation_id) {
        setConversationId(response.conversation_id);
      }

      if (response.status === "streaming" && response.text) {
        currentResponse.current += response.text;

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

  // Send a message to the WebSocket server
  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim()) return;

      // Add user message to local state
      const userMessage: ChatMessage = {
        id: uuidv4(),
        role: "user",
        content,
        conversationId: conversationId || undefined,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      // Reset streaming state
      currentResponse.current = "";
      streamingMessageId.current = null;

      // Send via WebSocket
      if (webSocketRef.current) {
        // The WebSocket class now handles null values correctly
        webSocketRef.current.sendMessage(content, conversationId);
      }
    },
    [conversationId]
  );

  // Clear all messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    currentResponse.current = "";
    streamingMessageId.current = null;
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        sendMessage,
        isLoading,
        conversationId,
        clearMessages,
        connectionStatus,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
