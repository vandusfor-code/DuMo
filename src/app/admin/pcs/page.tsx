import { redirect } from "next/navigation";
import { getTokenPayload } from "@/lib/require-admin";
import { PcsValidationClient } from "./pcs-validation-client";

export const dynamic = "force-dynamic";

/** Solo admin/supervisor — coincide con requireAdminSession() del lado API. */
export default async function PcsValidationPage() {
  const payload = await getTokenPayload();
  if (!payload || (payload.role !== "administrador" && payload.role !== "supervisor")) {
    redirect("/admin");
  }

  return <PcsValidationClient />;
}
