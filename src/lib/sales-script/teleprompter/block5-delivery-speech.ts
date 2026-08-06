/**
 * Bloque 5 — Condiciones generales y entrega.
 * Fuente: portabilidad-sin-equipo.raw.txt (líneas 22–36).
 */

/** Tramo Ultra Express — solo cuando la gestión indique despacho NOMAD 3h. */
const ULTRA_EXPRESS_OTP_ADDENDUM =
  "Si tu entrega es con despacho Ultra Express (NOMAD 3 horas), el titular o un tercero pueden recibir el producto entregando el código OTP al repartidor enviado solo al whatsapp.";

export type Block5DeliverySpeechInput = {
  deliveryIsHome: boolean;
  deliveryIsStore: boolean;
  /** Teléfonos de contacto — hoy uno; extensible cuando el CRM agregue un segundo. */
  contactPhones: string[];
  region: string;
  comuna: string;
  direccion: string;
  fechaEntrega: string;
  pickupStoreName: string;
  pickupStoreAddress: string;
  pickupStoreSchedule: string;
  /** Despacho Ultra Express (NOMAD 3h) — false hasta que exista el dato en gestión. */
  isUltraExpressDelivery: boolean;
};

function formatHomeDeliveryAddress(region: string, comuna: string, direccion: string): string {
  return [region, comuna, direccion].filter(Boolean).join(", ");
}

function formatContactPhones(phones: string[]): string {
  return phones.filter(Boolean).join(", ");
}

function buildGeneralConditionsSpeech(): string {
  return [
    "Te enviaremos un mail de bienvenida al correo que nos proporcionaste; es muy importante que lo revises, ya que contiene información relevante sobre tu plan contratado y tu ciclo de facturación.",
    "",
    "Además, te invitamos a visitar wom.cl o ingresar a nuestra APP WOM para conocer todos los detalles sobre el uso y condiciones de tus beneficios libres o controlados, como minutos, SMS, apps libres ya mencionadas y el servicio de roaming internacional vía WhatsApp en más de 100 países.",
    "",
    "Recuerda que a través de la App también podrás realizar el seguimiento de tu despacho en tiempo real.",
  ].join("\n");
}

function buildHomeOtpParagraph(isUltraExpress: boolean): string {
  const base =
    "Recuerda que tú como titular del servicio puedes recibir el producto, ya que al momento de la entrega debes firmar la solicitud de la portabilidad. Si recibes tu como titular lo puedes hacer con el código OTP o con tu cédula de identidad, si recibe un tercero debe presentar si o si el código OTP que te enviaremos por Whatsapp (RAYO) o SMS (ALAS/SROUTE).";
  if (!isUltraExpress) return base;
  return `${base} ${ULTRA_EXPRESS_OTP_ADDENDUM}`;
}

function buildHomeDeliverySpeech(input: Block5DeliverySpeechInput): string {
  const address = formatHomeDeliveryAddress(input.region, input.comuna, input.direccion);
  const phones = formatContactPhones(input.contactPhones);

  return [
    `Tu producto será despachado a la dirección ${address}, y tus números de contacto son: ${phones}, registrando la entrega de tus productos para el día ${input.fechaEntrega}.`,
    "",
    'Te enviaremos un correo con el asunto "Tu Compra va en Camino" una vez que iniciemos el despacho de tus productos.',
    "",
    buildHomeOtpParagraph(input.isUltraExpressDelivery),
  ].join("\n");
}

function buildStorePickupSpeech(input: Block5DeliverySpeechInput): string {
  return [
    `Tu producto será despachado a nuestra sucursal ${input.pickupStoreName} ubicada en ${input.pickupStoreAddress} y podrás retirar tus productos en el horario de ${input.pickupStoreSchedule}, registrando la entrega de tus productos para el día ${input.fechaEntrega}.`,
    "",
    'Te enviaremos un correo con el asunto "Listo para tu retiro" y adicionalmente un SMS a tu número a portar con un código de verificación de 6 dígitos, a partir de este momento deberás acercarte a la sucursal Wom a retirar tu producto directamente mostrando el código de verificación de 6 dígitos, desde la recepción de este correo podrás realizar el retiro de tus productos hasta un plazo de 7 días continuos. Si tú no puedes retirar tu producto puedes entregar el código de verificación a un tercero para que realice el retiro por ti. El código es válido solo por una vez, por lo tanto si lo entregas es bajo tu responsabilidad.',
  ].join("\n");
}

function buildPostDeliveryClosingSpeech(): string {
  return [
    "Te recuerdo que puedes revisar la compatibilidad de tu equipo en nuestra web https://www.wom.cl/sello-multibandas/",
    "",
    'Una vez que recibas tus productos te enviaremos un correo llamado "Bienvenido a Wom" con documentos adjuntos como los contratos de servicios, anexos y detalle de líneas, en el cual podrás identificar tu número asociado a la simcard enviada.',
  ].join("\n");
}

export function buildBlock5DeliverySpeech(input: Block5DeliverySpeechInput): string {
  const parts = [buildGeneralConditionsSpeech()];

  if (input.deliveryIsHome) {
    parts.push(buildHomeDeliverySpeech(input));
  } else if (input.deliveryIsStore) {
    parts.push(buildStorePickupSpeech(input));
  }

  parts.push(buildPostDeliveryClosingSpeech());

  return parts.join("\n\n");
}
