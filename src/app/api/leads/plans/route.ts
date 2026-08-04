import { NextResponse } from "next/server";
import { leadsService } from "@/services/leads.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const plans = await leadsService.getPlans();
    return NextResponse.json(plans);
  } catch (error) {
    console.error("[GET /api/leads/plans]", error);
    return NextResponse.json(
      { error: "No se pudieron cargar los planes." },
      { status: 500 },
    );
  }
}
