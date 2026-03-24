import type { Metadata } from "next";
import "./globals.css";
import { BottomNav } from "@/components/navigation/bottom-nav";

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
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body className="bg-gradient-to-br from-slate-50 to-slate-100 pb-20 sm:pb-16">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
