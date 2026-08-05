import { NextResponse, type NextRequest } from "next/server";
import { advisorScopeFromUser } from "@/lib/advisor-scope";
import { authService } from "@/services/auth.service";
import { commissionsService } from "@/services/commissions.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month") ?? undefined;
  try {
    const user = await authService.getSessionUser();
    const scope = advisorScopeFromUser(user);
    const commissions = await commissionsService.list(month || undefined, scope);
    return NextResponse.json(commissions);
  } catch (error) {
    console.error("[GET /api/commissions]", error);
    return NextResponse.json([]);
  }
}
