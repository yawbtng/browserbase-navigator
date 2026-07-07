import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Browserbase Navigator",
  description:
    "Ask the Browserbase ecosystem — Stagehand, the browse CLI, MCP server, Functions, Agents — and get answers with citations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
    >
      <body className="min-h-full flex flex-col">
        <script
          // Set the light class before paint so a light-preferring user doesn't flash dark.
          // Stored choice wins; otherwise honor the system preference; dark is the fallback,
          // so the absence of the class is the correct SSR state.
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.theme;if(t==='light'||(!t&&matchMedia('(prefers-color-scheme: light)').matches))document.documentElement.classList.add('light')}catch(e){}",
          }}
        />
        {children}
      </body>
    </html>
  );
}
