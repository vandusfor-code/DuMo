import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminNotificationsMount } from "@/components/admin/admin-notifications-mount";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session-cookie";

export const dynamic = "force-dynamic";

/** Shell del área de administración: sidebar admin + contenido a ancho completo. */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const payload = token ? verifySessionToken(token) : null;

  if (!payload) {
    redirect("/login");
  }

  if (payload.role === "asesora") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-canvas">
      <AdminNotificationsMount />
      <AdminSidebar />
      <div className="lg:pl-[260px]">
        <div className="w-full px-6 sm:px-8 lg:px-10 pb-16">{children}</div>
      </div>
    </div>
  );
}
