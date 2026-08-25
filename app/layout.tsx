// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/providers";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PCK Ledger",
  description: "Enterprise Multi-Project Financial Management",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950 lg:h-screen lg:flex-row lg:overflow-hidden">
            {/* Mobile Navigation */}
            <MobileNav />

            {/* Desktop Sidebar (Only visible on screens >= 1024px) */}
            <div className="hidden lg:flex">
              <Sidebar />
            </div>

            {/* Main Scrollable Viewport */}
            <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:p-8">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
