import type { Metadata } from "next";
import "./globals.css";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { Manrope, Space_Grotesk } from "next/font/google";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "Loadout - Inventory Management",
  description: "Single-user inventory app with scanning, reports, and reorder suggestions",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Loadout",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <meta name="theme-color" content="#0b1220" />
      </head>
      <body className={`${bodyFont.variable} ${headingFont.variable} pb-24 sm:pb-16`}>
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
