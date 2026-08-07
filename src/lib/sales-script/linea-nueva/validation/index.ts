import type {
  LineaNuevaScriptContext,
  LineaNuevaValidationError,
  LineaNuevaValidationResult,
} from "../linea-nueva-types";

export type LineaNuevaValidator = {
  id: string;
  validate: (ctx: LineaNuevaScriptContext) => LineaNuevaValidationError | null;
};

/** Validadores registrables — fase post-documento oficial. */
export const LINEA_NUEVA_VALIDATORS: LineaNuevaValidator[] = [];

// TODO (LINEA NUEVA):
// Pendiente implementación desde el documento oficial
// "SCRIPT DE CIERRE LÍNEA NUEVA SIN EQUIPO.docx"
// No implementar validaciones comerciales hasta realizar la auditoría documental.

export function registerLineaNuevaValidator(validator: LineaNuevaValidator): void {
  LINEA_NUEVA_VALIDATORS.push(validator);
}

/** Validaciones estructurales mínimas (sin reglas comerciales). */
const BASE_VALIDATORS: LineaNuevaValidator[] = [
  {
    id: "venta.linea_nueva",
    validate(ctx) {
      if (ctx.venta.saleType !== "new_line") {
        return {
          code: "INVALID_SALE_TYPE",
          message: "El motor Línea Nueva solo admite ventas de tipo new_line.",
          field: "venta.saleType",
        };
      }
      return null;
    },
  },
  {
    id: "venta.min_lineas",
    validate(ctx) {
      if (ctx.lineas.length === 0) {
        return {
          code: "NO_LINES",
          message: "Se requiere al menos una línea para construir el script.",
          field: "lineas",
        };
      }
      return null;
    },
  },
  {
    id: "cliente.nombre",
    validate(ctx) {
      if (!ctx.cliente.nombre.trim()) {
        return {
          code: "MISSING_CLIENT_NAME",
          message: "Falta el nombre del cliente.",
          field: "cliente.nombre",
        };
      }
      return null;
    },
  },
];

export function validateLineaNuevaContext(
  ctx: LineaNuevaScriptContext,
): LineaNuevaValidationResult {
  const validators = [...BASE_VALIDATORS, ...LINEA_NUEVA_VALIDATORS];
  const errors: LineaNuevaValidationError[] = [];

  for (const validator of validators) {
    const error = validator.validate(ctx);
    if (error) errors.push(error);
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true };
}
