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
import { resolveFollowUpDateForSave, validateFollowUpDateForCloseAction } from "@/lib/tipification-follow-up";
import { tipificationService } from "@/services/tipification.service";
import { FolioNumberValidationError } from "@/lib/folio-number";

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

    const catalog = await tipificationService.listActive(scope);
    const followUpValidationError = validateFollowUpDateForCloseAction({
      slug: parsed.data.type,
      catalog,
      followUpDate: parsed.data.followUpDate,
      saveAction: parsed.data.saveAction,
    });
    if (followUpValidationError) {
      return NextResponse.json({ error: followUpValidationError }, { status: 422 });
    }

    const resolvedFollowUp = resolveFollowUpDateForSave({
      slug: parsed.data.type,
      catalog,
      followUpDate: parsed.data.followUpDate,
    });

    const user = await authService.getSessionUser();
    const advisorScope = advisorScopeFromUser(user);
    const result = await leadsService.saveLead({
      ...parsed.data,
      saveAction: parsed.data.saveAction,
      registerSale: parsed.data.registerSale,
      followUpDate: resolvedFollowUp.followUpDate,
    }, advisorScope);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof FolioNumberValidationError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    console.error("[POST /api/leads]", error);
    return NextResponse.json(
      { error: "No se pudo guardar la gestión." },
      { status: 500 },
    );
  }
}
