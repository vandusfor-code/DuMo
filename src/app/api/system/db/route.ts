import { NextResponse } from "next/server";
import { ensureSchema, getDatabaseUrl, getSql, hasDatabase, inspectDatabaseUrlPooler, pingDatabase, runtimeMigrationsEnabled } from "@/server/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Analiza la forma de la URI de conexión SIN exponer la contraseña.
 * Detecta los dos errores típicos con Supabase:
 *  - usar el pooler con usuario "postgres" en vez de "postgres.<project-ref>"
 *  - contraseña con caracteres especiales sin URL-encodear
 */
function inspectUrl(raw: string | null) {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const host = u.hostname;
    const port = u.port || "5432";
    const user = decodeURIComponent(u.username || "");
    const password = u.password || "";
    const isPoolerHost = host.includes("pooler.supabase.com");
    const isSupabaseDirect = host.startsWith("db.") && host.endsWith("supabase.co");
    const userHasProjectRef = user.includes(".");
    const problems: string[] = [];

    if (isPoolerHost && !userHasProjectRef) {
      problems.push(
        `El host es el pooler pero el usuario es "${user}". Con el pooler debe ser "postgres.<project-ref>" (ej. postgres.abcdefghijklm).`,
      );
    }
    if (isSupabaseDirect) {
      problems.push(
        "Estás usando la conexión directa (db.<ref>.supabase.co). En Vercel usa el Transaction pooler (aws-...pooler.supabase.com:6543).",
      );
    }
    if (!password) {
      problems.push("La URI no incluye contraseña.");
    } else if (/[@#?&/:%\s]/.test(decodeURIComponent(password)) && password === decodeURIComponent(password)) {
      problems.push(
        "La contraseña contiene caracteres especiales sin URL-encodear (@ # ? & / : espacio). Codifícalos: @ → %40, # → %23, ? → %3F, & → %26, / → %2F.",
      );
    }

    return {
      host,
      port,
      user,
      database: u.pathname.replace("/", "") || "(vacío)",
      passwordLength: password.length,
      kind: isPoolerHost ? "pooler" : isSupabaseDirect ? "direct" : "otro",
      problems,
    };
  } catch {
    return { problems: ["La URI no tiene formato válido (postgresql://usuario:clave@host:puerto/base)."] };
  }
}

export async function GET() {
  const url = getDatabaseUrl();
  if (!hasDatabase()) {
    return NextResponse.json({
      configured: false,
      mode: "mock",
      hint:
        "Configura DATABASE_URL1 con la URI de Postgres. En Supabase: Settings → Database → Connection string → Transaction pooler (puerto 6543). Las variables SUPABASE_ANON_KEY no sirven para SQL.",
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
        connection: inspectUrl(url),
        hint:
          "Si usas Supabase, la URI debe ser del Transaction pooler (6543) y el usuario 'postgres.<project-ref>'. Revisa el campo 'connection.problems'.",
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
          'accounting_expenses', 'sales', 'sale_lines', 'commission_payments', 'lead_gestiones', 'crm_clients', 'lead_follow_ups'
        )
      ORDER BY table_name
    `;
    const users = await sql`SELECT count(*)::int AS n FROM users`;
    const convCount = await sql`SELECT count(*)::int AS n FROM lead_conversations`;
    const unassigned = await sql`
      SELECT count(*)::int AS n FROM lead_conversations WHERE assigned_advisor_id IS NULL
    `;
    const activeAdvisors = await sql`
      SELECT count(*)::int AS n FROM users WHERE role = 'asesora' AND active = true
    `;
    const autoAssignRaw = await sql`
      SELECT value FROM app_config WHERE key = 'leads_auto_assign' LIMIT 1
    `;
    let autoAssignEnabled: boolean | null = null;
    try {
      const raw = autoAssignRaw[0]?.value as { enabled?: boolean } | null;
      autoAssignEnabled = raw?.enabled ?? true;
    } catch {
      autoAssignEnabled = null;
    }
    const msgCount = await sql`SELECT count(*)::int AS n FROM lead_messages`;
    let crmClientsCount: number | null = null;
    try {
      const crmRows = await sql`SELECT count(*)::int AS n FROM crm_clients`;
      crmClientsCount = crmRows[0]?.n ?? 0;
    } catch {
      crmClientsCount = null;
    }
    // ¿Coinciden los conversation_id de los mensajes con los ids de las conversaciones?
    const orphanMsgs = await sql`
      SELECT count(*)::int AS n FROM lead_messages m
      WHERE NOT EXISTS (SELECT 1 FROM lead_conversations c WHERE c.id = m.conversation_id)
    `;
    const convWithMsgs = await sql`
      SELECT count(*)::int AS n FROM lead_conversations c
      WHERE EXISTS (SELECT 1 FROM lead_messages m WHERE m.conversation_id = c.id)
    `;
    // Prueba directa del read-path: lee los mensajes de la conversación con más.
    const top = await sql`
      SELECT conversation_id, count(*)::int AS n FROM lead_messages
      GROUP BY conversation_id ORDER BY n DESC LIMIT 1
    `;
    // Sonda del listado admin: reproduce la consulta real y expone el error.
    let adminListTest: { ok: boolean; count?: number; error?: string } | null = null;
    try {
      const adminRows = await sql`
        SELECT id, phone, customer_name, last_message, last_message_at, last_message_direction,
               unread, online, assigned_advisor_id, assigned_advisor_name, admin_status
        FROM lead_conversations
        ORDER BY last_message_at DESC
      `;
      adminListTest = { ok: true, count: adminRows.length };
    } catch (e) {
      adminListTest = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }

    let readTest: { conversationId: string; count: number; ms: number } | null = null;
    const topId = top[0]?.conversation_id as string | undefined;
    if (topId) {
      const t0 = Date.now();
      const msgs = await sql`
        SELECT id FROM lead_messages WHERE conversation_id = ${topId} ORDER BY created_at ASC
      `;
      readTest = { conversationId: topId, count: msgs.length, ms: Date.now() - t0 };
    }

    const lastMessage = await sql`
      SELECT m.id, m.body, m.message_type, m.media_asset_id, m.direction, m.created_at,
             a.public_url AS media_public_url
      FROM lead_messages m
      LEFT JOIN media_assets a ON a.id = m.media_asset_id
      ORDER BY m.created_at DESC
      LIMIT 1
    `;
    const mediaTable = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'media_assets'
      ) AS ok
    `;

    let authLoginProbe: {
      ok: boolean;
      columns?: string[];
      missing?: string[];
      selectTest?: boolean;
      error?: string;
    } | null = null;
    try {
      const authCols = await sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name IN ('token_version', 'presence_status', 'last_seen_at')
        ORDER BY column_name
      `;
      const present = authCols.map((r) => String(r.column_name));
      const required = ["token_version", "presence_status", "last_seen_at"];
      const missing = required.filter((c) => !present.includes(c));
      let selectTest = false;
      if (missing.length === 0) {
        await sql`
          SELECT id FROM users
          WHERE active = true
            AND (lower(email) = '___probe___' OR lower(username) = '___probe___')
          LIMIT 1
        `;
        selectTest = true;
      }
      authLoginProbe = {
        ok: missing.length === 0 && selectTest,
        columns: present,
        missing,
        selectTest,
      };
    } catch (e) {
      authLoginProbe = {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }

    return NextResponse.json({
      adminListTest,
      readTest,
      authLoginProbe,
      lastMessage: lastMessage[0] ?? null,
      hasMediaAssetsTable: Boolean((mediaTable[0] as { ok?: boolean })?.ok),
      configured: true,
      connected: true,
      mode: "postgres",
      provider: url?.includes("supabase") ? "supabase" : "postgres",
      poolerWarnings: inspectDatabaseUrlPooler(url),
      runtimeMigrationsEnabled: runtimeMigrationsEnabled(),
      tables: tables.map((t) => t.table_name),
      users: users[0]?.n ?? 0,
      conversations: convCount[0]?.n ?? 0,
      unassignedConversations: unassigned[0]?.n ?? 0,
      activeAdvisors: activeAdvisors[0]?.n ?? 0,
      autoAssignEnabled,
      messages: msgCount[0]?.n ?? 0,
      crmClients: crmClientsCount,
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
