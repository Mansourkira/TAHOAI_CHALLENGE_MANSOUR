"use client";

import { useToast } from "@/components/ui/toast";
import { useChatContext } from "@/lib/chat-context";
import { cn } from "@/lib/utils";
import { type ChatMessage } from "@/lib/websocket";
import { ArrowUpIcon, Copy, Mic, MicOff, RefreshCcw } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { MessageSkeleton, ThinkingDots } from "./skeleton";

// Add SpeechRecognition type definitions
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  error: any;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onerror: ((event: SpeechRecognitionEvent) => void) | null;
  onstart: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
}

// Add global types
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

export function ChatInterface() {
  const { messages, sendMessage, isLoading, clearMessages, conversationId } =
    useChatContext();
  const [inputValue, setInputValue] = useState("");
  const [typedMessages, setTypedMessages] = useState<ChatMessage[]>([]);
  const [typingIndex, setTypingIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMicSupported, setIsMicSupported] = useState(false);
  const [previousConversationId, setPreviousConversationId] = useState<
    number | null
  >(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Track conversation ID changes to detect when we're loading a different conversation
  useEffect(() => {
    // If conversation ID has changed, immediately display all messages without animation
    if (conversationId !== previousConversationId) {
      setTypedMessages(messages);
      setTypingIndex(messages.length);
      setPreviousConversationId(conversationId);
    }
  }, [conversationId, messages, previousConversationId]);

  // Check if speech recognition is supported
  useEffect(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      setIsMicSupported(true);
    } else {
      setIsMicSupported(false);
    }
  }, []);

  // Set hasStartedChat to true if there are messages
  useEffect(() => {
    if (messages.length > 0 && !hasStartedChat) {
      setHasStartedChat(true);
    }
  }, [messages, hasStartedChat]);

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

    // If conversation ID has changed, or we're loading an existing conversation, skip animations
    if (conversationId !== previousConversationId) {
      return; // Skip animations for loaded conversations, handled in the other effect
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
  }, [
    messages,
    typingIndex,
    isGenerating,
    conversationId,
    previousConversationId,
  ]);

  const handleSendMessage = () => {
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue);
      setInputValue("");
      if (!hasStartedChat) {
        setHasStartedChat(true);
      }
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

  // Toggle voice recognition
  const toggleListening = () => {
    if (!isMicSupported) {
      showToast(
        "Speech recognition is not supported in your browser.",
        "error"
      );
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Start voice recognition
  const startListening = () => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      showToast(
        "Speech recognition is not supported in your browser.",
        "error"
      );
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        showToast("Listening...", "info");
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0])
          .map((result) => result.transcript)
          .join("");

        setInputValue(transcript);

        // Auto-resize the textarea
        if (inputRef.current) {
          inputRef.current.style.height = "auto";
          const newHeight = Math.min(inputRef.current.scrollHeight + 2, 200);
          inputRef.current.style.height = `${newHeight}px`;
        }
      };

      recognition.onerror = (event: SpeechRecognitionEvent) => {
        console.error("Speech recognition error", event.error);
        showToast(`Error: ${event.error}`, "error");
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      showToast("Failed to start speech recognition.", "error");
      setIsListening(false);
    }
  };

  // Stop voice recognition
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col w-full transition-all duration-500 ease-in-out",
        hasStartedChat ? "h-full" : "mt-16"
      )}
    >
      {/* Chat messages area - with visible scrollbar when content is large */}
      <div
        className={cn(
          "overflow-y-auto mb-5 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm",
          hasStartedChat ? "flex-1 min-h-0" : "max-h-[400px]"
        )}
        style={{ overflowY: "auto", display: "flex", flexDirection: "column" }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <div className="max-w-md space-y-5">
              <h2 className="text-2xl font-bold text-neutral-800 dark:text-white">
                What can I help with?
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                <SuggestionButton
                  onClick={() => {
                    sendMessage("What can you help me with?");
                    setHasStartedChat(true);
                  }}
                  disabled={isLoading}
                >
                  What can you help me with?
                </SuggestionButton>
                <SuggestionButton
                  onClick={() => {
                    sendMessage("Tell me about Taho AI");
                    setHasStartedChat(true);
                  }}
                  disabled={isLoading}
                >
                  Tell me about Taho AI
                </SuggestionButton>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 px-2 w-full">
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

      {/* Fixed position input container at the bottom */}
      <div className="mt-auto">
        {/* Message input with animation */}
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

          <div className="absolute bottom-2 right-3 flex items-center gap-2">
            {/* Voice input button */}
            {isMicSupported && (
              <button
                onClick={toggleListening}
                disabled={isLoading}
                className={cn(
                  "p-2 rounded-lg transition-colors flex items-center justify-center",
                  isListening
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                )}
                aria-label={
                  isListening ? "Stop voice input" : "Start voice input"
                }
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            )}

            {/* Send button */}
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

        {/* Disclaimer */}
        <div className="text-xs text-center mt-2 text-neutral-500 dark:text-neutral-400">
          Taho AI may produce inaccurate information about people, places, or
          facts.
        </div>
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
