import { NextResponse } from "next/server";
import { usersService } from "@/services/users.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await usersService.getCurrentUser();
    return NextResponse.json(user);
  } catch (error) {
    console.error("[GET /api/users/me]", error);
    return NextResponse.json(
      { error: "No se pudo cargar el usuario." },
      { status: 500 },
    );
  }
}
