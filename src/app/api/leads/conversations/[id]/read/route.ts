import { NextResponse } from "next/server";
import {
  assertConversationAccess,
  ConversationAccessError,
} from "@/lib/conversation-access";
import { getAdvisorTenantScope } from "@/lib/tenant-scope";
import { leadsService } from "@/services/leads.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const scope = await getAdvisorTenantScope();
  if (!scope) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;
  try {
    await assertConversationAccess(id, scope);
  } catch (err) {
    if (err instanceof ConversationAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  try {
    await leadsService.markConversationRead(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`[POST /api/leads/conversations/${id}/read]`, error);
    return NextResponse.json({ error: "No se pudo marcar como leído." }, { status: 500 });
  }
}
