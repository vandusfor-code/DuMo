import { NextResponse, type NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { crmClientsService } from "@/services/crm-clients.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Todos los clientes tipificados (admin / supervisor). */
export async function GET(request: NextRequest) {
  try {
    if (!(await requireAdminSession())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const clients = await crmClientsService.list(null, {
      search: searchParams.get("search") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });

    return NextResponse.json(clients, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[GET /api/admin/clients]", error);
    return NextResponse.json({ error: "No se pudo cargar la cartera." }, { status: 500 });
  }
}
