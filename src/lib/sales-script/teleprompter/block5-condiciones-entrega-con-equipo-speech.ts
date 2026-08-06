/**
 * Bloque 5 — Condiciones generales y entrega (Portabilidad con Equipo) ✅ Aprobado v1.0 (congelado).
 * Fuente: portabilidad-con-equipo.raw.txt (líneas 23–39).
 * No modificar copy salvo cambio del script oficial o hallazgo de auditoría.
 */

import type { ScriptBuildContext } from "@/lib/sales-script/context";

type Block5ConEquipoDeliveryInput = {
  deliveryIsHome: boolean;
  deliveryIsStore: boolean;
  contactPhones: string[];
  region: string;
  comuna: string;
  direccion: string;
  fechaEntrega: string;
  pickupStoreName: string;
  pickupStoreAddress: string;
  pickupStoreSchedule: string;
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

function buildHomeOtpParagraph(): string {
  return "Recuerda que tú como titular del servicio puedes recibir el producto, ya que al momento de la entrega debes firmar la solicitud de la portabilidad. Si recibes el producto como titular, lo puedes hacer con el código OTP o con tu cédula de identidad, si recibe un tercero debe presentar si o si el código OTP que te enviaremos por WhatsApp (RAYO) o SMS (ALAS/SROUTE).";
}

function buildHomeDeliverySpeech(input: Block5ConEquipoDeliveryInput): string {
  const address = formatHomeDeliveryAddress(input.region, input.comuna, input.direccion);
  const phones = formatContactPhones(input.contactPhones);

  return [
    `Tu producto será despachado a la dirección ${address}, y tus números de contacto son: ${phones}, registrando la entrega de tus productos para el día ${input.fechaEntrega}.`,
    "",
    'Te enviaremos un correo con el asunto "Tu Compra va en Camino" una vez que iniciemos el despacho de tus productos.',
    "",
    buildHomeOtpParagraph(),
  ].join("\n");
}

function buildStorePickupSpeech(input: Block5ConEquipoDeliveryInput): string {
  return [
    `Tu producto será despachado a nuestra sucursal ${input.pickupStoreName} ubicada en ${input.pickupStoreAddress} y podrás retirar tus productos en el horario de ${input.pickupStoreSchedule}, registrando la entrega de tus productos para el día ${input.fechaEntrega}.`,
    "",
    'Te enviaremos un correo con el asunto "Listo para tu retiro" y adicionalmente un SMS a tu número a portar con un código de verificación de 6 dígitos, a partir de este momento deberás acercarte a la sucursal Wom a retirar tu producto directamente mostrando el código de verificación de 6 dígitos, desde la recepción de este correo podrás realizar el retiro de tus productos hasta un plazo de 7 días continuos. Si tú no puedes retirar tu producto puedes entregar el código de verificación a un tercero para que realice el retiro por ti. El código es válido solo por una vez, por lo tanto si lo entregas es bajo tu responsabilidad.',
  ].join("\n");
}

function buildEquipmentWarrantySpeech(): string {
  return "Dentro del link de pago encontrarás una guía con todas las garantías que tiene tu equipo, léela antes de recibir tus productos.";
}

function buildContractsAnnexesSpeech(): string {
  return 'Una vez que recibas tus productos te enviaremos un correo llamado "Bienvenido a Wom" con documentos adjuntos como los contratos de servicios, anexos y detalle de líneas, en el cual podrás identificar tu número asociado a la simcard enviada.';
}

/** Bloque 5 — Condiciones generales y entrega ✅ Aprobado v1.0 (congelado). */
export function buildBlock5CondicionesEntregaConEquipoSpeech(ctx: ScriptBuildContext): string {
  if (!ctx.mainEquipment) {
    throw new Error(
      "No hay datos de equipo en el contexto. Verifica la gestión antes de generar el Bloque 5 de Portabilidad con Equipo.",
    );
  }

  const deliveryInput: Block5ConEquipoDeliveryInput = {
    deliveryIsHome: ctx.deliveryIsHome,
    deliveryIsStore: ctx.deliveryIsStore,
    contactPhones: ctx.contactPhones,
    region: ctx.vars.region ?? "",
    comuna: ctx.vars.comuna ?? "",
    direccion: ctx.vars.direccion ?? "",
    fechaEntrega: ctx.vars.fecha_entrega ?? "",
    pickupStoreName: ctx.vars.nombre_sucursal ?? "",
    pickupStoreAddress: ctx.vars.direccion_sucursal ?? "",
    pickupStoreSchedule: ctx.vars.horario_sucursal ?? "",
  };

  const parts = [buildGeneralConditionsSpeech()];

  if (deliveryInput.deliveryIsHome) {
    parts.push(buildHomeDeliverySpeech(deliveryInput));
  } else if (deliveryInput.deliveryIsStore) {
    parts.push(buildStorePickupSpeech(deliveryInput));
  }

  if (Number(ctx.mainEquipment.downPayment) > 0) {
    parts.push(buildEquipmentWarrantySpeech());
  }

  parts.push(buildContractsAnnexesSpeech());

  return parts.join("\n\n");
}
