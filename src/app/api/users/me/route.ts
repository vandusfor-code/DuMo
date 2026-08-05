import { NextResponse } from "next/server";
import { authUserToPublicUser } from "@/repositories/auth.repository";
import { authService } from "@/services/auth.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET() {
  try {
    const user = await authService.getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }
    return NextResponse.json(authUserToPublicUser(user));
  } catch (error) {
    console.error("[GET /api/users/me]", error);
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
}
