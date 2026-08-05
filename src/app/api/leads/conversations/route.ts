import { NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { leadsService } from "@/services/leads.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await authService.getSessionUser();
    const advisorId = user?.role === "asesora" ? user.id : undefined;
    const conversations = await leadsService.getConversations(advisorId);
    return NextResponse.json(conversations);
  } catch (error) {
    console.error("[GET /api/leads/conversations]", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las conversaciones." },
      { status: 500 },
    );
  }
}
