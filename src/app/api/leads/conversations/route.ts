import { NextResponse, after } from "next/server";
import { authService } from "@/services/auth.service";
import { leadsService } from "@/services/leads.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET() {
  try {
    const user = await authService.getSessionUser();
    const advisorId = user?.role === "asesora" ? user.id : undefined;

    // El barrido de auto-asignación corre DESPUÉS de responder, con `after()`:
    // no retrasa la bandeja y Next mantiene viva la función hasta terminarlo
    // (lanzarlo con `void` podía cortarse y dañar la conexión del pool).
    if (advisorId) {
      after(async () => {
        try {
          const { adminLeadsService } = await import("@/services/admin-leads.service");
          await adminLeadsService.autoAssignAllPending();
        } catch (err) {
          console.error("[autoAssign sweep]", err);
        }
      });
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
