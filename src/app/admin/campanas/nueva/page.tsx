import { redirect } from "next/navigation";
import { getTokenPayload } from "@/lib/require-admin";
import { NewCampaignWizard } from "./new-campaign-wizard";

export const dynamic = "force-dynamic";

export default async function NewCampaignPage() {
  const payload = await getTokenPayload();
  if (!payload || payload.role !== "administrador") {
    redirect("/admin");
  }

  return <NewCampaignWizard />;
}
