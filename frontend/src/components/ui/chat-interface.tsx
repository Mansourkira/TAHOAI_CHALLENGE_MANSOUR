"use client";

import { useChatContext } from "@/lib/chat-context";
import { cn } from "@/lib/utils";
import { type ChatMessage } from "@/lib/websocket";
import { ArrowUpIcon, RefreshCcw, Trash2 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

export function ChatInterface() {
  const { messages, sendMessage, isLoading, clearMessages, connectionStatus } =
    useChatContext();
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSendMessage = () => {
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue);
      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-resize textarea
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setInputValue(textarea.value);

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto";

    // Set height to scrollHeight + 2px for borders
    const newHeight = Math.min(textarea.scrollHeight + 2, 200); // Max height: 200px
    textarea.style.height = `${newHeight}px`;
  };

  return (
    <div className="flex flex-col h-full w-full max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div
            className={cn("w-2 h-2 rounded-full mr-2", {
              "bg-green-500": connectionStatus === "open",
              "bg-yellow-500": connectionStatus === "connecting",
              "bg-red-500":
                connectionStatus === "closed" || connectionStatus === "error",
            })}
          />
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {connectionStatus === "open"
              ? "Connected"
              : connectionStatus === "connecting"
              ? "Connecting..."
              : "Disconnected"}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={clearMessages}
            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-800 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Clear chat"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mb-4 p-4 bg-neutral-100 dark:bg-neutral-900 rounded-lg border border-neutral-300 dark:border-neutral-800">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-neutral-500">
            <p>Start a conversation with Taho AI</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="relative bg-white dark:bg-neutral-900 rounded-lg border border-neutral-300 dark:border-neutral-700 overflow-hidden">
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={handleTextareaInput}
          onKeyDown={handleKeyDown}
          placeholder="Ask Taho AI a question..."
          className="w-full px-4 py-3 resize-none bg-transparent border-none text-neutral-800 dark:text-white text-sm focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-neutral-500 placeholder:text-sm min-h-[60px]"
          style={{ overflow: "auto", height: "60px" }}
          disabled={isLoading}
        />

        <div className="absolute bottom-2 right-2">
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className={cn(
              "p-2 rounded-lg transition-colors flex items-center justify-center",
              inputValue.trim() && !isLoading
                ? "bg-black text-white dark:bg-white dark:text-black hover:opacity-90"
                : "text-neutral-400 bg-neutral-200 dark:bg-neutral-800 cursor-not-allowed"
            )}
            aria-label="Send message"
          >
            {isLoading ? (
              <RefreshCcw size={16} className="animate-spin" />
            ) : (
              <ArrowUpIcon size={16} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  return (
    <div
      className={cn(
        "mb-4 last:mb-0 max-w-[85%] rounded-lg p-3",
        message.role === "user"
          ? "bg-neutral-200 dark:bg-neutral-800 ml-auto"
          : "bg-white dark:bg-neutral-700 mr-auto"
      )}
    >
      <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
        {message.role === "user" ? "You" : "Taho AI"}
      </div>
      <div
        className={cn(
          "text-sm whitespace-pre-wrap",
          message.role === "user"
            ? "text-neutral-800 dark:text-white"
            : "text-neutral-800 dark:text-white"
        )}
      >
        {message.content}
      </div>
    </div>
  );
}
