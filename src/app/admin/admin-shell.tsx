"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { APP_SIDEBAR_OFFSET_CLASS } from "@/components/layout/app-shell.constants";
import { AdvisorPresenceSelect } from "@/components/leads/advisor-presence-select";
import { usePresenceDisconnectBeacon } from "@/hooks/use-presence-disconnect-beacon";
import { cn } from "@/lib/utils";

/** Shell del área admin: leads ocupa todo el viewport; el resto mantiene padding estándar. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fullBleed = pathname?.startsWith("/admin/leads") ?? false;
  usePresenceDisconnectBeacon();

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
      <div className="fixed right-[88px] top-4 z-40">
        <AdvisorPresenceSelect />
      </div>
      <div
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
              : "w-full px-6 sm:px-8 lg:px-10 pb-16"
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
}
