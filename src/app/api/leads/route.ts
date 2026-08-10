import { NextResponse, type NextRequest } from "next/server";
import {
  assertConversationAccess,
  ConversationAccessError,
} from "@/lib/conversation-access";
import { getAdvisorTenantScope } from "@/lib/tenant-scope";
import { advisorScopeFromUser } from "@/lib/advisor-scope";
import { authService } from "@/services/auth.service";
import { leadsService } from "@/services/leads.service";
import { saveLeadSchema } from "@/lib/schemas/save-lead.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = saveLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const scope = await getAdvisorTenantScope();
    if (!scope) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    try {
      await assertConversationAccess(parsed.data.conversationId, scope);
    } catch (err) {
      if (err instanceof ConversationAccessError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      throw err;
    }

    const user = await authService.getSessionUser();
    const advisorScope = advisorScopeFromUser(user);
    const result = await leadsService.saveLead({
      ...parsed.data,
      saveAction: parsed.data.saveAction,
      registerSale: parsed.data.registerSale,
    }, advisorScope);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("[POST /api/leads]", error);
    return NextResponse.json(
      { error: "No se pudo guardar la gestión." },
      { status: 500 },
    );
  }
}
