/**
 * Bloque 1 — Saludo transversal (todos los flujos comerciales DuMo).
 * Fuente aprobada: Portabilidad Sin Equipo v1.0 (congelado).
 */

import type { ScriptBuildContext } from "@/lib/sales-script/context";

function v(ctx: ScriptBuildContext, key: string): string {
  return ctx.vars[key] ?? "";
}

function clientDisplayName(ctx: ScriptBuildContext): string {
  const first = v(ctx, "cliente_primer_nombre").trim();
  if (first) return first;
  const full = v(ctx, "nombre_cliente").trim();
  if (!full) return "estimado cliente";
  return full.split(/\s+/)[0] ?? full;
}

/** Bloque 1 — Saludo ✅ Aprobado v1.0 (congelado, transversal). */
export function buildBlock1SaludoSpeech(ctx: ScriptBuildContext): string {
  const client = clientDisplayName(ctx);
  const executive = v(ctx, "nombre_ejecutivo") || "tu ejecutivo WOM";

  return [
    `${v(ctx, "saludo")} Habla ${executive} de WOM.`,
    "",
    `¿Tengo el gusto de hablar con ${client}?`,
    "",
    `Un gusto, ${client}.`,
    "",
    "Para dar continuidad a lo anteriormente conversado, te informaré las condiciones de tu contratación.",
  ].join("\n");
}
