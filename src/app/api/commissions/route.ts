import { NextResponse, type NextRequest } from "next/server";
import { commissionsService } from "@/services/commissions.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month") ?? undefined;
  try {
    const commissions = await commissionsService.list(month || undefined);
    return NextResponse.json(commissions);
  } catch (error) {
    console.error("[GET /api/commissions]", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las comisiones." },
      { status: 500 },
    );
  }
}
