import { NextResponse, type NextRequest } from "next/server";
import { salesScriptService } from "@/services/sales-script.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Último script de venta generado para una conversación. */
export async function GET(request: NextRequest) {
  const conversationId = request.nextUrl.searchParams.get("conversationId");
  if (!conversationId) {
    return NextResponse.json({ error: "conversationId requerido." }, { status: 400 });
  }

  try {
    const script = await salesScriptService.getLatestForConversation(conversationId);
    return NextResponse.json(script, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[GET /api/leads/script]", error);
    return NextResponse.json({ error: "No se pudo cargar el script." }, { status: 500 });
  }
}
