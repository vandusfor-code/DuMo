import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminNotificationsMount } from "@/components/admin/admin-notifications-mount";
import { getTokenPayload } from "@/lib/require-admin";
import { AdminShell } from "./admin-shell";

export const dynamic = "force-dynamic";

/** Shell del área de administración: sidebar admin + contenido a ancho completo. */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const payload = await getTokenPayload();

  if (!payload) {
    redirect("/login");
  }

  if (payload.role === "asesora") {
    redirect("/dashboard");
  }

  return (
    <>
      <AdminNotificationsMount />
      <AdminSidebar />
      <AdminShell>{children}</AdminShell>
    </>
  );
}
