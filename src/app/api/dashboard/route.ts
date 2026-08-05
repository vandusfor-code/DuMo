import { NextResponse } from "next/server";
import { DASHBOARD_MOCK } from "@/data/mock/dashboard.mock";
import { advisorScopeFromUser } from "@/lib/advisor-scope";
import { authService } from "@/services/auth.service";
import { dashboardService } from "@/services/dashboard.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET() {
  try {
    const user = await authService.getSessionUser();
    const scope = advisorScopeFromUser(user);
    const data = await Promise.race([
      dashboardService.getDashboard(scope),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Dashboard timeout")), 12_000),
      ),
    ]);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/dashboard]", error);
    return NextResponse.json({ ...DASHBOARD_MOCK });
  }
}
