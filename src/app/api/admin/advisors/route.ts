import { NextResponse } from "next/server";
import { adminAdvisorsService } from "@/services/admin-users.service";
import { authService } from "@/services/auth.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await authService.getSessionUser();
    if (!user || (user.role !== "administrador" && user.role !== "supervisor")) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    const data = await adminAdvisorsService.list();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/admin/advisors]", error);
    return NextResponse.json({ error: "No se pudieron cargar las asesoras." }, { status: 500 });
  }
}
