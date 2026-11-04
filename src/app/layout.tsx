import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Nearvora — AI-powered Naira and crypto finance",
    template: "%s · Nearvora",
  },
  description:
    "Nearvora brings Naira banking, crypto wallets, swaps and an AI financial assistant into one calm, secure workspace. This build runs in clearly labelled demo mode.",
  applicationName: "Nearvora",
  keywords: ["Nearvora", "Naira", "crypto", "NEAR", "fintech", "Nigeria"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#08070f",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-bg text-fg antialiased">{children}</body>
    </html>
  );
}
