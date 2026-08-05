import { NextResponse, type NextRequest } from "next/server";
import { settingsService } from "@/services/settings.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await settingsService.getSnapshot();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/admin/settings]", error);
    return NextResponse.json({ error: "No se pudo cargar la configuración." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    switch (body.section) {
      case "company":
        return NextResponse.json(await settingsService.updateCompany(body.data));
      case "whatsapp":
        return NextResponse.json(await settingsService.updateWhatsApp(body.data));
      case "googleSheets":
        return NextResponse.json(await settingsService.updateGoogleSheets(body.data));
      case "testGoogleSheets":
        return NextResponse.json(await settingsService.testGoogleSheetsConnection());
      case "user":
        return NextResponse.json(await settingsService.createUser(body.data));
      default:
        return NextResponse.json({ error: "Sección no válida." }, { status: 400 });
    }
  } catch (error) {
    console.error("[POST /api/admin/settings]", error);
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.section === "user") {
      return NextResponse.json(await settingsService.updateUser(body.id, body.data));
    }
    return NextResponse.json({ error: "Sección no válida." }, { status: 400 });
  } catch (error) {
    console.error("[PUT /api/admin/settings]", error);
    return NextResponse.json({ error: "No se pudo actualizar." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.action === "toggleUser") {
      return NextResponse.json(await settingsService.toggleUserActive(body.id, body.active));
    }
    return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
  } catch (error) {
    console.error("[PATCH /api/admin/settings]", error);
    return NextResponse.json({ error: "No se pudo actualizar." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("userId");
    if (!id) return NextResponse.json({ error: "ID requerido." }, { status: 400 });
    await settingsService.deleteUser(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/admin/settings]", error);
    return NextResponse.json({ error: "No se pudo eliminar." }, { status: 500 });
  }
}
