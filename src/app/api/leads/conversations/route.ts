import { NextResponse } from "next/server";
import { leadsService } from "@/services/leads.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const conversations = await leadsService.getConversations();
    return NextResponse.json(conversations);
  } catch (error) {
    console.error("[GET /api/leads/conversations]", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las conversaciones." },
      { status: 500 },
    );
  }
}
