import type { LineaNuevaScriptContext } from "../linea-nueva-types";
import { enrichLineaNuevaTeleprompterContext } from "../linea-nueva-teleprompter-adapter";

export class LineaNuevaBloque04ValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "LineaNuevaBloque04ValidationError";
  }
}

type ValidationRule = {
  code: string;
  message: string;
  test: (ctx: LineaNuevaScriptContext) => boolean;
};

const RULES: ValidationRule[] = [
  {
    code: "MISSING_CLIENT_NAME",
    message: "Falta el nombre del cliente para generar los beneficios del plan.",
    test: (ctx) => Boolean(ctx.cliente.nombre.trim()),
  },
  {
    code: "MISSING_LINES",
    message: "Se requiere al menos una línea de venta para generar los beneficios del plan.",
    test: (ctx) => ctx.lineas.length > 0,
  },
  {
    code: "MISSING_PLAN",
    message: "Falta el plan comercial de la línea principal.",
    test: (ctx) => Boolean(ctx.mainPlan),
  },
];

/** Valida datos mínimos antes de construir el Bloque 4. */
export function assertLineaNuevaBloque04Ready(ctx: LineaNuevaScriptContext): LineaNuevaScriptContext {
  for (const rule of RULES) {
    if (!rule.test(ctx)) {
      throw new LineaNuevaBloque04ValidationError(rule.message, rule.code);
    }
  }

  const enriched = enrichLineaNuevaTeleprompterContext(ctx);
  if (enriched.lineDetails.length === 0) {
    throw new LineaNuevaBloque04ValidationError(
      "No se pudieron resolver los detalles comerciales de las líneas.",
      "MISSING_LINE_DETAILS",
    );
  }

  for (const line of enriched.lineDetails) {
    if (!line.plan) {
      throw new LineaNuevaBloque04ValidationError(
        `El plan "${line.planId}" no existe en el catálogo comercial.`,
        "INVALID_PLAN",
      );
    }
  }

  return enriched;
}
