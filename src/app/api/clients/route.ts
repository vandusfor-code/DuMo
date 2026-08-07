import { NextResponse, type NextRequest } from "next/server";
import { advisorScopeFromUser } from "@/lib/advisor-scope";
import { authService } from "@/services/auth.service";
import { crmClientsService } from "@/services/crm-clients.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Clientes tipificados por la asesora conectada. */
export async function GET(request: NextRequest) {
  try {
    const user = await authService.getSessionUser();
    const scope = advisorScopeFromUser(user);
    if (!scope) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const clients = await crmClientsService.list(scope, {
      search: searchParams.get("search") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });

    return NextResponse.json(clients, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[GET /api/clients]", error);
    return NextResponse.json({ error: "No se pudo cargar la cartera." }, { status: 500 });
  }
}
