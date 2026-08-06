/**
 * Teleprompter — 9 bloques de lectura continua.
 * Fuente: SPEC-teleprompter-portabilidad-sin-equipo.md + portabilidad-sin-equipo.raw.txt
 */

import type { ScriptBuildContext } from "@/lib/sales-script/context";
import { buildContractResumenSpeech } from "@/lib/sales-script/contract-resumen";
import {
  buildMultilineBenefitsSpeech,
  buildBenefitsSpeech,
} from "@/lib/sales-script/teleprompter/speech-builders";
import type { SalesScriptBranch, SalesScriptStep } from "@/types/sales-script";

function v(ctx: ScriptBuildContext, key: string): string {
  return ctx.vars[key] ?? "";
}

function n(ctx: ScriptBuildContext): string {
  return v(ctx, "cliente_primer_nombre") || v(ctx, "nombre_cliente");
}

function aclarar(ctx: ScriptBuildContext, tema: string): string {
  return `${n(ctx)}, con gusto te aclaro. Cuéntame qué parte ${tema} necesitas que te explique.`;
}

function buildBlock6Portabilidad(ctx: ScriptBuildContext): { content: string; branch?: SalesScriptBranch } {
  const parts = [
    `${n(ctx)}, te explico cómo funciona el proceso de portabilidad.`,
    "",
    "La portabilidad se realiza de lunes a sábado, sin incluir domingos ni festivos, se ejecuta en la madrugada con la finalidad de no interrumpir el servicio.",
    "",
    "Cuando recibas tu chip de WOM, NO lo debes colocar en tu celular, ya que como tu número aún no estará portado no tendrás servicio.",
    "",
    `No botes el chip de ${v(ctx, "operador_actual")} hasta tanto tu portabilidad con WOM no esté 100% realizada. Normalmente la portabilidad demora 1 día hábil en ejecutarse desde que recibas el chip de WOM.`,
    "",
    "Cuando recibas el chip de WOM, espera al día siguiente; debes quedar sin servicio en tu operador actual, eso significa que ya estás portado a WOM y es en ese momento que debes colocar el nuevo chip de WOM en tu celular y probar todos los servicios.",
    "",
    `Recuerda que no debes tener ningún tipo de deuda con ${v(ctx, "operador_actual")}; es importante que al momento de recibir tu chip WOM estés al día con tus pagos de boletas o Presta Lucás. Con deuda, no te puedes portar.`,
    "",
    "Mientras tu número no se porte a WOM activaremos el servicio con un número temporal, que es un número distinto al que estás portando. Este número será solo temporal hasta tanto podamos portar tu número real; lo importante es que mientras tu número no se porte no perderás el servicio con tu operador, por eso es importante que no cambies el chip hasta que estés portado.",
    "",
    "Tu primera boleta de cobro será emitida por un proporcional del servicio desde la activación hasta el corte de tu ciclo de facturación; si tu número no se porta igual se te cobrará el servicio activo con el número temporal.",
  ];

  if (ctx.requiresCapCode) {
    parts.push(
      "",
      `${n(ctx)}, te envié un SMS al número de teléfono prepago a portar con el código CAP que es un código de 4 dígitos. ¿Puedes validar si lo recibiste? Es necesario este código para poder ejecutar la portabilidad.`,
    );
  }

  parts.push("", `${n(ctx)}, ¿alguna duda con el proceso de portabilidad?`);

  const branch: SalesScriptBranch = {
    yesSpeech: aclarar(ctx, "del proceso de portabilidad"),
  };

  if (ctx.requiresCapCode) {
    branch.cap = {
      yesSpeech:
        "Ya completamos el código. De todas formas te comento que el mismo tiene una vigencia de 5 días y en caso que en este plazo no se haya concretado tu portabilidad, volveremos a enviarte un nuevo código CAP vía SMS para continuar con el proceso.",
      noSpeech:
        "El código tiene una vigencia de 5 días, por lo que te pido estar atento ya que te contactaremos para solicitarte este dato. En caso que en este plazo no se haya concretado tu portabilidad, volveremos a enviarte un nuevo código CAP vía SMS para continuar con el proceso.",
    };
  }

  return { content: parts.join("\n"), branch };
}

function buildBlock5CondicionesEntrega(ctx: ScriptBuildContext): string {
  const parts = [
    "Te enviaremos un mail de bienvenida al correo que nos proporcionaste; es muy importante que lo revises, ya que contiene información relevante sobre tu plan contratado y tu ciclo de facturación.",
    "",
    "Además, te invitamos a visitar wom.cl o ingresar a nuestra APP WOM para conocer todos los detalles sobre el uso y condiciones de tus beneficios libres o controlados, como minutos, SMS, apps libres ya mencionadas y el servicio de roaming internacional vía WhatsApp en más de 100 países.",
    "",
    "Recuerda que a través de la App también podrás realizar el seguimiento de tu despacho en tiempo real.",
  ];

  if (ctx.deliveryIsHome) {
    parts.push(
      "",
      `Tu producto será despachado a la dirección ${v(ctx, "region")}, ${v(ctx, "comuna")}, ${v(ctx, "direccion")}, y tus números de contacto son: ${v(ctx, "telefono")}, registrando la entrega de tus productos para el día ${v(ctx, "fecha_entrega")}.`,
      "",
      'Te enviaremos un correo con el asunto "Tu Compra va en Camino" una vez que iniciemos el despacho de tus productos.',
      "",
      "Recuerda que tú como titular del servicio puedes recibir el producto, ya que al momento de la entrega debes firmar la solicitud de la portabilidad. Si recibes tú como titular lo puedes hacer con el CÓDIGO OTP o con tu cédula de identidad; si recibe un tercero debe presentar sí o sí el CÓDIGO OTP que te enviaremos por WhatsApp o SMS.",
    );
  } else if (ctx.deliveryIsStore) {
    parts.push(
      "",
      `Tu producto será despachado a nuestra sucursal ${v(ctx, "nombre_sucursal")} ubicada en ${v(ctx, "direccion_sucursal")} y podrás retirar tus productos en el horario de ${v(ctx, "horario_sucursal")}, registrando la entrega de tus productos para el día ${v(ctx, "fecha_entrega")}.`,
      "",
      'Te enviaremos un correo con el asunto "Listo para tu retiro" y adicionalmente un SMS a tu número a portar con un código de verificación de 6 dígitos. Desde la recepción de este correo podrás realizar el retiro de tus productos hasta un plazo de 7 días continuos.',
      "",
      "Si tú no puedes retirar tu producto puedes entregar el código de verificación a un tercero para que realice el retiro por ti. El código es válido solo por una vez, por lo tanto si lo entregas es bajo tu responsabilidad.",
    );
  }

  parts.push(
    "",
    "Te recuerdo que puedes revisar la compatibilidad de tu equipo en nuestra web https://www.wom.cl/sello-multibandas/",
    "",
    'Una vez que recibas tus productos te enviaremos un correo llamado "Bienvenido a Wom" con documentos adjuntos como los contratos de servicios, anexos y detalle de líneas, en el cual podrás identificar tu número asociado a la simcard enviada.',
  );

  return parts.join("\n");
}

function buildBlock3Resumen(ctx: ScriptBuildContext): string {
  return buildContractResumenSpeech(ctx);
}

/** Genera los 9 bloques del teleprompter. */
export function buildTeleprompterBlocks(ctx: ScriptBuildContext): SalesScriptStep[] {
  const block6 = buildBlock6Portabilidad(ctx);
  const lineDetails = ctx.lineDetails ?? [];

  return [
    {
      id: "bloque-1",
      sectionLabel: "Inicio",
      content: [
        v(ctx, "saludo"),
        "",
        `Hablas con ${v(ctx, "nombre_ejecutivo")} de WOM.`,
        "",
        `¿Tengo el gusto de hablar con ${v(ctx, "nombre_cliente")}?`,
        "",
        v(ctx, "cliente_primer_nombre")
          ? `Perfecto ${v(ctx, "cliente_primer_nombre")}.`
          : "Perfecto.",
        "",
        "Para dar continuidad a lo anteriormente conversado, te informo que:",
      ].join("\n"),
    },
    {
      id: "bloque-2",
      sectionLabel: "Audio",
      content: [
        `${n(ctx)}, has tomado una gran decisión y como no contamos con letra chica a continuación escucharás una grabación que dura 30 segundos con las condiciones que respaldan tu contratación, por lo que te pido que escuches atentamente y no cortes ya que yo retomaré tu llamado para resolver tus dudas y realizar un breve resumen del producto que te llevas.`,
        "",
        "¿Tienes alguna duda con el audio que escuchaste?",
      ].join("\n"),
      branch: {
        yesSpeech: aclarar(ctx, "del audio que escuchaste"),
      },
    },
    {
      id: "bloque-3",
      sectionLabel: "Contratación",
      content: buildBlock3Resumen(ctx),
      branch: {
        noSpeech: [`Entiendo ${n(ctx)}.`, "", "¿Cuál dato necesitas corregir?"].join("\n"),
      },
    },
    {
      id: "bloque-4",
      sectionLabel: "Plan",
      content:
        lineDetails.length > 0
          ? buildMultilineBenefitsSpeech(v(ctx, "nombre_cliente"), lineDetails)
          : buildBenefitsSpeech(
              v(ctx, "nombre_cliente"),
              v(ctx, "plan"),
              v(ctx, "valor_plan"),
              ctx.planDetail,
            ),
    },
    {
      id: "bloque-5",
      sectionLabel: "Entrega",
      content: buildBlock5CondicionesEntrega(ctx),
    },
    {
      id: "bloque-6",
      sectionLabel: "Portabilidad",
      content: block6.content,
      branch: block6.branch,
    },
    {
      id: "bloque-7",
      sectionLabel: "Regalo",
      content: [
        `${n(ctx)}, te regalamos un chip prepago que si lo prefieres podrás usar o regalar a un familiar o amigo. Este chip viene con beneficios como gigas y minutos que podrán disfrutar con solo activar el chip. El empaque del chip te indicará los beneficios y la forma de activarlo y te lo enviaremos con el resto de tus productos.`,
        "",
        `${n(ctx)}, ¿qué te pareció mi atención?`,
        "",
        "Que bueno que te gustó; en base a eso te quiero invitar a que puedas responder una encuesta de satisfacción en base a la atención que te ofrecí como ejecutivo. Esta encuesta la vas a recibir en tu correo electrónico una vez que recibas tu producto.",
        "",
        'La encuesta tiene una escala de evaluación del 0 al 10, donde 0 es la nota mínima y 10 es la nota máxima, y la primera pregunta de la encuesta — "Pensando únicamente en la experiencia de tu compra, ¿qué tan probable es que recomiendes WOM a un familiar o un amigo?" — en esa pregunta me evalúas a mí y mi atención. De antemano muchas gracias por responder.',
      ].join("\n"),
    },
    {
      id: "bloque-8",
      sectionLabel: "Aceptación",
      content: [
        `${n(ctx)}, ¿te queda alguna duda con las condiciones entregadas?`,
        "",
        "Entiendes y en conjunto con iniciar ahora el proceso de Validación de identidad aceptas las condiciones de este contrato, ¿Lo aceptas?",
        "",
        `${n(ctx)}, en base a la normativa vigente de la subsecretaría de telecomunicaciones, ¿te gustaría dejar de recibir llamadas Spam o no deseadas?`,
      ].join("\n"),
      branch: {
        condicionesDudas: {
          yesSpeech: aclarar(ctx, "con las condiciones entregadas"),
        },
        acceptance: {
          noSpeech:
            "Entiendo tu consulta. ¿Confirmas que deseas aceptar las condiciones del contrato para continuar con la validación de identidad?",
        },
        prefijo809: {
          yesSpeech:
            "Perfecto, con esto procederemos a deshabilitar gratis el prefijo 809 para que dejes de recibir llamadas sin tu consentimiento. Haremos la deshabilitación una vez que tu línea esté activa con nosotros.",
          noSpeech:
            "Al deshabilitar el prefijo 809 evitarás recibir llamadas molestas que tú no solicitaste, es una buena opción para controlar tus registros de llamadas.",
          followUpPrompt: "¿Te interesa deshabilitarlo?",
          followUpYesSpeech:
            "Perfecto, con esto procederemos a deshabilitar gratis el prefijo 809 para que dejes de recibir llamadas sin tu consentimiento. Haremos la deshabilitación una vez que tu línea esté activa con nosotros.",
          followUpNoSpeech:
            "Entiendo; de igual forma, si más adelante lo deseas hacer, lo puedes autogestionar por la APP WOM.",
        },
      },
    },
    {
      id: "bloque-9",
      sectionLabel: "Cierre",
      content: [
        `${n(ctx)}, me gustaría saber si conoces a alguien que quiera acceder a todos los beneficios de WOM. ¿Me podrías compartir su nombre y teléfono?`,
        "",
        `Te invito a tomar nota de mi correo electrónico el cual es ${v(ctx, "correo_ejecutivo")}, quedando a tu disposición para cualquier consulta adicional que tengas y para el seguimiento de tu venta.`,
        "",
        `Te recuerdo que fuiste atendido por ${v(ctx, "nombre_ejecutivo")}.`,
        "",
        "Bienvenido a WOM, que tengas un excelente día!",
      ].join("\n"),
    },
  ];
}
