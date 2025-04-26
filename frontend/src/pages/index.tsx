import { ChatProvider } from "@/lib/chat-context";
import dynamic from "next/dynamic";
import { Geist, Geist_Mono } from "next/font/google";
import Head from "next/head";
import Image from "next/image";

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

export default function Home() {
  return (
    <>
      <Head>
        <title>Taho AI - Chat Assistant</title>
      </Head>
      <div
        className={`${geistSans.className} ${geistMono.className} flex flex-col items-center justify-center min-h-screen p-4 sm:p-8 bg-white dark:bg-neutral-950 text-black dark:text-white`}
      >
        <header className="w-full max-w-4xl mx-auto mb-8 flex flex-col items-center">
          <div className="relative w-40 h-40 mb-4">
            <Image
              src="/taho-ai-logo.png"
              alt="Taho AI Logo"
              fill
              style={{ objectFit: "contain" }}
              priority
            />
          </div>
          <h1 className="text-4xl font-bold text-black dark:text-white text-center mb-2">
            How can Taho AI assist you today?
          </h1>
        </header>
        <main className="w-full max-w-4xl mx-auto flex flex-col flex-grow">
          <ChatProvider>
            <DynamicChatInterface />
          </ChatProvider>
        </main>
      </div>
    </>
  );
}
