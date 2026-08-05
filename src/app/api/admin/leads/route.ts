import { NextResponse, type NextRequest } from "next/server";
import { adminLeadsService } from "@/services/admin-leads.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;
    const conversationId = p.get("conversationId");
    const advisors = p.get("advisors");
    const settings = p.get("settings");

    if (settings === "1") {
      return NextResponse.json(await adminLeadsService.getAutoAssignSettings());
    }
    if (advisors === "1") {
      return NextResponse.json(await adminLeadsService.listAdvisors());
    }
    if (conversationId) {
      const messages = p.get("messages");
      if (messages === "1") {
        return NextResponse.json(await adminLeadsService.getMessages(conversationId));
      }
      const notes = p.get("notes");
      if (notes === "1") {
        return NextResponse.json(await adminLeadsService.listNotes(conversationId));
      }
      return NextResponse.json(await adminLeadsService.getDetail(conversationId));
    }

    return NextResponse.json(await adminLeadsService.listConversations());
  } catch (error) {
    console.error("[GET /api/admin/leads]", error);
    return NextResponse.json({ error: "No se pudieron cargar los leads." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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
    const body = await request.json();
    const note = await adminLeadsService.updateNote(body.id, body.text);
    return NextResponse.json(note);
  } catch (error) {
    console.error("[PUT /api/admin/leads]", error);
    return NextResponse.json({ error: "No se pudo actualizar la nota." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("noteId");
    if (!id) return NextResponse.json({ error: "ID requerido." }, { status: 400 });
    await adminLeadsService.deleteNote(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/admin/leads]", error);
    return NextResponse.json({ error: "No se pudo eliminar la nota." }, { status: 500 });
  }
}
