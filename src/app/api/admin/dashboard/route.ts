import { NextResponse } from "next/server";
import { adminDashboardService } from "@/services/admin-dashboard.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await adminDashboardService.getDashboard();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/admin/dashboard]", error);
    return NextResponse.json(
      { error: "No se pudo cargar el dashboard admin." },
      { status: 500 },
    );
  }
}
