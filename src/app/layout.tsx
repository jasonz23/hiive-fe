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
  title: "Hiive OS — Agentic Marketing Operating System",
  description:
    "A desktop OS for an autonomous marketing team: windowed apps to view, analyze, and control agents — memory, content calendar, approvals, integrations, and the agent loop.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* Pages render inside windowed iframes (padded); the desktop at "/" is fixed full-bleed. */}
      <body className="min-h-full">
        <div className="mx-auto max-w-6xl p-5 md:p-8">{children}</div>
      </body>
    </html>
  );
}
