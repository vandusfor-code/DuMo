import { NextResponse } from "next/server";
import { adminLeadsService } from "@/services/admin-leads.service";
import { authService } from "@/services/auth.service";
import { leadsService } from "@/services/leads.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET() {
  try {
    const user = await authService.getSessionUser();
    const advisorId = user?.role === "asesora" ? user.id : undefined;

    // Asignar pendientes ANTES de listar: si solo corre en `after()`, la bandeja
    // responde vacía y la asesora ve "sin conversaciones" hasta el siguiente poll.
    if (advisorId) {
      await adminLeadsService.autoAssignAllPending({ skipThrottle: true });
    }

    const conversations = await Promise.race([
      leadsService.getConversations(advisorId),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Conversations timeout")), 10_000),
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
