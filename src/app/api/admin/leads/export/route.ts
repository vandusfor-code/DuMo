import { NextResponse, type NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { leadsExportService } from "@/services/leads-export.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

function isValidDateParam(value: string | null): value is string {
  return Boolean(value) && /^\d{4}-\d{2}-\d{2}$/.test(value!);
}

export async function GET(request: NextRequest) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  if (!isValidDateParam(from) || !isValidDateParam(to)) {
    return NextResponse.json({ error: "Rango de fechas inválido." }, { status: 400 });
  }

  try {
    const buffer = await leadsExportService.buildWorkbookBuffer({ from, to });
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="leads_${from}_a_${to}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/leads/export]", error);
    return NextResponse.json({ error: "No se pudo generar el archivo." }, { status: 500 });
  }
}
