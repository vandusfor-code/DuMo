import { NextResponse, type NextRequest } from "next/server";
import { withAdminFallback } from "@/lib/admin-api-fallbacks";
import { requireAdminSession } from "@/lib/require-admin";
import { authService } from "@/services/auth.service";
import { adminLeadsService } from "@/services/admin-leads.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function GET(request: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const p = request.nextUrl.searchParams;
  const conversationId = p.get("conversationId");
  const advisors = p.get("advisors");
  const settings = p.get("settings");

  try {
    if (settings === "1") {
      const data = await withAdminFallback(
        () => adminLeadsService.getAutoAssignSettings(),
        { enabled: true, lastAdvisorIndex: 0 },
        "GET /api/admin/leads settings",
      );
      return NextResponse.json(data);
    }
    if (advisors === "1") {
      const data = await withAdminFallback(
        () => adminLeadsService.listAdvisors(),
        [],
        "GET /api/admin/leads advisors",
      );
      return NextResponse.json(data);
    }
    if (conversationId) {
      const messages = p.get("messages");
      if (messages === "1") {
        const data = await Promise.race([
          adminLeadsService.getMessages(conversationId),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("GET /api/admin/leads messages timeout")), 12_000),
          ),
        ]);
        return NextResponse.json(data, {
          headers: { "Cache-Control": "no-store" },
        });
      }
      const notes = p.get("notes");
      if (notes === "1") {
        const data = await withAdminFallback(
          () => adminLeadsService.listNotes(conversationId),
          [],
          "GET /api/admin/leads notes",
        );
        return NextResponse.json(data);
      }
      const data = await withAdminFallback(
        () => adminLeadsService.getDetail(conversationId),
        null,
        "GET /api/admin/leads detail",
      );
      if (!data) return NextResponse.json({ error: "Conversación no encontrada." }, { status: 404 });
      return NextResponse.json(data);
    }

    // Asignar pendientes antes de listar (misma razón que en la ruta de asesora).
    await adminLeadsService.ensurePendingAssigned();

    const data = await Promise.race([
      adminLeadsService.listConversations(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("GET /api/admin/leads timeout")), 12_000),
      ),
    ]);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[GET /api/admin/leads]", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las conversaciones." },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdminSession())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    const body = await request.json();
    if (body.action === "assign") {
      const conversation = await adminLeadsService.assignAdvisor(body);
      return NextResponse.json(conversation);
    }
    if (body.action === "addNote") {
      const note = await adminLeadsService.addNote(body);
      return NextResponse.json(note);
    }
    if (body.action === "setAutoAssign") {
      const settings = await adminLeadsService.setAutoAssignEnabled(Boolean(body.enabled));
      return NextResponse.json(settings);
    }
    const lead = await adminLeadsService.saveLead(body);
    return NextResponse.json(lead);
  } catch (error) {
    console.error("[POST /api/admin/leads]", error);
    const message = error instanceof Error ? error.message : "No se pudo guardar.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!(await requireAdminSession())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    const body = await request.json();
    const note = await adminLeadsService.updateNote(body.id, body.text);
    return NextResponse.json(note);
  } catch (error) {
    console.error("[PUT /api/admin/leads]", error);
    return NextResponse.json({ error: "No se pudo actualizar la nota." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await requireAdminSession())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    const p = request.nextUrl.searchParams;

    // Borrar TODAS las conversaciones. Requiere confirmación explícita para
    // que no pueda dispararse por accidente.
    if (p.get("allConversations") === "1") {
      if (p.get("confirm") !== "BORRAR-TODO") {
        return NextResponse.json(
          { error: "Falta confirmación explícita (confirm=BORRAR-TODO)." },
          { status: 400 },
        );
      }
      const deleted = await adminLeadsService.deleteAllConversations();
      console.warn(`[admin] borradas TODAS las conversaciones (${deleted})`);
      return NextResponse.json({ ok: true, deleted });
    }

    // Borrar una conversación con su historial.
    const conversationId = p.get("conversationId");
    if (conversationId) {
      await adminLeadsService.deleteConversation(conversationId);
      return NextResponse.json({ ok: true, conversationId });
    }

    const id = p.get("noteId");
    if (!id) return NextResponse.json({ error: "ID requerido." }, { status: 400 });
    await adminLeadsService.deleteNote(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/admin/leads]", error);
    return NextResponse.json({ error: "No se pudo eliminar." }, { status: 400 });
  }
}
