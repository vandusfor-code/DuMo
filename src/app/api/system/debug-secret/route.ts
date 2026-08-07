// TEMPORAL — BORRAR DESPUÉS DEL DIAGNÓSTICO
import { createHash } from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const secret = process.env.AUTH_SECRET ?? "dumo-dev-auth-secret-change-in-production";
  const fingerprint = createHash("sha256").update(secret).digest("hex").slice(0, 12);
  return NextResponse.json({
    runtime: "nodejs",
    hasEnvVar: !!process.env.AUTH_SECRET,
    length: secret.length,
    fingerprint,
  });
}
