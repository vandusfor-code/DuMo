import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { leadsService } from "@/services/leads.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Registra (o actualiza) un número conectado a DuMo. Lo llama el botón
 * "Conectar con DuMo" de dulabs. Autenticado con el mismo secreto compartido
 * del reenvío (X-DuMo-Forward-Secret == WHATSAPP_FORWARD_SECRET).
 */
const schema = z.object({
  phoneNumberId: z.string().trim().min(1),
  displayPhone: z.string().trim().optional().default(""),
  wabaId: z.string().trim().optional().default(""),
  label: z.string().trim().optional().default(""),
});

function authorized(request: NextRequest): boolean {
  const expected = process.env.WHATSAPP_FORWARD_SECRET;
  const provided = request.headers.get("x-dumo-forward-secret");
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 422 });
  }

  try {
    await leadsService.registerNumber(parsed.data);
    return NextResponse.json({ ok: true, phoneNumberId: parsed.data.phoneNumberId });
  } catch (error) {
    console.error("[POST /api/whatsapp/register-number]", error);
    return NextResponse.json(
      { error: "No se pudo registrar el número." },
      { status: 500 },
    );
  }
}
