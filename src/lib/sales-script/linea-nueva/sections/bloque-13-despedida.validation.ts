import type { LineaNuevaScriptContext } from "../linea-nueva-types";

export class LineaNuevaBloque13ValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "LineaNuevaBloque13ValidationError";
  }
}

/** Mismo criterio Portabilidad: `correo_ejecutivo` desde sesión asesora. */
export function lineaNuevaDespedidaExecutiveEmail(ctx: LineaNuevaScriptContext): string {
  return ctx.usuario.advisorEmail.trim() || "asesor@ventas.wom.cl";
}

/** Mismo criterio Portabilidad: `nombre_ejecutivo` desde sesión asesora. */
export function lineaNuevaDespedidaExecutiveName(ctx: LineaNuevaScriptContext): string {
  return ctx.usuario.advisorName.trim() || "Ejecutivo WOM";
}

/** Valida datos mínimos antes de construir el Bloque 13. */
export function assertLineaNuevaBloque13Ready(ctx: LineaNuevaScriptContext): LineaNuevaScriptContext {
  if (!ctx.usuario.advisorEmail.trim()) {
    throw new LineaNuevaBloque13ValidationError(
      "Falta el correo del ejecutivo para generar el discurso de despedida.",
      "MISSING_EXECUTIVE_EMAIL",
    );
  }

  if (!ctx.usuario.advisorName.trim()) {
    throw new LineaNuevaBloque13ValidationError(
      "Falta el nombre del ejecutivo para generar el discurso de despedida.",
      "MISSING_EXECUTIVE_NAME",
    );
  }

  return ctx;
}
