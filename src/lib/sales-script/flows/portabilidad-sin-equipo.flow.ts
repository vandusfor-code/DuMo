/**
 * Flujo conversacional: Portabilidad sin Equipo.
 * El documento oficial WOM es referencia de contenido — nunca se muestra literalmente.
 * Cada paso contiene únicamente el discurso que la asesora debe leer.
 */

import type { ScriptBuildContext } from "@/lib/sales-script/context";
import type { SalesScriptStep } from "@/types/sales-script";

export const SCRIPT_TIPO = "PORTABILIDAD_SIN_EQUIPO" as const;

type FlowStepDef = {
  id: string;
  title: string;
  content: (ctx: ScriptBuildContext) => string;
  when?: (ctx: ScriptBuildContext) => boolean;
  branch?: {
    yesNextId: string;
    noNextId: string;
  };
};

function v(ctx: ScriptBuildContext, key: string): string {
  return ctx.vars[key] ?? "";
}

const FLOW: FlowStepDef[] = [
  {
    id: "intro",
    title: "Introducción",
    content: (ctx) => {
      const c = v(ctx, "cliente_primer_nombre");
      return [
        `Hola, ${v(ctx, "saludo")}`,
        "",
        `Hablas con ${v(ctx, "nombre_ejecutivo")} de WOM.`,
        "",
        `¿Tengo el gusto de hablar con ${v(ctx, "nombre_cliente")}?`,
        "",
        c ? `Perfecto ${c}.` : "Perfecto.",
        "",
        "Para dar continuidad a lo que anteriormente conversamos, te informaré las condiciones de tu contratación.",
      ].join("\n");
    },
  },
  {
    id: "validacion",
    title: "Validación de datos",
    content: (ctx) =>
      [
        "Continuemos con un breve resumen de tu contratación.",
        "",
        `Tu nombre completo es ${v(ctx, "nombre_cliente")}, RUT ${v(ctx, "rut")}, domiciliado en ${v(ctx, "direccion_completa")}, correo electrónico ${v(ctx, "correo")} y tu número de contacto es ${v(ctx, "telefono")}.`,
        "",
        "¿Son correctos tus datos?",
      ].join("\n"),
    branch: { yesNextId: "resumen", noNextId: "validacion-corregir" },
  },
  {
    id: "validacion-corregir",
    title: "Corrección de datos",
    content: (ctx) =>
      [
        `Entiendo ${v(ctx, "cliente_primer_nombre") || v(ctx, "nombre_cliente")}.`,
        "",
        "¿Cuál dato necesitas corregir?",
      ].join("\n"),
    branch: { yesNextId: "validacion", noNextId: "validacion" },
  },
  {
    id: "resumen",
    title: "Resumen de contratación",
    content: (ctx) => {
      const promo = v(ctx, "promociones");
      const parts = [
        `Según las condiciones acordadas, aceptas contratar hoy ${v(ctx, "fecha_contratacion")} la portabilidad de tu número ${v(ctx, "numero_portar")}, proveniente de ${v(ctx, "operador_actual")}, a WOM con el plan ${v(ctx, "plan")} por un valor mensual transparente de ${v(ctx, "valor_plan")}.`,
      ];
      if (promo) parts.push("", promo);
      parts.push(
        "",
        "Si por algún motivo el número no se porta, los beneficios explicados quedarán sin efecto. Por eso es importante cumplir con las condiciones de portabilidad que te explicaré en breve.",
        "",
        v(ctx, "resumen_multilinea"),
      );
      return parts.join("\n");
    },
  },
  {
    id: "beneficios",
    title: "Beneficios del plan",
    content: (ctx) => v(ctx, "beneficios") || `Tu plan ${v(ctx, "plan")} incluye todos los beneficios acordados en la cotización.`,
  },
  {
    id: "condiciones-generales",
    title: "Condiciones generales",
    content: () =>
      [
        "Te enviaremos un correo de bienvenida a la dirección que nos proporcionaste. Es muy importante que lo revises, ya que contiene información relevante sobre tu plan y tu ciclo de facturación.",
        "",
        "Te invitamos a visitar wom.cl o descargar la App WOM para conocer todos los detalles de tus beneficios: minutos, SMS, apps libres y roaming internacional vía WhatsApp en más de 100 países.",
        "",
        "A través de la App también podrás hacer seguimiento de tu despacho en tiempo real.",
      ].join("\n"),
  },
  {
    id: "entrega-domicilio",
    title: "Entrega a domicilio",
    when: (ctx) => ctx.deliveryIsHome,
    content: (ctx) =>
      [
        `Tu chip será despachado a ${v(ctx, "region")}, ${v(ctx, "comuna")}, ${v(ctx, "direccion")}.`,
        "",
        `Tu número de contacto registrado es ${v(ctx, "telefono")}.`,
        "",
        `La entrega está programada para el ${v(ctx, "fecha_entrega")}.`,
        "",
        'Te enviaremos un correo con el asunto "Tu Compra va en Camino" cuando iniciemos el despacho.',
        "",
        "Puedes recibir el producto tú como titular, firmando la solicitud de portabilidad con tu cédula de identidad o con el código OTP que te enviaremos por WhatsApp o SMS.",
        "",
        "Si recibe un tercero, debe presentar obligatoriamente el código OTP enviado por WhatsApp o SMS.",
      ].join("\n"),
  },
  {
    id: "entrega-tienda",
    title: "Retiro en tienda",
    when: (ctx) => ctx.deliveryIsStore,
    content: (ctx) =>
      [
        `Tu chip estará disponible para retiro en ${v(ctx, "nombre_sucursal")}, ubicada en ${v(ctx, "direccion_sucursal")}.`,
        "",
        `Horario de atención: ${v(ctx, "horario_sucursal")}.`,
        "",
        `Podrás retirarlo a partir del ${v(ctx, "fecha_entrega")}.`,
        "",
        'Te enviaremos un correo con el asunto "Listo para tu retiro" y un SMS a tu número a portar con un código de verificación de 6 dígitos.',
        "",
        "Desde la recepción del correo tendrás 7 días continuos para retirar tu producto. Si no puedes ir, puedes entregar el código a un tercero para que retire por ti.",
      ].join("\n"),
  },
  {
    id: "portabilidad",
    title: "Proceso de portabilidad",
    content: (ctx) =>
      [
        `${v(ctx, "cliente_primer_nombre") || v(ctx, "nombre_cliente")}, te explico cómo funciona el proceso de portabilidad.`,
        "",
        "La portabilidad se realiza de lunes a sábado, sin incluir domingos ni festivos, en la madrugada para no interrumpir tu servicio.",
        "",
        "Cuando recibas tu chip WOM, no lo coloques en tu celular hasta que la portabilidad esté completada, de lo contrario no tendrás servicio.",
        "",
        `No botes el chip de ${v(ctx, "operador_actual")} hasta que tu portabilidad con WOM esté 100% realizada.`,
        "",
        "Normalmente la portabilidad demora 1 día hábil desde que recibes el chip WOM.",
        "",
        "Al día siguiente de recibir el chip, si pierdes señal con tu operador actual, significa que ya estás portado a WOM. En ese momento coloca el chip WOM y valida llamadas e internet.",
        "",
        `Recuerda estar al día con tus pagos en ${v(ctx, "operador_actual")}. Con deuda pendiente no es posible portarse.`,
        "",
        "Mientras tu número no se porte, activaremos un número temporal para que no pierdas el servicio con tu operador actual.",
        "",
        "¿Tienes alguna duda con el proceso de portabilidad?",
      ].join("\n"),
    branch: { yesNextId: "portabilidad-aclarar", noNextId: "chip-regalo" },
  },
  {
    id: "portabilidad-aclarar",
    title: "Aclarar dudas de portabilidad",
    content: (ctx) =>
      `Con gusto te aclaro ${v(ctx, "cliente_primer_nombre") || v(ctx, "nombre_cliente")}. Cuéntame qué parte del proceso te genera dudas.`,
    branch: { yesNextId: "chip-regalo", noNextId: "portabilidad" },
  },
  {
    id: "cap",
    title: "Código CAP",
    when: (ctx) => ctx.requiresCapCode,
    content: (ctx) =>
      [
        `${v(ctx, "cliente_primer_nombre") || v(ctx, "nombre_cliente")}, te envié un SMS al número prepago a portar con el código CAP de 4 dígitos.`,
        "",
        "¿Puedes confirmar si lo recibiste? Es necesario para ejecutar la portabilidad.",
      ].join("\n"),
    branch: { yesNextId: "cap-recibido", noNextId: "cap-pendiente" },
  },
  {
    id: "cap-recibido",
    title: "CAP recibido",
    when: (ctx) => ctx.requiresCapCode,
    content: () =>
      [
        "Perfecto, ya completamos el código.",
        "",
        "El código tiene una vigencia de 5 días. Si en ese plazo no se concreta la portabilidad, te enviaremos un nuevo CAP por SMS.",
      ].join("\n"),
  },
  {
    id: "cap-pendiente",
    title: "CAP pendiente",
    when: (ctx) => ctx.requiresCapCode,
    content: () =>
      [
        "El código tiene una vigencia de 5 días. Te contactaremos para solicitártelo.",
        "",
        "Si en ese plazo no se concreta la portabilidad, te enviaremos un nuevo CAP por SMS.",
      ].join("\n"),
  },
  {
    id: "chip-regalo",
    title: "Chip prepago de regalo",
    content: (ctx) =>
      [
        `${v(ctx, "cliente_primer_nombre") || v(ctx, "nombre_cliente")}, te regalamos un chip prepago que puedes usar o regalar.`,
        "",
        "Viene con gigas y minutos que se activan al insertarlo. El empaque indica los beneficios y la forma de activación. Lo enviaremos junto con tus productos.",
      ].join("\n"),
  },
  {
    id: "encuesta",
    title: "Encuesta de satisfacción",
    content: (ctx) =>
      [
        `${v(ctx, "cliente_primer_nombre") || v(ctx, "nombre_cliente")}, ¿qué te pareció mi atención?`,
        "",
        "Una vez que recibas tu producto, te llegará una encuesta de satisfacción a tu correo electrónico.",
        "",
        'La encuesta va del 0 al 10, donde 0 es la nota mínima y 10 la máxima. La primera pregunta — "¿Qué tan probable es que recomiendes WOM a un familiar o amigo?" — evalúa mi atención como ejecutivo.',
        "",
        "Muchas gracias por responder.",
      ].join("\n"),
  },
  {
    id: "audio-legal",
    title: "Grabación legal",
    content: (ctx) =>
      [
        `${v(ctx, "cliente_primer_nombre") || v(ctx, "nombre_cliente")}, has tomado una gran decisión.`,
        "",
        "Como no contamos con letra chica, a continuación escucharás una grabación de 30 segundos con las condiciones de tu contratación.",
        "",
        "Te pido escuchar atentamente y no cortar. Retomaré la llamada para resolver tus dudas y hacer un breve resumen.",
        "",
        "¿Tienes alguna duda con el audio que escuchaste?",
      ].join("\n"),
    branch: { yesNextId: "audio-aclarar", noNextId: "aceptacion" },
  },
  {
    id: "audio-aclarar",
    title: "Aclarar dudas del audio",
    content: (ctx) =>
      `Con gusto aclaro tus dudas ${v(ctx, "cliente_primer_nombre") || v(ctx, "nombre_cliente")}. ¿Qué parte del audio necesitas que te explique?`,
    branch: { yesNextId: "aceptacion", noNextId: "audio-legal" },
  },
  {
    id: "aceptacion",
    title: "Aceptación del contrato",
    content: (ctx) =>
      [
        `${v(ctx, "cliente_primer_nombre") || v(ctx, "nombre_cliente")}, ¿te queda alguna duda con las condiciones entregadas?`,
        "",
        "Entiendes y, en conjunto con iniciar el proceso de Validación de Identidad, aceptas las condiciones de este contrato.",
        "",
        "¿Lo aceptas?",
      ].join("\n"),
    branch: { yesNextId: "prefijo-809", noNextId: "aceptacion-reconfirmar" },
  },
  {
    id: "aceptacion-reconfirmar",
    title: "Reconfirmar aceptación",
    content: () =>
      [
        "Entiendo tu consulta. ¿Confirmas que deseas aceptar las condiciones del contrato para continuar con la validación de identidad?",
      ].join("\n"),
    branch: { yesNextId: "prefijo-809", noNextId: "aceptacion" },
  },
  {
    id: "prefijo-809",
    title: "Prefijo 809",
    content: (ctx) =>
      [
        `${v(ctx, "cliente_primer_nombre") || v(ctx, "nombre_cliente")}, según la normativa de la Subsecretaría de Telecomunicaciones, ¿te gustaría dejar de recibir llamadas spam o no deseadas bajo el prefijo 809?`,
      ].join("\n"),
    branch: { yesNextId: "prefijo-809-si", noNextId: "prefijo-809-no" },
  },
  {
    id: "prefijo-809-si",
    title: "Prefijo 809 — acepta",
    content: () =>
      [
        "Perfecto. Procederemos a deshabilitar gratis el prefijo 809 para que dejes de recibir llamadas sin tu consentimiento.",
        "",
        "Haremos la deshabilitación una vez que tu línea esté activa con nosotros.",
      ].join("\n"),
  },
  {
    id: "prefijo-809-no",
    title: "Prefijo 809 — no acepta",
    content: () =>
      [
        "Al deshabilitar el prefijo 809 evitarás recibir llamadas molestas que no solicitaste. Es una buena opción para controlar tus registros de llamadas.",
        "",
        "¿Te interesa deshabilitarlo?",
      ].join("\n"),
    branch: { yesNextId: "prefijo-809-si", noNextId: "referido" },
  },
  {
    id: "referido",
    title: "Referido",
    content: (ctx) =>
      [
        `${v(ctx, "cliente_primer_nombre") || v(ctx, "nombre_cliente")}, ¿conoces a alguien que quiera acceder a los beneficios de WOM?`,
        "",
        "¿Me podrías compartir su nombre y teléfono?",
      ].join("\n"),
  },
  {
    id: "despedida",
    title: "Despedida",
    content: (ctx) =>
      [
        `Te invito a tomar nota de mi correo ${v(ctx, "correo_ejecutivo")}, quedando a tu disposición para cualquier consulta y seguimiento de tu venta.`,
        "",
        `Fuiste atendido por ${v(ctx, "nombre_ejecutivo")}.`,
        "",
        "Bienvenido a WOM. ¡Que tengas un excelente día!",
      ].join("\n"),
  },
];

/** Resuelve el flujo activo según la gestión y devuelve pasos listos para el teleprompter. */
export function buildPortabilidadSinEquipoFlow(ctx: ScriptBuildContext): SalesScriptStep[] {
  const afterPortability = ctx.requiresCapCode ? "cap" : "chip-regalo";

  return FLOW.filter((step) => !step.when || step.when(ctx)).map((step) => {
    let branch = step.branch;
    if (step.id === "portabilidad" && branch) {
      branch = { ...branch, noNextId: afterPortability };
    }
    if (step.id === "portabilidad-aclarar" && branch) {
      branch = { ...branch, yesNextId: afterPortability };
    }
    return {
      id: step.id,
      title: step.title,
      content: step.content(ctx),
      branch,
    };
  });
}

export function flowStepIds(ctx: ScriptBuildContext): string[] {
  return buildPortabilidadSinEquipoFlow(ctx).map((s) => s.id);
}
