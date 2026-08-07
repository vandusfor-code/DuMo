import type { LineaNuevaScriptContext } from "../linea-nueva-types";
import { enrichLineaNuevaTeleprompterContext } from "../linea-nueva-teleprompter-adapter";

export class LineaNuevaBloque03ValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "LineaNuevaBloque03ValidationError";
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
    message: "Falta el nombre del cliente para generar el resumen de contratación.",
    test: (ctx) => Boolean(ctx.cliente.nombre.trim()),
  },
  {
    code: "MISSING_CLIENT_EMAIL",
    message: "Falta el correo electrónico del cliente para generar el resumen de contratación.",
    test: (ctx) => Boolean((ctx.cliente.email || ctx.sourceGestion.lines[0]?.email || "").trim()),
  },
  {
    code: "MISSING_CLIENT_PHONE",
    message: "Falta el teléfono de contacto del cliente para generar el resumen de contratación.",
    test: (ctx) => Boolean((ctx.cliente.telefono || ctx.sourceGestion.phone || "").trim()),
  },
  {
    code: "MISSING_ADVISOR",
    message: "Falta el nombre del ejecutivo para generar el resumen de contratación.",
    test: (ctx) => Boolean(ctx.usuario.advisorName.trim()),
  },
  {
    code: "MISSING_LINES",
    message: "Se requiere al menos una línea de venta para generar el resumen de contratación.",
    test: (ctx) => ctx.lineas.length > 0,
  },
  {
    code: "MISSING_PLAN",
    message: "Falta el plan comercial de la línea principal.",
    test: (ctx) => Boolean(ctx.mainPlan),
  },
];

/** Valida datos mínimos antes de construir el Bloque 3. */
export function assertLineaNuevaBloque03Ready(ctx: LineaNuevaScriptContext): LineaNuevaScriptContext {
  for (const rule of RULES) {
    if (!rule.test(ctx)) {
      throw new LineaNuevaBloque03ValidationError(rule.message, rule.code);
    }
  }

  const enriched = enrichLineaNuevaTeleprompterContext(ctx);
  if (enriched.lineDetails.length === 0) {
    throw new LineaNuevaBloque03ValidationError(
      "No se pudieron resolver los detalles comerciales de las líneas.",
      "MISSING_LINE_DETAILS",
    );
  }

  for (const line of enriched.lineDetails) {
    if (!line.plan) {
      throw new LineaNuevaBloque03ValidationError(
        `El plan "${line.planId}" no existe en el catálogo comercial.`,
        "INVALID_PLAN",
      );
    }
  }

  return enriched;
}
