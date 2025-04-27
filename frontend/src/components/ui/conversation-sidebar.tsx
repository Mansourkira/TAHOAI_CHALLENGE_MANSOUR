import { useToast } from "@/components/ui/toast";
import { ConversationSummary } from "@/lib/api-client";
import { useChatContext } from "@/lib/chat-context";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  LogOut,
  MessageSquarePlus,
  Settings,
  Trash2,
  User,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface ConversationSidebarProps {
  onConversationSelect?: () => void;
}

export function ConversationSidebar({
  onConversationSelect,
}: ConversationSidebarProps) {
  const { clearMessages, loadConversation, conversationId } = useChatContext();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedConvoId, setCopiedConvoId] = useState<number | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [username, setUsername] = useState("Demo User"); // Default username
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  // Load conversation list on mount
  const fetchConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      const { apiClient } = await import("@/lib/api-client");
      const data = await apiClient.getConversations(20, 0);
      setConversations(data);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations, conversationId]);

  // Mock function to get user data - would be replaced with an actual API call
  useEffect(() => {
    // Simulate loading user data
    const getUserData = async () => {
      // In a real app, you would fetch this from an API
      setTimeout(() => {
        setUsername("Demo User");
      }, 500);
    };

    getUserData();
  }, []);

  // Start a new conversation
  const handleNewConversation = () => {
    clearMessages();
    if (onConversationSelect) {
      onConversationSelect();
    }
  };

  // Select a conversation
  const handleSelectConversation = (id: number) => {
    loadConversation(id);
    if (onConversationSelect) {
      onConversationSelect();
    }
  };

  // Delete a conversation
  const handleDeleteConversation = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // Prevent selecting the conversation when clicking delete
    try {
      const { apiClient } = await import("@/lib/api-client");
      await apiClient.deleteConversation(id);
      // Refresh conversations after delete
      fetchConversations();
      // If the current conversation was deleted, clear the messages
      if (conversationId === id) {
        clearMessages();
      }
      showToast("Conversation deleted", "success");
    } catch (error) {
      console.error(`Error deleting conversation ${id}:`, error);
      showToast("Error deleting conversation", "error");
    }
  };

  // Copy full conversation content
  const handleCopyConversation = async (
    e: React.MouseEvent,
    convo: ConversationSummary
  ) => {
    e.stopPropagation(); // Prevent selecting the conversation when clicking copy
    try {
      showToast("Copying conversation...", "info");
      setCopiedConvoId(convo.id);

      // Fetch the full conversation with all messages
      const { apiClient } = await import("@/lib/api-client");
      const fullConversation = await apiClient.getConversation(convo.id);

      // Format the conversation as text
      let conversationText = `# ${fullConversation.title}\n\n`;

      if (fullConversation.messages && fullConversation.messages.length > 0) {
        fullConversation.messages.forEach((message) => {
          const role = message.role === "user" ? "You" : "Taho AI";
          conversationText += `${role}: ${message.content}\n\n`;
        });
      } else {
        conversationText += "No messages in this conversation.";
      }

      // Copy to clipboard
      await navigator.clipboard.writeText(conversationText);

      // Show success toast
      showToast("Conversation copied to clipboard", "success");

      // Reset copied state after a delay
      setTimeout(() => {
        setCopiedConvoId(null);
      }, 2000);
    } catch (error) {
      console.error(`Error copying conversation ${convo.id}:`, error);
      showToast("Error copying conversation", "error");
      setCopiedConvoId(null);
    }
  };

  // Get a display title for a conversation
  const getDisplayTitle = (convo: ConversationSummary) => {
    // If title is "New conversation" and there's a last message from the user, use that instead
    if (
      convo.title === "New conversation" &&
      convo.last_message &&
      convo.last_message.role === "user"
    ) {
      // Truncate the message if it's too long
      const maxLength = 30;
      const content = convo.last_message.content;
      return content.length > maxLength
        ? content.substring(0, maxLength) + "..."
        : content;
    }
    return convo.title;
  };

  // Handle clicks outside the user dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle user menu options
  const handleUserAccount = () => {
    showToast("Account settings coming soon", "info");
    setUserDropdownOpen(false);
  };

  const handleSettings = () => {
    showToast("Settings coming soon", "info");
    setUserDropdownOpen(false);
  };

  const handleLogout = () => {
    showToast("Logout functionality coming soon", "info");
    setUserDropdownOpen(false);
  };

  return (
    <div className="w-64 h-full border-r border-neutral-200 dark:border-neutral-800 flex flex-col bg-neutral-50 dark:bg-neutral-900/80">
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
        <button
          onClick={handleNewConversation}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-black text-white dark:bg-white dark:text-black rounded-lg hover:opacity-90 transition-opacity font-medium"
        >
          <MessageSquarePlus size={16} />
          <span>New Chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 relative">
        {isLoading ? (
          <div className="flex justify-center p-4 text-neutral-500">
            Loading...
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex justify-center p-4 text-neutral-500">
            No conversations yet
          </div>
        ) : (
          <ul className="space-y-1">
            {conversations.map((convo) => (
              <li
                key={convo.id}
                onClick={() => handleSelectConversation(convo.id)}
                className={`p-3 rounded-lg cursor-pointer flex justify-between items-center group ${
                  conversationId === convo.id
                    ? "bg-neutral-200 dark:bg-neutral-800"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800/70"
                }`}
              >
                <div className="truncate flex-1">
                  <p className="text-sm font-medium truncate">
                    {getDisplayTitle(convo)}
                  </p>
                  {convo.last_message && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                      {convo.last_message.role === "user" ? "You: " : "AI: "}
                      {convo.last_message.content}
                    </p>
                  )}
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={(e) => handleCopyConversation(e, convo)}
                    className={`p-1.5 rounded hover:bg-neutral-300/30 dark:hover:bg-neutral-700/50 transition-opacity ${
                      copiedConvoId === convo.id
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                    }`}
                    aria-label="Copy conversation"
                  >
                    <Copy
                      size={14}
                      className="text-neutral-500 dark:text-neutral-400"
                    />
                  </button>
                  <button
                    onClick={(e) => handleDeleteConversation(e, convo.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-neutral-300/30 dark:hover:bg-neutral-700/50 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-opacity"
                    aria-label="Delete conversation"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* User dropdown at the bottom of sidebar */}
      <div
        className="p-3 border-t border-neutral-200 dark:border-neutral-800 flex-shrink-0"
        ref={userDropdownRef}
      >
        <button
          onClick={() => setUserDropdownOpen(!userDropdownOpen)}
          className="w-full flex items-center justify-between py-2 px-3 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-neutral-300 dark:bg-neutral-700 flex items-center justify-center">
              <User
                size={16}
                className="text-neutral-600 dark:text-neutral-300"
              />
            </div>
            <div className="text-left overflow-hidden">
              <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200 block truncate">
                {username}
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Free Plan
              </span>
            </div>
          </div>
          {userDropdownOpen ? (
            <ChevronUp size={16} className="text-neutral-500" />
          ) : (
            <ChevronDown size={16} className="text-neutral-500" />
          )}
        </button>

        {/* Dropdown menu */}
        {userDropdownOpen && (
          <div className="absolute bottom-16 left-3 right-3 py-1 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-lg z-10 animate-fade-in">
            <button
              onClick={handleUserAccount}
              className="w-full flex items-center gap-2 py-2 px-3 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-left"
            >
              <User size={16} className="text-neutral-500" />
              <span className="text-sm">Account</span>
            </button>
            <button
              onClick={handleSettings}
              className="w-full flex items-center gap-2 py-2 px-3 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-left"
            >
              <Settings size={16} className="text-neutral-500" />
              <span className="text-sm">Settings</span>
            </button>
            <div className="my-1 border-t border-neutral-200 dark:border-neutral-700"></div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 py-2 px-3 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-left text-red-500"
            >
              <LogOut size={16} className="text-red-500" />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
