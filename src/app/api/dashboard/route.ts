import { NextResponse } from "next/server";
import { EMPTY_ADVISOR_DASHBOARD } from "@/data/advisor-fallbacks";
import { advisorScopeFromUser } from "@/lib/advisor-scope";
import { withAdvisorFallback } from "@/lib/advisor-api-fallbacks";
import { authService } from "@/services/auth.service";
import { dashboardService } from "@/services/dashboard.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const data = await withAdvisorFallback(
    async () => {
      const user = await authService.getSessionUser();
      const scope = advisorScopeFromUser(user);
      return dashboardService.getDashboard(scope);
    },
    EMPTY_ADVISOR_DASHBOARD,
    "dashboard",
  );
  return NextResponse.json(data);
}
