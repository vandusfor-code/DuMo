import { NextResponse, type NextRequest } from "next/server";
import {
  assertConversationAccess,
  ConversationAccessError,
} from "@/lib/conversation-access";
import { getAdvisorTenantScope } from "@/lib/tenant-scope";
import { leadsService } from "@/services/leads.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Última gestión guardada para precargar el formulario del asesor. */
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
    const draft = await leadsService.getLatestGestionDraft(conversationId);
    return NextResponse.json(draft, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[GET /api/leads/gestion/latest]", error);
    return NextResponse.json({ error: "No se pudo cargar la gestión." }, { status: 500 });
  }
}
