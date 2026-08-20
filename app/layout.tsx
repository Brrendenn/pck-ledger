import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";

// Inter is excellent for data-dense financial applications
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ledger Pro | Financial Tracking",
  description: "Modern project expense and ledger tracking.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="antialiased">
      <body className={inter.className}>
        <div className="flex min-h-screen bg-white dark:bg-zinc-950">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl px-8 py-10">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
