import { NextResponse } from "next/server";
import { ADMIN_DASHBOARD_MOCK } from "@/data/mock/admin-dashboard.mock";
import { adminDashboardService } from "@/services/admin-dashboard.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET() {
  try {
    const data = await Promise.race([
      adminDashboardService.getDashboard(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Dashboard timeout")), 12_000),
      ),
    ]);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/admin/dashboard]", error);
    return NextResponse.json(ADMIN_DASHBOARD_MOCK);
  }
}
