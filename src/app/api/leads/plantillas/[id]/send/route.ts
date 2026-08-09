import { NextResponse, type NextRequest } from "next/server";
import {
  assertConversationAccess,
  ConversationAccessError,
} from "@/lib/conversation-access";
import { getTenantScope } from "@/lib/tenant-scope";
import { quickReplySendService } from "@/services/quick-reply-send.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const scope = await getTenantScope();
  if (!scope) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const conversationId = String(body.conversationId ?? "");
    const to = String(body.to ?? "");
    const customerName = String(body.customerName ?? "");

    if (!conversationId || !to) {
      return NextResponse.json({ error: "conversationId y to son obligatorios." }, { status: 422 });
    }

    try {
      await assertConversationAccess(conversationId, scope);
    } catch (err) {
      if (err instanceof ConversationAccessError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      throw err;
    }

    const result = await quickReplySendService.sendTemplate({
      scope,
      templateId: id,
      conversationId,
      to,
      customerName,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/leads/plantillas/send]", error);
    const message = error instanceof Error ? error.message : "No se pudo enviar la plantilla.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
