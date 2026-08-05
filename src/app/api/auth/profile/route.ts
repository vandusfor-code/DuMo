import { NextResponse, type NextRequest } from "next/server";
import { authService } from "@/services/auth.service";
import { profileService } from "@/services/admin-users.service";
import { authUserToPublicUser } from "@/repositories/auth.repository";
import type { ChangePasswordInput, UpdateProfileInput } from "@/types/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await authService.getSessionUser();
    if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    return NextResponse.json(authUserToPublicUser(session));
  } catch (error) {
    console.error("[GET /api/auth/profile]", error);
    return NextResponse.json({ error: "No se pudo cargar el perfil." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await authService.getSessionUser();
    if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    const data = (await request.json()) as UpdateProfileInput;
    const user = await profileService.updateProfile(session.id, data);
    return NextResponse.json(authUserToPublicUser(user));
  } catch (error) {
    console.error("[PUT /api/auth/profile]", error);
    const message = error instanceof Error ? error.message : "No se pudo actualizar el perfil.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await authService.getSessionUser();
    if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    const body = await request.json();
    if (body.action === "changePassword") {
      await profileService.changePassword(session.id, body.data as ChangePasswordInput);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
  } catch (error) {
    console.error("[PATCH /api/auth/profile]", error);
    const message = error instanceof Error ? error.message : "No se pudo cambiar la contraseña.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
