import { useToast } from "@/components/ui/toast";
import { ConversationSummary } from "@/lib/api-client";
import { useChatContext } from "@/lib/chat-context";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  LogOut,
  MessageSquarePlus,
  Moon,
  Pencil,
  Search,
  Settings,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface ConversationSidebarProps {
  onConversationSelect?: () => void;
}

export function ConversationSidebar({
  onConversationSelect,
}: ConversationSidebarProps) {
  const { clearMessages, loadConversation, conversationId, setConversationId } =
    useChatContext();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedConvoId, setCopiedConvoId] = useState<number | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [username, setUsername] = useState("Demo User"); // Default username
  const [editingConvoId, setEditingConvoId] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  // Add theme state
  const [theme, setTheme] = useState<"dark" | "light" | "system">("system");

  // Load conversation list on mount
  const fetchConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      const { apiClient } = await import("@/lib/api-client");
      const data = await apiClient.getConversations(20, 0);
      setConversations(data);
    } catch (error) {
      // Remove console.error
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

  // Focus the input when editing a conversation title
  useEffect(() => {
    if (editingConvoId !== null && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingConvoId]);

  // Add listener to cancel editing when clicking outside
  useEffect(() => {
    function handleClickOutsideEditField(event: MouseEvent) {
      if (
        editingConvoId !== null &&
        editInputRef.current &&
        !editInputRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest("button") // Don't cancel if clicking on a button
      ) {
        setEditingConvoId(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutsideEditField);
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideEditField);
    };
  }, [editingConvoId]);

  // Start a new conversation
  const handleNewConversation = () => {
    // Properly clear everything before starting a new conversation
    clearMessages();

    // Force a re-render of the conversation list
    setTimeout(() => {
      fetchConversations();
    }, 100);

    // Close the sidebar on mobile if needed
    if (onConversationSelect) {
      onConversationSelect();
    }
  };

  // Select a conversation
  const handleSelectConversation = (id: number) => {
    // Don't select if we're currently editing
    if (editingConvoId !== null) return;

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
      // Remove console.error
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
      // Remove console.error
      showToast("Error copying conversation", "error");
      setCopiedConvoId(null);
    }
  };

  // Start editing a conversation title
  const handleEditConversation = (
    e: React.MouseEvent,
    convo: ConversationSummary
  ) => {
    e.stopPropagation(); // Prevent selecting the conversation
    setEditingConvoId(convo.id);
    setNewTitle(convo.title);
  };

  // Save the edited conversation title
  const handleSaveTitle = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // Prevent selecting the conversation

    if (!newTitle.trim()) {
      showToast("Title cannot be empty", "error");
      return;
    }

    try {
      const { apiClient } = await import("@/lib/api-client");
      await apiClient.updateConversationTitle(id, newTitle);

      // Update local state
      setConversations((prev) =>
        prev.map((convo) =>
          convo.id === id ? { ...convo, title: newTitle } : convo
        )
      );

      // Exit edit mode
      setEditingConvoId(null);
      showToast("Conversation renamed", "success");
    } catch (error) {
      // Remove console.error
      showToast("Error renaming conversation", "error");
    }
  };

  // Cancel editing
  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the conversation
    setEditingConvoId(null);
  };

  // Handle key press in edit input
  const handleKeyDown = (e: React.KeyboardEvent, id: number) => {
    if (e.key === "Enter") {
      handleSaveTitle(e as unknown as React.MouseEvent, id);
    } else if (e.key === "Escape") {
      handleCancelEdit(e as unknown as React.MouseEvent);
    }
  };

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Clear search input
  const handleClearSearch = () => {
    setSearchQuery("");
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Filter conversations based on search query
  const filteredConversations = conversations.filter((convo) => {
    const searchLower = searchQuery.toLowerCase();
    const titleMatch = convo.title.toLowerCase().includes(searchLower);
    const contentMatch = convo.last_message?.content
      .toLowerCase()
      .includes(searchLower);
    return titleMatch || contentMatch;
  });

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

  // Theme toggle functionality
  useEffect(() => {
    // Check current theme from localStorage or default to system
    const savedTheme =
      (localStorage.getItem("ui-theme") as "dark" | "light" | "system") ||
      "system";
    setTheme(savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    localStorage.setItem("ui-theme", newTheme);
    setTheme(newTheme);

    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(newTheme);
  };

  // Additional options
  const handleAbout = () => {
    showToast("Taho AI Challenge Demo", "info");
    setUserDropdownOpen(false);
  };

  const handleGithub = () => {
    window.open(
      "https://github.com/Mansourkira/TAHOAI_CHALLENGE_MANSOUR",
      "_blank"
    );
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

      {/* Search input */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={14} className="text-neutral-400" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search conversations..."
            className="w-full py-2 pl-9 pr-8 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <X
                size={14}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 relative">
        {isLoading ? (
          <div className="flex justify-center p-4 text-neutral-500">
            Loading...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex justify-center p-4 text-neutral-500">
            {conversations.length === 0
              ? "No conversations yet"
              : "No conversations matching search"}
          </div>
        ) : (
          <ul className="space-y-1">
            {filteredConversations.map((convo) => (
              <li
                key={convo.id}
                onClick={() => handleSelectConversation(convo.id)}
                className={`p-3 rounded-lg cursor-pointer flex justify-between items-center group ${
                  conversationId === convo.id
                    ? "bg-neutral-200 dark:bg-neutral-800"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800/70"
                }`}
              >
                {editingConvoId === convo.id ? (
                  <div
                    className="flex-1 flex items-center space-x-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      ref={editInputRef}
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, convo.id)}
                      className="flex-1 p-1 text-sm bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500"
                    />
                    <button
                      onClick={(e) => handleSaveTitle(e, convo.id)}
                      className="p-1 rounded hover:bg-neutral-300/30 dark:hover:bg-neutral-700/50"
                      aria-label="Save new title"
                    >
                      <Check
                        size={16}
                        className="text-green-600 dark:text-green-400"
                      />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-1 rounded hover:bg-neutral-300/30 dark:hover:bg-neutral-700/50"
                      aria-label="Cancel editing"
                    >
                      <X size={16} className="text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                ) : (
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
                )}
                {editingConvoId !== convo.id && (
                  <div className="flex space-x-1">
                    <button
                      onClick={(e) => handleEditConversation(e, convo)}
                      className={`p-1.5 rounded hover:bg-neutral-300/30 dark:hover:bg-neutral-700/50 transition-opacity opacity-0 group-hover:opacity-100`}
                      aria-label="Rename conversation"
                    >
                      <Pencil
                        size={14}
                        className="text-neutral-500 dark:text-neutral-400"
                      />
                    </button>
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
                      className="p-1.5 rounded hover:bg-neutral-300/30 dark:hover:bg-neutral-700/50 transition-opacity opacity-0 group-hover:opacity-100"
                      aria-label="Delete conversation"
                    >
                      <Trash2
                        size={14}
                        className="text-neutral-500 dark:text-neutral-400"
                      />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Replace User section at bottom */}
      <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 relative">
        <div ref={userDropdownRef} className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-neutral-300 dark:bg-neutral-700 flex items-center justify-center">
                {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
              </div>
              <span className="text-sm font-medium">Taho AI Demo</span>
            </div>
            {userDropdownOpen ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
          </button>

          {userDropdownOpen && (
            <div className="absolute bottom-full left-0 mb-1 w-full bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden z-10">
              <div className="p-1">
                <button
                  onClick={toggleTheme}
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2"
                >
                  {theme === "dark" ? (
                    <>
                      <Sun size={16} />
                      <span>Light Mode</span>
                    </>
                  ) : (
                    <>
                      <Moon size={16} />
                      <span>Dark Mode</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleAbout}
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2"
                >
                  <Settings size={16} />
                  <span>About</span>
                </button>
                <button
                  onClick={handleGithub}
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2"
                >
                  <LogOut size={16} />
                  <span>GitHub Repo</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
