import { NextResponse } from "next/server";
import { ensureSchema, getSql, hasDatabase } from "@/server/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Diagnóstico de la base de datos del chat. Confirma si DATABASE_URL está
 * presente, si conecta y si las tablas existen (las crea si faltan). Solo
 * devuelve estado y conteos — nunca datos ni credenciales.
 */
export async function GET() {
  if (!hasDatabase()) {
    return NextResponse.json({ configured: false, mode: "mock" });
  }

  try {
    await ensureSchema();
    const sql = getSql()!;
    const tables = (await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('lead_conversations', 'lead_messages')
      ORDER BY table_name
    `) as unknown as { table_name: string }[];
    const convCount = (await sql`SELECT count(*)::int AS n FROM lead_conversations`) as unknown as {
      n: number;
    }[];
    const msgCount = (await sql`SELECT count(*)::int AS n FROM lead_messages`) as unknown as {
      n: number;
    }[];

    return NextResponse.json({
      configured: true,
      connected: true,
      mode: "postgres",
      tables: tables.map((t) => t.table_name),
      conversations: convCount[0]?.n ?? 0,
      messages: msgCount[0]?.n ?? 0,
    });
  } catch (error) {
    return NextResponse.json(
      {
        configured: true,
        connected: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
