import { NextResponse } from "next/server";
import {
  adminDashboardFallback,
  withAdminFallback,
} from "@/lib/admin-api-fallbacks";
import { requireAdminSession } from "@/lib/require-admin";
import { adminDashboardService } from "@/services/admin-dashboard.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const data = await withAdminFallback(
    () => adminDashboardService.getDashboard(),
    adminDashboardFallback(),
    "GET /api/admin/dashboard",
  );
  return NextResponse.json(data);
}
