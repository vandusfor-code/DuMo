"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { AdvisorMessageNotifications } from "@/components/messaging/message-notification-listener";

/** Shell del área asesora: sidebar fijo + contenido con separación lateral. */
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
      <main className={fullBleed ? "h-dvh overflow-hidden lg:pl-[260px]" : "lg:pl-[260px]"}>
        <div className={fullBleed ? "h-full" : "w-full px-6 py-8 sm:px-8 lg:px-10"}>
          {children}
        </div>
      </main>
    </div>
  );
}
