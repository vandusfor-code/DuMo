import type {
  LineaNuevaRule,
  LineaNuevaRuleEvaluation,
  LineaNuevaRuleFlags,
  LineaNuevaScriptContext,
} from "./linea-nueva-types";

export const DEFAULT_LINEA_NUEVA_RULE_FLAGS: LineaNuevaRuleFlags = {
  includeBeneficios: true,
  includeDespacho: true,
  includeCompatibilidad: true,
  includeChipPrepago: true,
  includeEncuesta: true,
  includeVdi: true,
  includePrefijo809: true,
  includeReferido: true,
  includeCondiciones: true,
  additionalLineCount: 0,
  hasFreeBills: false,
  hasAdditionalLines: false,
  planTier: "unknown",
  deliveryIsHome: false,
  deliveryIsStore: false,
};

/**
 * Rule Engine del Script Línea Nueva.
 *
 * TODO (LINEA NUEVA):
 * Pendiente implementación desde el documento oficial
 * "SCRIPT DE CIERRE LÍNEA NUEVA SIN EQUIPO.docx"
 * No implementar reglas comerciales hasta realizar la auditoría documental.
 */
export class LineaNuevaRuleEngine {
  private rules: LineaNuevaRule[] = [];

  register(rule: LineaNuevaRule): this {
    this.rules.push(rule);
    this.rules.sort((a, b) => a.priority - b.priority);
    return this;
  }

  registerMany(rules: LineaNuevaRule[]): this {
    for (const rule of rules) this.register(rule);
    return this;
  }

  evaluate(ctx: LineaNuevaScriptContext): LineaNuevaRuleEvaluation {
    const flags: LineaNuevaRuleFlags = {
      ...DEFAULT_LINEA_NUEVA_RULE_FLAGS,
      additionalLineCount: Math.max(0, ctx.venta.lineCount - 1),
      hasAdditionalLines: ctx.venta.lineCount > 1,
      hasFreeBills: ctx.promociones.hasFreeBills,
      deliveryIsHome: ctx.despacho.tipo === "domicilio",
      deliveryIsStore: ctx.despacho.tipo === "tienda",
    };

    const matchedRuleIds: string[] = [];
    const skippedRuleIds: string[] = [];

    for (const rule of this.rules) {
      if (rule.when(ctx)) {
        Object.assign(flags, rule.apply(ctx));
        matchedRuleIds.push(rule.id);
      } else {
        skippedRuleIds.push(rule.id);
      }
    }

    return { flags, matchedRuleIds, skippedRuleIds };
  }

  listRules(): readonly LineaNuevaRule[] {
    return this.rules;
  }
}

export function createLineaNuevaRuleEngine(): LineaNuevaRuleEngine {
  return new LineaNuevaRuleEngine();
}

export const lineaNuevaRuleEngine = createLineaNuevaRuleEngine();
