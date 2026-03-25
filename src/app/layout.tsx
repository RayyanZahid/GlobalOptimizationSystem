import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Global Optimization System - Understand Your Impact",
  description: "Calculate your carbon footprint, see how you compare to the world, and take action to reduce your impact.",
  openGraph: {
    title: "Global Optimization System",
    description: "Understand your impact. See how you compare. Take action.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#06060f] text-[#e8e8f0] scan-line bg-grid">
        {children}
      </body>
    </html>
  );
}
