import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminNotificationsMount } from "@/components/admin/admin-notifications-mount";

/** Shell del área de administración: sidebar admin + contenido a ancho completo. */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <AdminNotificationsMount />
      <AdminSidebar />
      <div className="lg:pl-[260px]">
        <div className="w-full px-6 sm:px-8 lg:px-10 pb-12">{children}</div>
      </div>
    </div>
  );
}
