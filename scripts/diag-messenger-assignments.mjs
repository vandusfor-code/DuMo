#!/usr/bin/env node
/** Diagnóstico: chats Messenger en BD vs asignación. */
import postgres from "postgres";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadUrl() {
  if (process.env.DATABASE_URL1?.trim()) return process.env.DATABASE_URL1.trim();
  const local = path.join(root, ".env.local");
  if (existsSync(local)) {
    for (const line of readFileSync(local, "utf8").split(/\r?\n/)) {
      const m = line.trim().match(/^DATABASE_URL1=(.+)$/);
      if (m?.[1]) return m[1].trim();
    }
  }
  return null;
}

const url = loadUrl();
if (!url) {
  console.error("DATABASE_URL1 required");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false });

try {
  const autoAssign = await sql`
    SELECT value FROM app_config WHERE key = 'leads_auto_assign' LIMIT 1
  `;

  const summary = await sql`
    SELECT
      count(*) FILTER (WHERE id LIKE 'messenger:%')::int AS messenger_total,
      count(*) FILTER (WHERE id LIKE 'messenger:%' AND assigned_advisor_id IS NULL)::int AS messenger_unassigned,
      count(*) FILTER (WHERE id LIKE 'messenger:%' AND assigned_advisor_id IS NOT NULL)::int AS messenger_assigned,
      count(*) FILTER (WHERE assigned_advisor_id IS NULL)::int AS all_unassigned
    FROM lead_conversations
  `;

  const recent = await sql`
    SELECT
      c.id,
      c.customer_name,
      c.assigned_advisor_name,
      c.admin_status,
      c.last_message,
      c.last_message_at,
      c.last_message_direction,
      (
        SELECT count(*)::int FROM lead_messages m WHERE m.conversation_id = c.id
      ) AS msg_count,
      (
        SELECT count(*)::int FROM lead_messages m
        WHERE m.conversation_id = c.id AND m.direction = 'in'
      ) AS inbound_count
    FROM lead_conversations c
    WHERE c.id LIKE 'messenger:%'
    ORDER BY c.last_message_at DESC NULLS LAST
    LIMIT 15
  `;

  const advisors = await sql`
    SELECT name, presence_status, last_seen_at,
      (last_seen_at IS NOT NULL AND last_seen_at > now() - interval '10 minutes') AS recently_online
    FROM users
    WHERE role = 'asesora' AND active = true
    ORDER BY name
  `;

  const byAdvisor = await sql`
    SELECT assigned_advisor_name, count(*)::int AS n
    FROM lead_conversations
    WHERE id LIKE 'messenger:%'
    GROUP BY assigned_advisor_name
    ORDER BY n DESC
  `;

  console.log(
    JSON.stringify(
      {
        autoAssign: autoAssign[0]?.value ?? null,
        summary: summary[0],
        messengerByAdvisor: byAdvisor,
        advisors,
        recentMessenger: recent,
      },
      null,
      2,
    ),
  );
} finally {
  await sql.end({ timeout: 5 });
}
