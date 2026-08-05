"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { AdvisorMessageNotifications } from "@/components/messaging/message-notification-listener";

/**
 * Shared shell for every authenticated screen: fixed 260px sidebar + content
 * flush to the sidebar edge (no left gutter). Leads is full-bleed; other
 * screens keep vertical padding and right inset only.
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
      <AdvisorMessageNotifications />
      <Sidebar />
      <main className={fullBleed ? "h-dvh overflow-hidden lg:pl-[260px]" : "py-8 lg:pl-[260px] pr-6 sm:pr-8 lg:pr-10"}>
        {children}
      </main>
    </div>
  );
}
