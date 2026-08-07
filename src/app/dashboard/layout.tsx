import { DashboardShell } from "./dashboard-shell";

export const dynamic = "force-dynamic";

/** Shell del área asesora — renderizado siempre dinámico (sin caché en Vercel). */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
