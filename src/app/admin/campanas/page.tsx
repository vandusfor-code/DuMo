import { redirect } from "next/navigation";
import { getTokenPayload } from "@/lib/require-admin";
import { CampaignsDashboardClient } from "./campaigns-dashboard-client";

export const dynamic = "force-dynamic";

/** Solo administrador — mensajería masiva es alto blast-radius (mismo criterio que Web-QR). */
export default async function AdminCampanasPage() {
  const payload = await getTokenPayload();
  if (!payload || payload.role !== "administrador") {
    redirect("/admin");
  }

  return <CampaignsDashboardClient />;
}
