"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { APP_SIDEBAR_OFFSET_CLASS } from "@/components/layout/app-shell.constants";
import { Sidebar } from "@/components/layout/sidebar";
import { AdvisorMessageNotifications } from "@/components/messaging/message-notification-listener";
import { AdvisorPresenceSelect } from "@/components/leads/advisor-presence-select";
import { AdvisorAvailabilityManager } from "@/components/leads/advisor-availability-manager";
import { usePresenceDisconnectBeacon } from "@/hooks/use-presence-disconnect-beacon";

/** Shell del área asesora: sidebar fijo + contenido con separación lateral. */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fullBleed = pathname?.startsWith("/dashboard/leads") ?? false;
  usePresenceDisconnectBeacon();

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
      <AdvisorAvailabilityManager />
      <Sidebar />
      <div className="fixed right-[88px] top-4 z-40">
        <AdvisorPresenceSelect />
      </div>
      <main
        className={
          fullBleed
            ? cn("h-dvh overflow-hidden", APP_SIDEBAR_OFFSET_CLASS)
            : APP_SIDEBAR_OFFSET_CLASS
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
