/**
 * Flujo conversacional: Portabilidad sin Equipo.
 * Momentos de la llamada — no párrafos del Word.
 * Prepago y Postpago comparten el mismo flujo; CAP solo si modalidad = Prepago.
 */

import type { ScriptBuildContext } from "@/lib/sales-script/context";
import { buildContractResumenSpeech } from "@/lib/sales-script/contract-resumen";
import type { SalesScriptBranch, SalesScriptStep } from "@/types/sales-script";

export const SCRIPT_TIPO = "PORTABILIDAD_SIN_EQUIPO" as const;

type FlowStepDef = {
  id: string;
  title: string;
  content: (ctx: ScriptBuildContext) => string;
  when?: (ctx: ScriptBuildContext) => boolean;
  branch?: (ctx: ScriptBuildContext) => SalesScriptBranch | undefined;
};

function v(ctx: ScriptBuildContext, key: string): string {
  return ctx.vars[key] ?? "";
}

function nombre(ctx: ScriptBuildContext): string {
  return v(ctx, "cliente_primer_nombre") || v(ctx, "nombre_cliente");
}

/** Orden oficial de momentos conversacionales. */
const CONVERSATION_MOMENTS: FlowStepDef[] = [
  {
    id: "saludo",
    title: "Saludo",
    content: (ctx) => {
      const c = v(ctx, "cliente_primer_nombre");
      return [
        v(ctx, "saludo"),
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
    id: "explicacion-audio",
    title: "Explicación del audio",
    content: (ctx) =>
      [
        `${nombre(ctx)}, has tomado una gran decisión.`,
        "",
        "Como no contamos con letra chica, a continuación escucharás una grabación de 30 segundos con las condiciones de tu contratación.",
        "",
        "Te pido escuchar atentamente y no cortar. Retomaré la llamada para resolver tus dudas y hacer un breve resumen.",
      ].join("\n"),
  },
  {
    id: "reproducir-audio",
    title: "Reproducir audio",
    content: () =>
      "Te transferiré la grabación ahora. Por favor escucha atentamente y no cortes la llamada.",
  },
  {
    id: "dudas-audio",
    title: "Resolver dudas del audio",
    content: () => "¿Tienes alguna duda con el audio que escuchaste?",
    branch: (ctx) => ({
      yesSpeech: `Con gusto te aclaro ${nombre(ctx)}. Cuéntame qué parte del audio necesitas que te explique.`,
    }),
  },
  {
    id: "resumen-contratacion",
    title: "Resumen de contratación",
    content: (ctx) => buildContractResumenSpeech(ctx),
    branch: (ctx) => ({
      noSpeech: [`Entiendo ${nombre(ctx)}.`, "", "¿Cuál dato necesitas corregir?"].join("\n"),
    }),
  },
  {
    id: "beneficios",
    title: "Beneficios",
    content: (ctx) => v(ctx, "beneficios") || `Tu plan ${v(ctx, "plan")} incluye todos los beneficios acordados.`,
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
    title: "Información de entrega",
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
    title: "Información de entrega",
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
    id: "portabilidad-proceso",
    title: "Proceso de portabilidad",
    content: (ctx) =>
      [
        `${nombre(ctx)}, te explico cómo funciona el proceso de portabilidad.`,
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
      ].join("\n"),
  },
  {
    id: "codigo-cap",
    title: "Código CAP",
    when: (ctx) => ctx.requiresCapCode,
    content: (ctx) =>
      [
        `${nombre(ctx)}, te envié un SMS al número prepago a portar con el código CAP de 4 dígitos.`,
        "",
        "¿Puedes confirmar si lo recibiste? Es necesario para ejecutar la portabilidad.",
      ].join("\n"),
    branch: () => ({
      yesSpeech: [
        "Perfecto, ya completamos el código.",
        "",
        "El código tiene una vigencia de 5 días. Si en ese plazo no se concreta la portabilidad, te enviaremos un nuevo CAP por SMS.",
      ].join("\n"),
      noSpeech: [
        "El código tiene una vigencia de 5 días. Te contactaremos para solicitártelo.",
        "",
        "Si en ese plazo no se concreta la portabilidad, te enviaremos un nuevo CAP por SMS.",
      ].join("\n"),
    }),
  },
  {
    id: "dudas-portabilidad",
    title: "Resolver dudas del proceso",
    content: () => "¿Tienes alguna duda con el proceso de portabilidad?",
    branch: (ctx) => ({
      yesSpeech: `Con gusto te aclaro ${nombre(ctx)}. Cuéntame qué parte del proceso te genera dudas.`,
    }),
  },
  {
    id: "chip-regalo",
    title: "Chip prepago de regalo",
    content: (ctx) =>
      [
        `${nombre(ctx)}, te regalamos un chip prepago que puedes usar o regalar.`,
        "",
        "Viene con gigas y minutos que se activan al insertarlo. El empaque indica los beneficios y la forma de activación. Lo enviaremos junto con tus productos.",
      ].join("\n"),
  },
  {
    id: "encuesta",
    title: "Encuesta",
    content: (ctx) =>
      [
        `${nombre(ctx)}, ¿qué te pareció mi atención?`,
        "",
        "Una vez que recibas tu producto, te llegará una encuesta de satisfacción a tu correo electrónico.",
        "",
        'La encuesta va del 0 al 10, donde 0 es la nota mínima y 10 la máxima. La primera pregunta — "¿Qué tan probable es que recomiendes WOM a un familiar o amigo?" — evalúa mi atención como ejecutivo.',
        "",
        "Muchas gracias por responder.",
      ].join("\n"),
  },
  {
    id: "aceptacion-vdi",
    title: "Aceptación + VDI",
    content: (ctx) =>
      [
        `${nombre(ctx)}, ¿te queda alguna duda con las condiciones entregadas?`,
        "",
        "Entiendes y, en conjunto con iniciar el proceso de Validación de Identidad, aceptas las condiciones de este contrato.",
        "",
        "¿Lo aceptas?",
      ].join("\n"),
    branch: () => ({
      noSpeech:
        "Entiendo tu consulta. ¿Confirmas que deseas aceptar las condiciones del contrato para continuar con la validación de identidad?",
    }),
  },
  {
    id: "prefijo-809",
    title: "Prefijo 809",
    content: (ctx) =>
      `${nombre(ctx)}, según la normativa de la Subsecretaría de Telecomunicaciones, ¿te gustaría dejar de recibir llamadas spam o no deseadas bajo el prefijo 809?`,
    branch: () => ({
      yesSpeech: [
        "Perfecto. Procederemos a deshabilitar gratis el prefijo 809 para que dejes de recibir llamadas sin tu consentimiento.",
        "",
        "Haremos la deshabilitación una vez que tu línea esté activa con nosotros.",
      ].join("\n"),
      noSpeech:
        "Al deshabilitar el prefijo 809 evitarás recibir llamadas molestas que no solicitaste. Es una buena opción para controlar tus registros de llamadas.",
      followUp: {
        prompt: "¿Te interesa deshabilitarlo?",
        yesSpeech: [
          "Perfecto. Procederemos a deshabilitar gratis el prefijo 809 para que dejes de recibir llamadas sin tu consentimiento.",
          "",
          "Haremos la deshabilitación una vez que tu línea esté activa con nosotros.",
        ].join("\n"),
        noSpeech:
          "Entiendo. Si más adelante lo deseas, puedes autogestionarlo por la App WOM.",
      },
    }),
  },
  {
    id: "referido",
    title: "Referido",
    content: (ctx) =>
      [
        `${nombre(ctx)}, ¿conoces a alguien que quiera acceder a los beneficios de WOM?`,
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

export function buildPortabilidadSinEquipoFlow(ctx: ScriptBuildContext): SalesScriptStep[] {
  return CONVERSATION_MOMENTS.filter((step) => !step.when || step.when(ctx)).map((step) => ({
    id: step.id,
    title: step.title,
    content: step.content(ctx),
    branch: step.branch?.(ctx),
  }));
}
