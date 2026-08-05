import { NextResponse } from "next/server";
import { leadsService } from "@/services/leads.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

/**
 * Mensajes de una conversación. NO devuelve [] ante un fallo: un chat vacío
 * falso es peor que un error, porque oculta que la sincronización se rompió.
 * El cliente reintenta y conserva los últimos mensajes buenos.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const messages = await Promise.race([
      leadsService.getMessages(id),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Messages timeout")), 10_000),
      ),
    ]);
    return NextResponse.json(messages, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error(`[GET /api/leads/conversations/${id}/messages]`, error);
    return NextResponse.json(
      { error: "No se pudieron cargar los mensajes." },
      { status: 503 },
    );
  }
}
