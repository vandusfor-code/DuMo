import { saludoScriptVarsFromLineaNueva } from "../linea-nueva-teleprompter-adapter";
import type { LineaNuevaScriptContext } from "../linea-nueva-types";

export class LineaNuevaBloque11ValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "LineaNuevaBloque11ValidationError";
  }
}

/** Mismo criterio Portabilidad `n(ctx)`: `cliente_primer_nombre || nombre_cliente`. */
export function lineaNuevaPrefijo809ClientFirstName(ctx: LineaNuevaScriptContext): string {
  const vars = saludoScriptVarsFromLineaNueva(ctx);
  return vars.cliente_primer_nombre || vars.nombre_cliente;
}

/** Valida datos mínimos antes de construir el Bloque 11. */
export function assertLineaNuevaBloque11Ready(ctx: LineaNuevaScriptContext): LineaNuevaScriptContext {
  if (!ctx.cliente.nombre.trim()) {
    throw new LineaNuevaBloque11ValidationError(
      "Falta el nombre del cliente para generar el discurso del prefijo 809.",
      "MISSING_CLIENT_NAME",
    );
  }

  if (!lineaNuevaPrefijo809ClientFirstName(ctx).trim()) {
    throw new LineaNuevaBloque11ValidationError(
      "No se pudo resolver el primer nombre del cliente para el prefijo 809.",
      "MISSING_CLIENT_FIRST_NAME",
    );
  }

  return ctx;
}
