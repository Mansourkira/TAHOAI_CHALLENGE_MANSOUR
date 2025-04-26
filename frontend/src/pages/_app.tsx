import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider defaultTheme="dark">
      <Head>
        <title>Taho AI - Chat Assistant</title>
        <meta
          name="description"
          content="AI-powered chat assistant by Taho AI"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ThemeToggle />
      <Component {...pageProps} />
    </ThemeProvider>
  );
}
