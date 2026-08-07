"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Shell del área admin: leads ocupa todo el viewport; el resto mantiene padding estándar. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fullBleed = pathname?.startsWith("/admin/leads") ?? false;

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
      <div
        className={
          fullBleed ? "h-dvh overflow-hidden lg:pl-[260px]" : "lg:pl-[260px]"
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
