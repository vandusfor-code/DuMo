import { NextResponse, type NextRequest } from "next/server";
import { advisorScopeFromUser } from "@/lib/advisor-scope";
import { withAdvisorFallback } from "@/lib/advisor-api-fallbacks";
import { authService } from "@/services/auth.service";
import { commissionsService } from "@/services/commissions.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month") ?? undefined;
  const commissions = await withAdvisorFallback(
    async () => {
      const user = await authService.getSessionUser();
      const scope = advisorScopeFromUser(user);
      return commissionsService.list(month || undefined, scope);
    },
    [],
    "commissions-list",
  );
  return NextResponse.json(commissions);
}
