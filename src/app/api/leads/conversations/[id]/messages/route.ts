import { NextResponse } from "next/server";
import { leadsService } from "@/services/leads.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const messages = await leadsService.getMessages(id);
    return NextResponse.json(messages);
  } catch (error) {
    console.error(`[GET /api/leads/conversations/${id}/messages]`, error);
    return NextResponse.json(
      { error: "No se pudieron cargar los mensajes." },
      { status: 500 },
    );
  }
}
