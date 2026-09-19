"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({ children }) {
  const pathname = usePathname();
  if (pathname.startsWith("/login")) return children;

  return (
    <div className="min-h-screen bg-[#f8f8f7] lg:flex">
      <Sidebar />
      <main className="animate-page-in min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-10 lg:py-9">
        {children}
      </main>
    </div>
  );
}
