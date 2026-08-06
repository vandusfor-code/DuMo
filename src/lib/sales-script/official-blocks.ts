import type { ScriptBuildContext } from "./context";
import { renderTemplate } from "./render";

type StepDef = { id: string; title: string; template: string; when?: (ctx: ScriptBuildContext) => boolean };

const OFFICIAL = {
  intro: `Buenos días/tardes, mi nombre es {{nombre_ejecutivo}} y le hablo de WOM.

{{nombre_cliente}}, gracias por contactarnos. A continuación le guiaré paso a paso en su contratación para que todo quede claro y registrado correctamente.`,

  validation: `Antes de continuar, necesito validar sus datos personales:

Nombre completo: {{nombre_cliente}}
RUT: {{rut}}
Dirección de despacho: {{direccion}}
Región: {{region}} — Comuna: {{comuna}}
Correo electrónico: {{correo}}
Teléfono de contacto: {{telefono}}

¿Me confirma que estos datos son correctos?`,

  contractSummary: `Resumen de su contratación:

Número a portar: {{numero_portar}}
Operador actual: {{operador_actual}}
Plan contratado: {{plan}} — {{valor_plan}} mensual
Cantidad de líneas: {{lineas}}
{{resumen_lineas_adicionales}}
Total mensual: {{valor_total}}

Promociones aplicables: {{promociones}}`,

  planBenefits: `Le detallo los beneficios incluidos en su {{plan}}:

{{beneficios}}

{{condiciones_especiales}}`,

  generalConditions: `Condiciones generales de su servicio:

• Recibirá la confirmación y boletas en su correo: {{correo}}
• Puede gestionar su plan desde la APP WOM
• Roaming internacional sujeto a condiciones del plan contratado
• Nuestro equipo dará seguimiento a su activación y entrega

¿Tiene alguna duda hasta aquí?`,

  deliveryHome: `Entrega — Despacho a domicilio:

Dirección: {{direccion}}
Región: {{region}} — Comuna: {{comuna}}
Fecha estimada de entrega: {{fecha_entrega}}
Teléfono de contacto: {{telefono}}

El chip o equipo será despachado a la dirección indicada. Nuestro operador logístico lo contactará para coordinar la entrega.`,

  deliveryStore: `Entrega — Retiro en tienda:

Sucursal: {{nombre_sucursal}}
Dirección: {{direccion_sucursal}}
Horario: {{horario_sucursal}}
Fecha disponible desde: {{fecha_entrega}}
Código de retiro: {{codigo_retiro}}

Presente este código junto con su cédula de identidad en la sucursal indicada.`,

  portabilityProcess: `Proceso de portabilidad:

• Recibirá un chip WOM nuevo
• El cambio se realiza en un plazo de 24 a 48 horas hábiles
• Durante la portabilidad tendrá un número temporal WOM
• Debe estar al día en pagos con su operador actual
• No debe tener deudas pendientes con el operador de origen

¿Me confirma que comprende el proceso?`,

  capCode: `Código CAP — Portabilidad:

Para completar su portabilidad desde {{operador_actual}}, necesitaremos su Código CAP.

Este código lo puede solicitar marcando desde su línea actual al operador de origen, indicando que desea portar su número a WOM.

Una vez obtenido, deberá proporcionarlo para activar la portabilidad.`,

  prepaidGift: `Chip prepago de regalo:

Como beneficio de bienvenida, recibirá un chip prepago adicional sin costo, ideal para un familiar o como línea de respaldo.

Este chip será activado junto con su portabilidad principal.`,

  survey: `Encuesta de calidad:

Al finalizar esta llamada, es posible que reciba una encuesta breve sobre la atención recibida. Su opinión nos ayuda a mejorar continuamente.

Le agradecemos de antemano su tiempo.`,

  acceptance: `Aceptación del servicio:

¿Acepta usted contratar el plan {{plan}} por un valor mensual de {{valor_total}}, bajo las condiciones informadas?

Si ACEPTA:
Procederemos con el registro de su contratación y el proceso de validación de identidad (VDI). Recuerde deshabilitar el servicio 809 de su operador actual antes de la portabilidad.

Si NO ACEPTA:
Entendemos su decisión. Quedamos atentos si desea retomar la contratación en otro momento.`,

  referral: `Programa referidos WOM:

¿Conoce a alguien que también quiera cambiarse a WOM?

Si desea referir a un familiar o amigo, indíqueme su nombre y teléfono para que un ejecutivo lo contacte con la misma oferta.`,

  farewell: `Despedida:

Ha sido un placer atenderle, {{nombre_cliente}}.

Si tiene consultas, puede escribirme a {{correo_ejecutivo}}. Soy {{nombre_ejecutivo}}.

¡Bienvenido/a a WOM! Disfrute de todos los beneficios de su {{plan}}.`,

  equipmentInfo: `Información de su equipo:

Equipo: {{equipo}}
Pie: {{pie}}
Financiamiento: {{cuotas}} cuotas de {{valor_cuota}}
Valor total del equipo: {{valor_equipo_total}}

{{caracteristicas_equipo}}

Los valores del equipo son fijos según catálogo vigente y no pueden modificarse.`,
};

function step(id: string, title: string, template: string, when?: StepDef["when"]): StepDef {
  return { id, title, template, when };
}

const PORTABILITY_NO_EQUIPMENT_STEPS: StepDef[] = [
  step("intro", "Introducción", OFFICIAL.intro),
  step("validation", "Validación de datos", OFFICIAL.validation),
  step("contract", "Resumen contratación", OFFICIAL.contractSummary),
  step("benefits", "Beneficios del plan", OFFICIAL.planBenefits),
  step("conditions", "Condiciones generales", OFFICIAL.generalConditions),
  step("delivery-home", "Entrega — Domicilio", OFFICIAL.deliveryHome, (c) => c.deliveryIsHome),
  step("delivery-store", "Entrega — Tienda", OFFICIAL.deliveryStore, (c) => c.deliveryIsStore),
  step("portability", "Proceso portabilidad", OFFICIAL.portabilityProcess, (c) => c.saleType === "portability"),
  step("cap", "Código CAP", OFFICIAL.capCode, (c) => c.requiresCapCode),
  step("prepaid-gift", "Chip prepago regalo", OFFICIAL.prepaidGift, (c) => c.saleType === "portability"),
  step("survey", "Encuesta", OFFICIAL.survey),
  step("acceptance", "Aceptación", OFFICIAL.acceptance),
  step("referral", "Referido", OFFICIAL.referral),
  step("farewell", "Despedida", OFFICIAL.farewell),
];

const EQUIPMENT_STEP = step(
  "equipment",
  "Información del equipo",
  OFFICIAL.equipmentInfo,
  (c) => c.hasEquipment,
);

export function buildStepsFromDefs(
  defs: StepDef[],
  ctx: ScriptBuildContext,
): { id: string; title: string; content: string }[] {
  const withEquipment = ctx.hasEquipment
    ? [...defs.slice(0, 4), EQUIPMENT_STEP, ...defs.slice(4)]
    : defs;

  return withEquipment
    .filter((s) => !s.when || s.when(ctx))
    .map((s) => ({
      id: s.id,
      title: s.title,
      content: renderTemplate(s.template, ctx.vars),
    }));
}

export function buildPortabilityNoEquipmentSteps(ctx: ScriptBuildContext) {
  return buildStepsFromDefs(PORTABILITY_NO_EQUIPMENT_STEPS, ctx);
}

export function flowTitle(ctx: ScriptBuildContext): string {
  const type = ctx.saleType === "portability" ? "PORTABILIDAD" : ctx.vars.tipo_venta.toUpperCase();
  const equipment = ctx.hasEquipment ? "CON EQUIPO" : "SIN EQUIPO";
  return `${type} ${equipment}`;
}

export function flowKey(ctx: ScriptBuildContext): string {
  return `${ctx.saleType}_${ctx.hasEquipment ? "with_equipment" : "no_equipment"}`;
}
