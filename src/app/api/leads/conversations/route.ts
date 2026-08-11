import { NextResponse, after } from "next/server";
import { adminLeadsService } from "@/services/admin-leads.service";
import { advisorIdForConversations } from "@/lib/conversation-access";
import { getAdvisorTenantScope } from "@/lib/tenant-scope";
import { leadsService } from "@/services/leads.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function GET() {
  try {
    const scope = await getAdvisorTenantScope();
    if (!scope) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const advisorId = advisorIdForConversations(scope);
    if (scope.role === "asesora" && !advisorId) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    // La asignación corre DESPUÉS de responder: la bandeja nunca espera por
    // ella, así un problema de asignación no puede romper la sincronización.
    if (advisorId) {
      after(async () => {
        try {
          await adminLeadsService.ensurePendingAssigned();
        } catch (err) {
          console.error("[ensurePendingAssigned]", err);
        }
      });
    }

    // RESP-1 — red de seguridad del timer SLA: reevalúa timers activos en
    // cada poll de la bandeja (con su propio throttle interno), sin
    // depender de que el job diferido de BullMQ haya disparado.
    after(async () => {
      try {
        const { reconcileDueTimersThrottled } = await import(
          "@/services/response-sla-sweep"
        );
        await reconcileDueTimersThrottled();
      } catch (err) {
        console.error("[reconcileDueTimersThrottled]", err);
      }
    });

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
