import { NextResponse } from "next/server";
import { getSheetsClient } from "@/server/google/sheets-client";
import { hasGoogleCredentials } from "@/server/google/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reports whether Google credentials are configured (no side effects). */
export async function GET() {
  return NextResponse.json({
    configured: hasGoogleCredentials(),
    mode: hasGoogleCredentials() ? "sheets" : "mock",
  });
}

/**
 * Provisions the spreadsheet: creates any missing tabs and header rows and
 * seeds default configuration. Idempotent — safe to call repeatedly.
 */
export async function POST() {
  const client = getSheetsClient();
  if (!client) {
    return NextResponse.json(
      {
        configured: false,
        message:
          "Credenciales de Google ausentes. La app usa datos mock en desarrollo.",
      },
      { status: 200 },
    );
  }

  try {
    const result = await client.ensureProvisioned();
    return NextResponse.json({ configured: true, ...result });
  } catch (error) {
    console.error("[POST /api/system/init]", error);
    return NextResponse.json(
      { error: "No se pudo inicializar el spreadsheet." },
      { status: 500 },
    );
  }
}
