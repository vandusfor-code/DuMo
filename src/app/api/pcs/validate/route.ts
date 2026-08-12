import { NextResponse, type NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { pcsValidationService } from "@/services/pcs-validation.service";
import type { PcsValidationInputRow } from "@/lib/pcs-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

/** Crea el job de validación PCS y lo encola en BullMQ. */
export async function POST(request: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const numeros = (body as { numeros?: unknown }).numeros;
  if (!Array.isArray(numeros)) {
    return NextResponse.json(
      { error: "El archivo no tiene el formato esperado (hoja 'Numeros', columnas PCS y Nombre)." },
      { status: 422 },
    );
  }

  const rows: PcsValidationInputRow[] = numeros.map((n) => ({
    pcs: String((n as { pcs?: unknown })?.pcs ?? ""),
    nombre: String((n as { nombre?: unknown })?.nombre ?? ""),
  }));

  try {
    const { jobId } = await pcsValidationService.createValidationJob(session.userId, rows);
    return NextResponse.json({ jobId });
  } catch (error) {
    console.error("[POST /api/pcs/validate]", error);
    const message = error instanceof Error ? error.message : "No se pudo iniciar la validación.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
