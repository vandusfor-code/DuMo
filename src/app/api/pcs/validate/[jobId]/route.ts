import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { pcsValidationService } from "@/services/pcs-validation.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { jobId } = await context.params;
  try {
    const detail = await pcsValidationService.getJobDetail(jobId);
    return NextResponse.json(detail);
  } catch (error) {
    console.error("[GET /api/pcs/validate/:jobId]", error);
    const message = error instanceof Error ? error.message : "No se pudo obtener la validación.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
