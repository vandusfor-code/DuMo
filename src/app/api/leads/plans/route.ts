import { NextResponse } from "next/server";
import { NO_ACTIVE_COMMERCIAL_PLANS_MESSAGE } from "@/lib/commercial-plans-catalog";
import { leadsService } from "@/services/leads.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const plans = await leadsService.getPlans();
    return NextResponse.json(plans);
  } catch (error) {
    console.error("[GET /api/leads/plans]", error);
    const message =
      error instanceof Error ? error.message : NO_ACTIVE_COMMERCIAL_PLANS_MESSAGE;
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
