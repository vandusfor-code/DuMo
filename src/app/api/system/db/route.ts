import { NextResponse } from "next/server";
import { ensureSchema, getDatabaseUrl, getSql, hasDatabase, pingDatabase } from "@/server/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const url = getDatabaseUrl();
  if (!hasDatabase()) {
    return NextResponse.json({
      configured: false,
      mode: "mock",
      hint:
        "Configura DATABASE_URL con la URI de Postgres. En Supabase: Settings → Database → Connection string → Transaction pooler (puerto 6543). Las variables SUPABASE_ANON_KEY no sirven para SQL.",
    });
  }

  const ping = await pingDatabase();
  if (!ping.ok) {
    return NextResponse.json(
      {
        configured: true,
        connected: false,
        provider: url?.includes("supabase") ? "supabase" : "postgres",
        error: ping.message,
        hint:
          "Si usas Supabase, la URI debe ser del Transaction pooler (6543), no la conexión directa (5432).",
      },
      { status: 500 },
    );
  }

  try {
    await ensureSchema();
    const sql = getSql()!;
    const tables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'users', 'lead_conversations', 'lead_messages', 'app_config',
          'accounting_expenses', 'sales', 'sale_lines', 'commission_payments', 'lead_gestiones'
        )
      ORDER BY table_name
    `;
    const users = await sql`SELECT count(*)::int AS n FROM users`;
    const convCount = await sql`SELECT count(*)::int AS n FROM lead_conversations`;
    const msgCount = await sql`SELECT count(*)::int AS n FROM lead_messages`;
    // ¿Coinciden los conversation_id de los mensajes con los ids de las conversaciones?
    const orphanMsgs = await sql`
      SELECT count(*)::int AS n FROM lead_messages m
      WHERE NOT EXISTS (SELECT 1 FROM lead_conversations c WHERE c.id = m.conversation_id)
    `;
    const convWithMsgs = await sql`
      SELECT count(*)::int AS n FROM lead_conversations c
      WHERE EXISTS (SELECT 1 FROM lead_messages m WHERE m.conversation_id = c.id)
    `;

    return NextResponse.json({
      configured: true,
      connected: true,
      mode: "postgres",
      provider: url?.includes("supabase") ? "supabase" : "postgres",
      tables: tables.map((t) => t.table_name),
      users: users[0]?.n ?? 0,
      conversations: convCount[0]?.n ?? 0,
      messages: msgCount[0]?.n ?? 0,
      conversationsWithMessages: convWithMsgs[0]?.n ?? 0,
      orphanMessages: orphanMsgs[0]?.n ?? 0,
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
