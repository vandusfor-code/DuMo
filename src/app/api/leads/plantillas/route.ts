import { NextResponse, type NextRequest } from "next/server";
import { getAdvisorTenantScope } from "@/lib/tenant-scope";
import { quickReplyService } from "@/services/quick-reply.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const scope = await getAdvisorTenantScope();
  if (!scope) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  try {
    const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
    let templates = await quickReplyService.listForAdvisor(scope);

    if (q) {
      templates = templates.filter((t) => {
        const haystack = [t.name, t.shortcut, t.categoryName, ...t.tags].join(" ").toLowerCase();
        return haystack.includes(q);
      });
    }

    return NextResponse.json(templates, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[GET /api/leads/plantillas]", error);
    return NextResponse.json({ error: "No se pudieron cargar las plantillas." }, { status: 500 });
  }
}
