import { ChatProvider } from "@/lib/chat-context";
import { Menu, X } from "lucide-react";
import dynamic from "next/dynamic";
import { Geist, Geist_Mono } from "next/font/google";
import Head from "next/head";
import Image from "next/image";
import { useState } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Dynamically import the chat component with no SSR
const DynamicChatInterface = dynamic(
  () =>
    import("@/components/ui/chat-interface").then((mod) => ({
      default: mod.ChatInterface,
    })),
  { ssr: false }
);

// Dynamically import the sidebar component with no SSR
const DynamicConversationSidebar = dynamic(
  () =>
    import("@/components/ui/conversation-sidebar").then((mod) => ({
      default: mod.ConversationSidebar,
    })),
  { ssr: false }
);

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <>
      <Head>
        <title>Taho AI - Chat Assistant</title>
      </Head>
      <div
        className={`${geistSans.className} ${geistMono.className} flex flex-col h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-950 text-black dark:text-white`}
      >
        <header className="w-full py-3 px-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-white dark:bg-neutral-900 shadow-sm">
          <button
            onClick={toggleSidebar}
            className="md:hidden p-2 rounded-lg text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex items-center md:mx-0">
            <div className="relative w-8 h-8 mr-2.5">
              <Image
                src="/taho-ai-logo.png"
                alt="Taho AI Logo"
                fill
                sizes="(max-width: 768px) 100vw, 32px"
                style={{ objectFit: "contain" }}
                priority
              />
            </div>
            <h1 className="text-lg font-bold text-black dark:text-white">
              Taho AI
            </h1>
          </div>

          <div className="md:hidden w-10"></div>
        </header>

        <main className="w-full flex flex-grow relative overflow-hidden">
          <ChatProvider>
            {/* Mobile sidebar overlay */}
            <div
              className={`fixed inset-0 bg-black/50 z-10 md:hidden transition-opacity duration-200 ${
                sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
              onClick={toggleSidebar}
            ></div>

            {/* Sidebar */}
            <div
              className={`fixed md:static top-0 bottom-0 left-0 z-20 md:z-auto h-full transition-transform duration-300 md:translate-x-0 ${
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
              } flex-shrink-0`}
            >
              <DynamicConversationSidebar onConversationSelect={closeSidebar} />
            </div>

            {/* Main chat area - allow the chat interface to handle scrolling */}
            <div className="flex-1 p-4 md:p-6 w-full flex items-start justify-center h-full overflow-hidden">
              <div className="w-full max-w-2xl h-full flex flex-col">
                <DynamicChatInterface />
              </div>
            </div>
          </ChatProvider>
        </main>
      </div>
    </>
  );
}
