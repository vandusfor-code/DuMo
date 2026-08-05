import { NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { leadsService } from "@/services/leads.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET() {
  try {
    const user = await authService.getSessionUser();
    const advisorId = user?.role === "asesora" ? user.id : undefined;

    // El barrido de auto-asignación NO debe bloquear la bandeja: va en segundo
    // plano y además está limitado por throttle dentro del repositorio.
    if (advisorId) {
      const { adminLeadsService } = await import("@/services/admin-leads.service");
      void adminLeadsService.autoAssignAllPending().catch(() => {});
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
    // Nunca devolver [] ante un fallo: ocultaría que la bandeja se rompió.
    console.error("[GET /api/leads/conversations]", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las conversaciones." },
      { status: 503 },
    );
  }
}
