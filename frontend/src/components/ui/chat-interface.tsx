"use client";

import { useToast } from "@/components/ui/toast";
import { useChatContext } from "@/lib/chat-context";
import { cn } from "@/lib/utils";
import { type ChatMessage } from "@/lib/websocket";
import { ArrowUpIcon, Copy, RefreshCcw } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { MessageSkeleton, ThinkingDots } from "./skeleton";

export function ChatInterface() {
  const { messages, sendMessage, isLoading, clearMessages, conversationId } =
    useChatContext();
  const [inputValue, setInputValue] = useState("");
  const [typedMessages, setTypedMessages] = useState<ChatMessage[]>([]);
  const [typingIndex, setTypingIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [typedMessages, isLoading]);

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle the typing animation effect for new messages
  useEffect(() => {
    if (messages.length === 0) {
      setTypedMessages([]);
      setTypingIndex(0);
      return;
    }

    // If we're already showing all messages, just update
    if (typingIndex >= messages.length) {
      setTypedMessages(messages);
      setTypingIndex(messages.length);
      return;
    }

    // Skip animation for user messages, only animate AI responses
    if (typingIndex < messages.length) {
      const nextMessage = messages[typingIndex];

      if (nextMessage.role === "user") {
        // For user messages, add immediately
        setTypedMessages((prev) => [
          ...prev.slice(0, typingIndex),
          nextMessage,
        ]);
        setTypingIndex((prev) => prev + 1);
      } else if (!isGenerating) {
        // For AI messages, add with a typing effect
        setIsGenerating(true);

        // Show immediate first chunk, then animate the rest
        const immediateContent = nextMessage.content.substring(0, 1);
        const temp = { ...nextMessage, content: immediateContent };
        setTypedMessages((prev) => [...prev.slice(0, typingIndex), temp]);

        // Simulate typing animation for AI message
        let charIndex = 1;
        const maxSpeed = 30; // ms per character at fastest
        const totalLength = nextMessage.content.length;

        const typeNextChar = () => {
          if (charIndex <= totalLength) {
            // Exponential increase in chunk size for longer responses
            const chunkSize = Math.min(
              5 + Math.floor(charIndex / 20), // Gradually increase chunk size
              15 // Maximum chunk size
            );

            const nextChunk = nextMessage.content.substring(
              0,
              charIndex + chunkSize
            );
            setTypedMessages((prev) => [
              ...prev.slice(0, typingIndex),
              { ...nextMessage, content: nextChunk },
            ]);

            charIndex += chunkSize;

            // Variable speed based on response length
            const delay = Math.max(
              maxSpeed - Math.floor(totalLength / 200),
              10
            );
            setTimeout(typeNextChar, delay);
          } else {
            // Typing complete, move to next message
            setTypedMessages((prev) => [
              ...prev.slice(0, typingIndex),
              nextMessage,
            ]);
            setTypingIndex((prev) => prev + 1);
            setIsGenerating(false);
          }
        };

        // Start typing animation
        setTimeout(typeNextChar, 300);
      }
    }
  }, [messages, typingIndex, isGenerating]);

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
    <div className="flex flex-col h-full w-full">
      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto mb-5 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <div className="max-w-md space-y-5">
              <h2 className="text-2xl font-bold text-neutral-800 dark:text-white">
                How can I help you today?
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400">
                Ask me anything, and I'll do my best to assist you. I can help
                with general questions, creative writing, code explanations, and
                more.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                <SuggestionButton
                  onClick={() => sendMessage("What can you help me with?")}
                  disabled={isLoading}
                >
                  What can you help me with?
                </SuggestionButton>
                <SuggestionButton
                  onClick={() => sendMessage("Tell me about Taho AI")}
                  disabled={isLoading}
                >
                  Tell me about Taho AI
                </SuggestionButton>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 px-2">
            {typedMessages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                isNew={
                  index === typingIndex - 1 && message.role === "assistant"
                }
              />
            ))}

            {/* Show typing indicator or skeleton while loading */}
            {isLoading && (
              <>{isGenerating ? <ThinkingDots /> : <MessageSkeleton />}</>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message input - fixed at bottom */}
      <div className="relative bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
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

        <div className="absolute bottom-2 right-3">
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
      <div className="text-xs text-center mt-2 text-neutral-500 dark:text-neutral-400">
        Taho AI may produce inaccurate information about people, places, or
        facts.
      </div>
    </div>
  );
}

interface SuggestionButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

function SuggestionButton({
  children,
  onClick,
  disabled,
}: SuggestionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="p-3 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 
        text-left text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  isNew?: boolean;
}

function MessageBubble({ message, isNew = false }: MessageBubbleProps) {
  const { showToast } = useToast();
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      showToast("Message copied to clipboard", "success");

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy message:", error);
      showToast("Failed to copy message", "error");
    }
  };

  return (
    <div
      className={cn(
        "mb-6 last:mb-0 max-w-[85%] rounded-lg p-4 group relative",
        message.role === "user"
          ? "bg-neutral-200 dark:bg-neutral-800 ml-auto animate-fade-in-up"
          : "bg-white dark:bg-neutral-700/70 mr-auto",
        isNew && message.role === "assistant" && "animate-fade-in-up"
      )}
    >
      <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 flex justify-between items-center">
        <span className="font-medium">
          {message.role === "user" ? "You" : "Taho AI"}
        </span>
        <button
          onClick={handleCopyMessage}
          className={cn(
            "p-1 rounded transition-opacity hover:bg-neutral-300/20 dark:hover:bg-neutral-600/30",
            isCopied ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          aria-label="Copy message"
        >
          <Copy size={14} className="text-neutral-500 dark:text-neutral-400" />
        </button>
      </div>
      <div
        className={cn(
          "text-sm whitespace-pre-wrap leading-relaxed",
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
