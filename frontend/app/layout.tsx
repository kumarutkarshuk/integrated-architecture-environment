import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "../components/ui/sonner";
import { clerkAppearance } from "../lib/clerkAppearance";
import "./globals.css";
import { Analytics } from '@vercel/analytics/next';

const siteUrl = "https://integrated-architecture-environment.vercel.app";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Integrated Architecture Environment",
  description: "Real-time AI-assisted system design workspace",
  openGraph: {
    title: "Integrated Architecture Environment",
    description:
      "Draw systems, share the canvas, let AI agents take control through WebMCP.",
    url: siteUrl,
    siteName: "Integrated Architecture Environment",
    type: "website",
    images: [
      {
        url: "/screenshot.png",
        width: 2933,
        height: 1391,
        alt: "Integrated Architecture Environment workspace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Integrated Architecture Environment",
    description:
      "Draw systems, share the canvas, let AI agents take control through WebMCP.",
    images: ["/screenshot.png"],
  },
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full">
          {children}
          <Toaster />
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
