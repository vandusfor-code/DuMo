#!/usr/bin/env node
/** Diagnóstico + redistribución de conversaciones de una asesora. Sin PII en logs. */
import postgres from "postgres";

const username = (process.argv[2] ?? "sandra.castellanos").trim().toLowerCase();
const dryRun = process.argv.includes("--dry-run");

const url = process.env.DATABASE_URL1?.trim() || process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL1 required");
  process.exit(1);
}

const sql = postgres(url, {
  ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
  prepare: false,
});

try {
  const users = await sql`
    SELECT id, username, email, name, role, active, presence_status, last_seen_at
    FROM users
    WHERE lower(username) = ${username} OR lower(email) = ${username}
    LIMIT 1
  `;
  const user = users[0];
  if (!user) {
    console.error("Usuario no encontrado:", username);
    process.exit(1);
  }
  console.log("User:", {
    id: user.id,
    username: user.username,
    role: user.role,
    active: user.active,
    presence: user.presence_status,
  });

  const assigned = await sql`
    SELECT id, customer_name, assigned_advisor_id, assigned_advisor_name, last_message_at
    FROM lead_conversations
    WHERE assigned_advisor_id = ${user.id}
    ORDER BY last_message_at DESC
  `;
  console.log(`Conversaciones asignadas a ${user.username}:`, assigned.length);

  const byAdvisor = await sql`
    SELECT assigned_advisor_id, assigned_advisor_name, count(*)::int AS n
    FROM lead_conversations
    WHERE assigned_advisor_id IS NOT NULL
    GROUP BY assigned_advisor_id, assigned_advisor_name
    ORDER BY n DESC
  `;
  console.log("Distribución por asesora:", byAdvisor);

  const onlineAdvisors = await sql`
    SELECT id, username, name, presence_status, last_seen_at
    FROM users
    WHERE role = 'asesora' AND active = true
      AND id <> ${user.id}
      AND presence_status <> 'desconectado'
      AND last_seen_at > now() - interval '10 minutes'
    ORDER BY last_seen_at DESC
  `;
  console.log(
    "Asesoras conectadas (excl. target):",
    onlineAdvisors.map((a) => ({ id: a.id, username: a.username, presence: a.presence_status })),
  );

  if (dryRun || assigned.length === 0) {
    console.log(dryRun ? "Dry run — sin cambios." : "Nada que redistribuir.");
    process.exit(0);
  }

  if (onlineAdvisors.length === 0) {
    console.error("No hay asesoras conectadas para redistribuir. Abortando.");
    process.exit(1);
  }

  let idx = 0;
  for (const conv of assigned) {
    const target = onlineAdvisors[idx % onlineAdvisors.length];
    idx += 1;
    await sql`
      UPDATE lead_conversations SET
        assigned_advisor_id = ${target.id},
        assigned_advisor_name = ${target.name},
        assigned_advisor_at = now()
      WHERE id = ${conv.id}
    `;
    console.log(`Reassigned ${conv.id} → ${target.username}`);
  }

  const remaining = await sql`
    SELECT count(*)::int AS n FROM lead_conversations WHERE assigned_advisor_id = ${user.id}
  `;
  console.log("Conversaciones restantes en target:", remaining[0]?.n ?? 0);
  console.log("OK — redistribuidas", assigned.length, "conversaciones.");
} finally {
  await sql.end({ timeout: 5 });
}
