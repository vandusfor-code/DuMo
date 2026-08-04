import { NextResponse } from "next/server";
import { hasGoogleCredentials, getGoogleConfig } from "@/server/google/config";
import { getSheetsClient } from "@/server/google/sheets-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Diagnostic endpoint: attempts a minimal real read against the spreadsheet
 * and reports the actual error (name + message) when it fails. Safe to expose —
 * it never returns credential values, only high-level status and error text.
 */
export async function GET() {
  const configured = hasGoogleCredentials();
  const cfg = getGoogleConfig();

  // Surface non-secret sanity checks about the private key format.
  const keyInfo = cfg
    ? {
        privateKeyLength: cfg.privateKey.length,
        hasBeginMarker: cfg.privateKey.includes("BEGIN PRIVATE KEY"),
        hasRealNewlines: cfg.privateKey.includes("\n"),
        sheetIdLength: cfg.sheetId.length,
        clientEmail: cfg.clientEmail,
      }
    : null;

  if (!configured) {
    return NextResponse.json({ ok: false, mode: "mock", keyInfo });
  }

  const client = getSheetsClient();
  try {
    // A minimal read that requires valid auth + share permission.
    const config = await client!.getConfigMap();
    return NextResponse.json({
      ok: true,
      mode: "sheets",
      keyInfo,
      configKeys: Object.keys(config),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        mode: "sheets",
        keyInfo,
        error: {
          name: error instanceof Error ? error.name : "Unknown",
          message: error instanceof Error ? error.message : String(error),
        },
      },
      { status: 500 },
    );
  }
}
