import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { leadsService } from "@/services/leads.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sendSchema = z.object({
  conversationId: z.string().trim().min(1),
  to: z.string().trim().min(1),
  text: z.string().trim().min(1, "El mensaje no puede estar vacío.").max(4096),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const result = await leadsService.sendMessage(parsed.data);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[POST /api/whatsapp/send]", error);
    const message =
      error instanceof Error ? error.message : "No se pudo enviar el mensaje.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
