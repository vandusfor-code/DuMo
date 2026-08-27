import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { pcsValidationService } from "@/services/pcs-validation.service";
import { businessDateISO } from "@/lib/date";

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
    const buffer = await pcsValidationService.buildResultsWorkbookBuffer(jobId);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="pcs_validados_${businessDateISO()}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/pcs/validate/:jobId/download]", error);
    const message = error instanceof Error ? error.message : "No se pudo generar el archivo.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
