"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { cn } from "@/lib/utils";

/**
 * Shared shell for every authenticated screen: fixed 260px sidebar + a content
 * column with the top utility bar. Standard screens are capped at 1440px;
 * full-bleed screens (Leads) use the entire content width and height.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const fullBleed = pathname?.startsWith("/dashboard/leads") ?? false;

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar />
      <div className="lg:pl-[260px]">
        <div
          className={cn(
            "mx-auto w-full px-6 sm:px-8 lg:px-10",
            fullBleed ? "max-w-none" : "max-w-[1440px]",
          )}
        >
          <Header />
          <main className={fullBleed ? "" : "pb-16"}>{children}</main>
        </div>
      </div>
    </div>
  );
}
