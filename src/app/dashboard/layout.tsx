import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session-cookie";
import { DashboardShell } from "./dashboard-shell";

export const dynamic = "force-dynamic";

/** Shell del área asesora — verificación de sesión en Node + UI cliente. */
export default async function DashboardLayout({
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

  if (payload.role !== "asesora") {
    redirect("/admin");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
