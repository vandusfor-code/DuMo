import { NextResponse, type NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { businessDateISO } from "@/lib/date";
import { adminLiveService } from "@/services/admin-live.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET(request: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const rawDate = request.nextUrl.searchParams.get("date")?.trim();
  const selectedDate =
    rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : businessDateISO();

  try {
    const snapshot = await adminLiveService.getSnapshot(selectedDate);
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("[GET /api/admin/live/snapshot]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar Live." },
      { status: 500 },
    );
  }
}
