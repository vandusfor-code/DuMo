import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { adminLiveService } from "@/services/admin-live.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  try {
    const snapshot = await adminLiveService.getSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("[GET /api/admin/live/snapshot]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar Live." },
      { status: 500 },
    );
  }
}
