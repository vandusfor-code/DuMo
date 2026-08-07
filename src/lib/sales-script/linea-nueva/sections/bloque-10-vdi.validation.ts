import { saludoScriptVarsFromLineaNueva } from "../linea-nueva-teleprompter-adapter";
import type { LineaNuevaScriptContext } from "../linea-nueva-types";

export class LineaNuevaBloque10ValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "LineaNuevaBloque10ValidationError";
  }
}

/** Mismo criterio Portabilidad `n(ctx)`: `cliente_primer_nombre || nombre_cliente`. */
export function lineaNuevaVdiClientFirstName(ctx: LineaNuevaScriptContext): string {
  const vars = saludoScriptVarsFromLineaNueva(ctx);
  return vars.cliente_primer_nombre || vars.nombre_cliente;
}

/** Valida datos mínimos antes de construir el Bloque 10. */
export function assertLineaNuevaBloque10Ready(ctx: LineaNuevaScriptContext): LineaNuevaScriptContext {
  if (!ctx.cliente.nombre.trim()) {
    throw new LineaNuevaBloque10ValidationError(
      "Falta el nombre del cliente para generar el discurso de aceptación y VDI.",
      "MISSING_CLIENT_NAME",
    );
  }

  if (!lineaNuevaVdiClientFirstName(ctx).trim()) {
    throw new LineaNuevaBloque10ValidationError(
      "No se pudo resolver el primer nombre del cliente para aceptación y VDI.",
      "MISSING_CLIENT_FIRST_NAME",
    );
  }

  return ctx;
}
