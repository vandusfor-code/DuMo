import { NextResponse } from "next/server";
import { getAdvisorTenantScope } from "@/lib/tenant-scope";
import { adminLiveService } from "@/services/admin-live.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

/**
 * Beacon disparado con navigator.sendBeacon al cerrar la pestaña/navegador —
 * desconecta a la asesora al instante en el caso normal (cierre limpio). El
 * barrido por inactividad (advisor-presence-sweep) cubre el caso de apagón
 * abrupto del PC, donde este evento nunca llega a dispararse.
 */
export async function POST() {
  const scope = await getAdvisorTenantScope();
  if (!scope) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  try {
    await adminLiveService.setAdvisorPresence(
      scope.userId,
      "desconectado",
      "system:cierre-pagina",
      { revokeSessionOnDisconnect: false },
    );
  } catch (err) {
    console.error("[POST /api/advisors/me/presence/beacon]", err);
  }

  return NextResponse.json({ ok: true });
}
