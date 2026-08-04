import { NextResponse } from "next/server";
import { dashboardService } from "@/services/dashboard.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await dashboardService.getDashboard();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/dashboard]", error);
    return NextResponse.json(
      { error: "No se pudo cargar el dashboard." },
      { status: 500 },
    );
  }
}
