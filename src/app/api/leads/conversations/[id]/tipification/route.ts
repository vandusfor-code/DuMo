import { NextResponse } from "next/server";
import {
  assertConversationAccess,
  ConversationAccessError,
} from "@/lib/conversation-access";
import { getTenantScope } from "@/lib/tenant-scope";
import { getConversationRepository } from "@/repositories/conversation.repository";
import { getTipificationRepository } from "@/repositories/tipification.repository";
import { DEFAULT_COMPANY_ID } from "@/types/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const scope = await getTenantScope();
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

  let slug = "";
  try {
    const body = (await request.json()) as { slug?: unknown };
    slug = typeof body.slug === "string" ? body.slug.trim() : "";
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  if (!slug) {
    return NextResponse.json({ error: "Falta la tipificación." }, { status: 400 });
  }

  const catalog = await getTipificationRepository().listActive(DEFAULT_COMPANY_ID);
  if (!catalog.some((item) => item.slug === slug)) {
    return NextResponse.json({ error: "Tipificación no válida." }, { status: 400 });
  }

  try {
    await getConversationRepository().setCurrentTipificationSlug(id, slug);
    const { emitLeadsConversationUpdated } = await import("@/server/realtime/emit");
    emitLeadsConversationUpdated({
      conversationId: id,
      reason: "tipify",
    });
    return NextResponse.json({ ok: true, slug });
  } catch (error) {
    console.error(`[POST /api/leads/conversations/${id}/tipification]`, error);
    return NextResponse.json({ error: "No se pudo guardar la tipificación." }, { status: 500 });
  }
}
