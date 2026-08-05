import { NextResponse } from "next/server";
import {
  emptyAdvisorsResult,
  withAdminFallback,
} from "@/lib/admin-api-fallbacks";
import { requireAdminSession } from "@/lib/require-admin";
import { adminAdvisorsService } from "@/services/admin-users.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const data = await withAdminFallback(
    () => adminAdvisorsService.list(),
    emptyAdvisorsResult(),
    "GET /api/admin/advisors",
  );
  return NextResponse.json(data);
}
