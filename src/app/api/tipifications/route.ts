import { NextResponse } from "next/server";
import { getTenantScope } from "@/lib/tenant-scope";
import { buildFallbackTipificationCatalog } from "@/lib/tipification-utils";
import { tipificationService } from "@/services/tipification.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tipificaciones activas para asesoras y admin (Gestión del cliente). */
export async function GET(request: Request) {
  const scope = await getTenantScope();
  if (!scope) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const carrierParam = new URL(request.url).searchParams.get("carrier");
  const carrier = carrierParam === "wom" || carrierParam === "claro" ? carrierParam : undefined;

  try {
    const data = await tipificationService.listActive(scope, carrier);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[GET /api/tipifications]", error);
    return NextResponse.json(buildFallbackTipificationCatalog(scope.companyId), {
      headers: { "Cache-Control": "no-store", "X-Tipification-Fallback": "1" },
    });
  }
}
