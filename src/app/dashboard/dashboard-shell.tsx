"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { AdvisorMessageNotifications } from "@/components/messaging/message-notification-listener";

/** Shell del área asesora: sidebar fijo + contenido con separación lateral. */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fullBleed = pathname?.startsWith("/dashboard/leads") ?? false;

  // Leads: bloquear scroll del documento; solo scrollean las columnas internas.
  useEffect(() => {
    if (!fullBleed) return;
    const html = document.documentElement;
    const body = document.body;
    html.classList.add("leads-viewport-lock");
    body.classList.add("leads-viewport-lock");
    return () => {
      html.classList.remove("leads-viewport-lock");
      body.classList.remove("leads-viewport-lock");
    };
  }, [fullBleed]);

  return (
    <div className={fullBleed ? "h-dvh overflow-hidden bg-canvas" : "min-h-screen bg-canvas"}>
      <AdvisorMessageNotifications />
      <Sidebar />
      <main
        className={
          fullBleed
            ? "h-dvh overflow-hidden lg:pl-[260px]"
            : "lg:pl-[260px]"
        }
      >
        <div
          className={
            fullBleed
              ? "h-full min-h-0 overflow-hidden"
              : "w-full px-6 py-8 sm:px-8 lg:px-10"
          }
        >
          {children}
        </div>
      </main>
    </div>
  );
}
