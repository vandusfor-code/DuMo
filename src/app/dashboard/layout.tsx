import { redirect } from "next/navigation";
import { getTokenPayload } from "@/lib/require-admin";
import { DashboardShell } from "./dashboard-shell";

export const dynamic = "force-dynamic";

/** Shell del área asesora — verificación de sesión en Node + UI cliente. */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const payload = await getTokenPayload();

  if (!payload) {
    redirect("/login");
  }

  if (payload.role !== "asesora") {
    redirect("/admin");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
