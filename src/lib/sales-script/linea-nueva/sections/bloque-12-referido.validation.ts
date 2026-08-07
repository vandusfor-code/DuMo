import { saludoScriptVarsFromLineaNueva } from "../linea-nueva-teleprompter-adapter";
import type { LineaNuevaScriptContext } from "../linea-nueva-types";

export class LineaNuevaBloque12ValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "LineaNuevaBloque12ValidationError";
  }
}

/** Mismo criterio Portabilidad `n(ctx)`: `cliente_primer_nombre || nombre_cliente`. */
export function lineaNuevaReferidoClientFirstName(ctx: LineaNuevaScriptContext): string {
  const vars = saludoScriptVarsFromLineaNueva(ctx);
  return vars.cliente_primer_nombre || vars.nombre_cliente;
}

/** Valida datos mínimos antes de construir el Bloque 12. */
export function assertLineaNuevaBloque12Ready(ctx: LineaNuevaScriptContext): LineaNuevaScriptContext {
  if (!ctx.cliente.nombre.trim()) {
    throw new LineaNuevaBloque12ValidationError(
      "Falta el nombre del cliente para generar el discurso de referido.",
      "MISSING_CLIENT_NAME",
    );
  }

  if (!lineaNuevaReferidoClientFirstName(ctx).trim()) {
    throw new LineaNuevaBloque12ValidationError(
      "No se pudo resolver el primer nombre del cliente para el discurso de referido.",
      "MISSING_CLIENT_FIRST_NAME",
    );
  }

  return ctx;
}
