import { NextResponse, type NextRequest } from "next/server";
import { advisorScopeFromUser } from "@/lib/advisor-scope";
import { withAdvisorFallback } from "@/lib/advisor-api-fallbacks";
import { authService } from "@/services/auth.service";
import { salesService } from "@/services/sales.service";
import { newSaleSchema } from "@/lib/schemas/new-sale.schema";
import type { NewSaleInput } from "@/types/sale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const sales = await withAdvisorFallback(
    async () => {
      const user = await authService.getSessionUser();
      const scope = advisorScopeFromUser(user);
      return salesService.list(scope);
    },
    [],
    "sales-list",
  );
  return NextResponse.json(sales);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = newSaleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const user = await authService.getSessionUser();
    const scope = advisorScopeFromUser(user);
    const input: NewSaleInput = {
      customerName: parsed.data.customerName,
      rut: parsed.data.rut,
      phone: parsed.data.phone,
      email: parsed.data.email || undefined,
      notes: parsed.data.notes || undefined,
      lines: parsed.data.lines.map((l) => ({
        phoneNumber: l.phoneNumber,
        saleType: l.saleType,
        deviceName: l.deviceName || undefined,
      })),
    };
    const created = await salesService.create(input, scope);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[POST /api/sales]", error);
    return NextResponse.json(
      { error: "No se pudo registrar la venta." },
      { status: 500 },
    );
  }
}
