import type { ScriptBuildContext } from "@/lib/sales-script/context";

/** Discurso del resumen de contratación — construido desde la oferta comercial. */
export function buildContractResumenSpeech(ctx: ScriptBuildContext): string {
  const v = ctx.vars;
  const parts = [
    "Continuemos con un breve resumen de tu contratación.",
    "",
    `Tu nombre completo es ${v.nombre_cliente}, RUT ${v.rut}, domiciliado en ${v.direccion_completa}, correo electrónico ${v.correo} y tu número de contacto es ${v.telefono}.`,
    "",
    `Según las condiciones acordadas, aceptas contratar hoy ${v.fecha_contratacion} la portabilidad de tu número ${v.numero_portar}, proveniente de ${v.operador_actual}, a WOM con el plan ${v.plan} por un valor mensual transparente de ${v.valor_plan}.`,
  ];

  if (v.promociones?.trim()) {
    parts.push("", v.promociones);
  }

  parts.push(
    "",
    "Si por algún motivo el número no se porta, los beneficios explicados quedarán sin efecto. Por eso es importante cumplir con las condiciones de portabilidad que te explicaré en breve.",
    "",
    v.resumen_multilinea,
    "",
    "¿Son correctos tus datos?",
  );

  return parts.join("\n");
}
