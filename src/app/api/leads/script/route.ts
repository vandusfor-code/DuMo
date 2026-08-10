import { NextResponse, type NextRequest } from "next/server";
import {
  assertConversationAccess,
  ConversationAccessError,
} from "@/lib/conversation-access";
import { getAdvisorTenantScope } from "@/lib/tenant-scope";
import { salesScriptService } from "@/services/sales-script.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Último script de venta generado para una conversación. */
export async function GET(request: NextRequest) {
  const scope = await getAdvisorTenantScope();
  if (!scope) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const conversationId = request.nextUrl.searchParams.get("conversationId");
  if (!conversationId) {
    return NextResponse.json({ error: "conversationId requerido." }, { status: 400 });
  }

  try {
    await assertConversationAccess(conversationId, scope);
  } catch (err) {
    if (err instanceof ConversationAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  try {
    const script = await salesScriptService.getLatestForConversation(conversationId);
    return NextResponse.json(script, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[GET /api/leads/script]", error);
    return NextResponse.json({ error: "No se pudo cargar el script." }, { status: 500 });
  }
}
