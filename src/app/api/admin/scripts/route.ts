import { NextResponse, type NextRequest } from "next/server";
import { requireAdministratorSession } from "@/lib/require-administrator";
import { getTenantScope } from "@/lib/tenant-scope";
import { teleprompterScriptService } from "@/services/teleprompter-script.service";
import { isScriptFlowKey } from "@/lib/sales-script/cms/flow-registry";
import type { ScriptFlowKey } from "@/lib/sales-script/cms/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseFlowKey(value: string | null): ScriptFlowKey | null {
  if (value && isScriptFlowKey(value)) return value;
  return null;
}

function parseCarrier(value: unknown): string {
  return value === "claro" ? "claro" : "wom";
}

export async function GET(request: NextRequest) {
  if (!(await requireAdministratorSession())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  const scope = await getTenantScope();
  if (!scope) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const p = request.nextUrl.searchParams;
  const section = p.get("section");
  const flowKey = parseFlowKey(p.get("flowKey"));

  try {
    if (section === "flows") {
      return NextResponse.json(teleprompterScriptService.listFlows());
    }

    if (section === "catalog" && flowKey) {
      return NextResponse.json(teleprompterScriptService.getFlowCatalog(flowKey));
    }

    if (section === "field" && flowKey) {
      const blockId = p.get("blockId");
      const fieldKey = p.get("fieldKey");
      if (!blockId || !fieldKey) {
        return NextResponse.json({ error: "blockId y fieldKey son obligatorios." }, { status: 400 });
      }
      const field = await teleprompterScriptService.getFieldState({
        companyId: scope.companyId,
        flowKey,
        blockId,
        fieldKey,
        carrier: parseCarrier(p.get("carrier")),
      });
      return NextResponse.json(field);
    }

    if (section === "history") {
      const overrideId = p.get("overrideId");
      if (!overrideId) {
        return NextResponse.json({ error: "overrideId es obligatorio." }, { status: 400 });
      }
      const history = await teleprompterScriptService.listHistory({
        companyId: scope.companyId,
        overrideId,
      });
      return NextResponse.json(history);
    }

    return NextResponse.json({ error: "Sección no soportada." }, { status: 400 });
  } catch (error) {
    console.error("[GET /api/admin/scripts]", error);
    return NextResponse.json({ error: "No se pudo cargar Scripts." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!(await requireAdministratorSession())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  const scope = await getTenantScope();
  if (!scope) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  try {
    const body = await request.json();
    const flowKey = parseFlowKey(String(body.flowKey ?? ""));
    if (!flowKey || !body.blockId || !body.fieldKey || typeof body.templateText !== "string") {
      return NextResponse.json({ error: "Datos incompletos." }, { status: 400 });
    }

    const result = await teleprompterScriptService.saveField({
      companyId: scope.companyId,
      userId: scope.userId,
      flowKey,
      blockId: String(body.blockId),
      fieldKey: String(body.fieldKey),
      carrier: parseCarrier(body.carrier),
      templateText: body.templateText,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, issues: result.issues }, { status: 422 });
    }

    return NextResponse.json({ ok: true, saved: result.saved });
  } catch (error) {
    console.error("[PUT /api/admin/scripts]", error);
    return NextResponse.json({ error: "No se pudo guardar el script." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireAdministratorSession())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  const scope = await getTenantScope();
  if (!scope) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  try {
    const body = await request.json();

    if (body.action === "preview" && typeof body.templateText === "string") {
      const flowKey = parseFlowKey(String(body.flowKey ?? ""));
      if (!flowKey) {
        return NextResponse.json({ error: "flowKey es obligatorio para vista previa." }, { status: 400 });
      }
      return NextResponse.json({
        preview: teleprompterScriptService.previewTemplate(body.templateText, flowKey),
      });
    }

    if (body.action === "restore") {
      const flowKey = parseFlowKey(String(body.flowKey ?? ""));
      if (!flowKey || !body.blockId || !body.fieldKey) {
        return NextResponse.json({ error: "Datos incompletos." }, { status: 400 });
      }
      const field = await teleprompterScriptService.restoreField({
        companyId: scope.companyId,
        userId: scope.userId,
        flowKey,
        blockId: String(body.blockId),
        fieldKey: String(body.fieldKey),
        carrier: parseCarrier(body.carrier),
      });
      return NextResponse.json(field);
    }

    return NextResponse.json({ error: "Acción no soportada." }, { status: 400 });
  } catch (error) {
    console.error("[POST /api/admin/scripts]", error);
    return NextResponse.json({ error: "No se pudo procesar la solicitud." }, { status: 500 });
  }
}
