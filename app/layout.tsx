import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ArnieHelpProvider } from "@/components/arnie-help-context";
import { ArnieHelpWidget } from "@/components/arnie-help-widget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fair Round | High-End Pub Triangulation",
  description: "The fairest central meeting point for your group, powered by AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ArnieHelpProvider>
          {children}
          <ArnieHelpWidget />
        </ArnieHelpProvider>
      </body>
    </html>
  );
}
