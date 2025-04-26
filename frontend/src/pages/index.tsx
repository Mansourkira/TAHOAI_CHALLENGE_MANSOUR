import dynamic from "next/dynamic";
import { Geist, Geist_Mono } from "next/font/google";
import Head from "next/head";
import Image from "next/image";
import { useEffect, useState } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Dynamically import the chat component with no SSR
const DynamicVercelV0Chat = dynamic(
  () =>
    import("@/components/ui/v0-ai-chat").then((mod) => ({
      default: mod.VercelV0Chat,
    })),
  { ssr: false }
);

export default function Home() {
  // Use client-side only rendering for the chat component
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
        </header>
        <main className="w-full max-w-4xl mx-auto flex items-center justify-center">
          {isMounted ? (
            <DynamicVercelV0Chat />
          ) : (
            <div className="w-full max-w-4xl p-4 space-y-8 flex flex-col items-center">
              <h1 className="text-4xl font-bold text-black dark:text-white text-center">
                How can Taho AI assist you today?
              </h1>
              <div className="w-full h-[300px] bg-neutral-200 dark:bg-neutral-900 rounded-xl border border-neutral-300 dark:border-neutral-800"></div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
