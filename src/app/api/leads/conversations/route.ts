import { NextResponse } from "next/server";
import { adminLeadsService } from "@/services/admin-leads.service";
import { authService } from "@/services/auth.service";
import { leadsService } from "@/services/leads.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function GET() {
  try {
    const user = await authService.getSessionUser();
    const advisorId = user?.role === "asesora" ? user.id : undefined;

    // Solo asigna si hay pendientes — evita el round-robin pesado en cada poll.
    if (advisorId) {
      await adminLeadsService.ensurePendingAssigned();
    }

    const conversations = await Promise.race([
      leadsService.getConversations(advisorId),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Conversations timeout")), 12_000),
      ),
    ]);
    return NextResponse.json(conversations, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[GET /api/leads/conversations]", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las conversaciones." },
      { status: 503 },
    );
  }
}
