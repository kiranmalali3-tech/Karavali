import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata = {
  title: "KARAVALI - Coastal Fisheries Supply-Chain Tracking",
  description: "Operational software layer for fish landings, dispatch records, and buyer outreach management behind autonomous calling agents.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
          {children}
        </main>
        <footer className="bg-white border-t border-slate-200 py-3 text-xs text-slate-500 text-center">
          <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
            <span>KARAVALI Fisheries Management Platform • Coastal Karnataka (Mangaluru - Malpe - Gangolli - Tadadi)</span>
            <span>Documented REST API Active • Storage: Persistent Relational SQLite</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
