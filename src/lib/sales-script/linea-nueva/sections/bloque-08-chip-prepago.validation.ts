import type { LineaNuevaScriptContext } from "../linea-nueva-types";

export class LineaNuevaBloque08ValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "LineaNuevaBloque08ValidationError";
  }
}

function clientFirstName(ctx: LineaNuevaScriptContext): string {
  const full = ctx.cliente.nombre.trim();
  if (!full) return "";
  return full.split(/\s+/)[0] ?? full;
}

/** Valida datos mínimos antes de construir el Bloque 8. */
export function assertLineaNuevaBloque08Ready(ctx: LineaNuevaScriptContext): LineaNuevaScriptContext {
  if (!ctx.cliente.nombre.trim()) {
    throw new LineaNuevaBloque08ValidationError(
      "Falta el nombre del cliente para generar el discurso del chip prepago de regalo.",
      "MISSING_CLIENT_NAME",
    );
  }

  if (!clientFirstName(ctx).trim()) {
    throw new LineaNuevaBloque08ValidationError(
      "No se pudo resolver el primer nombre del cliente para el chip prepago de regalo.",
      "MISSING_CLIENT_FIRST_NAME",
    );
  }

  return ctx;
}

export function lineaNuevaClientFirstName(ctx: LineaNuevaScriptContext): string {
  const ready = assertLineaNuevaBloque08Ready(ctx);
  const full = ready.cliente.nombre.trim();
  return full.split(/\s+/)[0] ?? full;
}
