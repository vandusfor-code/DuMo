import type { LineaNuevaScriptContext } from "../linea-nueva-types";
import {
  isLineaNuevaIdCardCarrier,
  isLineaNuevaNomadCarrier,
} from "../delivery/linea-nueva-delivery-types";

export class LineaNuevaBloque06ValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "LineaNuevaBloque06ValidationError";
  }
}

type ValidationRule = {
  code: string;
  message: string;
  test: (ctx: LineaNuevaScriptContext) => boolean;
};

const RULES: ValidationRule[] = [
  {
    code: "MISSING_DELIVERY_TYPE",
    message: "Selecciona despacho a domicilio o retiro en tienda para generar el Bloque 6.",
    test: (ctx) => ctx.despacho.tipo === "domicilio" || ctx.despacho.tipo === "tienda",
  },
  {
    code: "MISSING_DELIVERY_DATE",
    message: "Falta la fecha de entrega para generar el Bloque 6 de despacho.",
    test: (ctx) => Boolean(ctx.despacho.fechaEntrega.trim()),
  },
];

function homeRules(): ValidationRule[] {
  return [
    {
      code: "MISSING_HOME_ADDRESS",
      message: "Falta la dirección de despacho (región, comuna o calle) para generar el Bloque 6.",
      test: (ctx) =>
        Boolean(ctx.despacho.region.trim()) &&
        Boolean(ctx.despacho.comuna.trim()) &&
        Boolean(ctx.despacho.direccionEntrega.trim()),
    },
    {
      code: "MISSING_CONTACT_PHONE",
      message: "Falta el teléfono de contacto del cliente para generar el Bloque 6 de despacho.",
      test: (ctx) => ctx.despacho.contactPhones.some((phone) => phone.trim().length > 0),
    },
    {
      code: "MISSING_CARRIER",
      message: "Falta el transportista de despacho (ALAS, SROUTE, CHILEPARCEL o NOMAD).",
      test: (ctx) => Boolean(ctx.despacho.carrier),
    },
    {
      code: "INVALID_CARRIER",
      message: "El transportista de despacho no es válido para Línea Nueva.",
      test: (ctx) =>
        isLineaNuevaIdCardCarrier(ctx.despacho.carrier) ||
        isLineaNuevaNomadCarrier(ctx.despacho.carrier),
    },
  ];
}

function storeRules(): ValidationRule[] {
  return [
    {
      code: "MISSING_PICKUP_STORE",
      message: "Falta la sucursal WOM para retiro en tienda.",
      test: (ctx) =>
        Boolean(ctx.despacho.tiendaNombre.trim()) &&
        Boolean(ctx.despacho.tiendaDireccion.trim()) &&
        Boolean(ctx.despacho.tiendaHorario.trim()),
    },
  ];
}

/** Valida datos mínimos antes de construir el Bloque 6. */
export function assertLineaNuevaBloque06Ready(ctx: LineaNuevaScriptContext): LineaNuevaScriptContext {
  for (const rule of RULES) {
    if (!rule.test(ctx)) {
      throw new LineaNuevaBloque06ValidationError(rule.message, rule.code);
    }
  }

  const branchRules = ctx.despacho.tipo === "domicilio" ? homeRules() : storeRules();
  for (const rule of branchRules) {
    if (!rule.test(ctx)) {
      throw new LineaNuevaBloque06ValidationError(rule.message, rule.code);
    }
  }

  return ctx;
}
