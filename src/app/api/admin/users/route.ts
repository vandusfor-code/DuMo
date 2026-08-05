import { NextResponse, type NextRequest } from "next/server";
import { authUserToPublicUser } from "@/repositories/auth.repository";
import { withAdminFallback } from "@/lib/admin-api-fallbacks";
import { requireAdminSession } from "@/lib/require-admin";
import { adminUsersService } from "@/services/admin-users.service";
import type { CreateUserInput, UpdateUserInput } from "@/types/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const users = await withAdminFallback(
    async () => {
      const list = await adminUsersService.list();
      return list.map(authUserToPublicUser);
    },
    [],
    "GET /api/admin/users",
  );
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdminSession())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    const body = (await request.json()) as CreateUserInput;
    if (!body.password || body.password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres." }, { status: 400 });
    }
    const user = await adminUsersService.create(body);
    return NextResponse.json(authUserToPublicUser(user));
  } catch (error) {
    console.error("[POST /api/admin/users]", error);
    const message = error instanceof Error ? error.message : "No se pudo crear el usuario.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!(await requireAdminSession())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    const body = await request.json();
    const user = await adminUsersService.update(body.id as string, body.data as UpdateUserInput);
    return NextResponse.json(authUserToPublicUser(user));
  } catch (error) {
    console.error("[PUT /api/admin/users]", error);
    const message = error instanceof Error ? error.message : "No se pudo actualizar el usuario.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!(await requireAdminSession())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    const body = await request.json();
    if (body.action === "toggle") {
      const user = await adminUsersService.setActive(body.id, body.active);
      return NextResponse.json(authUserToPublicUser(user));
    }
    if (body.action === "changePassword") {
      await adminUsersService.changePassword(body.id, body.newPassword);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
  } catch (error) {
    console.error("[PATCH /api/admin/users]", error);
    const message = error instanceof Error ? error.message : "No se pudo actualizar el usuario.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await requireAdminSession())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido." }, { status: 400 });
    await adminUsersService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/admin/users]", error);
    const message = error instanceof Error ? error.message : "No se pudo eliminar el usuario.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
