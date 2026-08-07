/**
 * Bloque 6 — Discurso de despacho Línea Nueva sin equipo ✅ CONGELADO v1.0
 *
 * Arquitectura modular — sin reutilizar buildBlock5DeliverySpeech (Portabilidad).
 * Reutiliza solo formateadores compartidos idénticos.
 */

import {
  formatContactPhones,
  formatHomeDeliveryAddress,
} from "@/lib/sales-script/teleprompter/block5-delivery-speech";
import type { LineaNuevaDeliverySpeechInput } from "./linea-nueva-delivery-types";
import {
  isLineaNuevaIdCardCarrier,
  isLineaNuevaNomadCarrier,
} from "./linea-nueva-delivery-types";

/** Tramo común domicilio — raw `[14]` (sin instrucciones internas). */
export function buildLineaNuevaHomeDeliveryHeader(input: LineaNuevaDeliverySpeechInput): string {
  const address = formatHomeDeliveryAddress(input.region, input.comuna, input.direccion);
  const phones = formatContactPhones(input.contactPhones);

  return `Tu producto será despachado a la dirección ${address}, y tus números de contactos son: ${phones}, registrando la entrega de tus productos para el día ${input.fechaEntrega}.`;
}

/** Aviso correo "Tu Compra va en Camino" — idéntico Portabilidad / raw `[14]`. */
export function buildLineaNuevaHomeDeliveryEmailNotice(): string {
  return 'Te enviaremos un correo con el asunto "Tu Compra va en Camino" una vez que iniciemos el despacho de tus productos.';
}

/** ALAS / SROUTE / CHILEPARCEL — raw `[16]`. */
export function buildLineaNuevaIdCardCarrierReceiverSpeech(): string {
  return "Tú como titular podrás recibir el producto con tu cédula de identidad. Si tú no puedes recibirlo, lo puede hacer un tercero autorizado por ti mostrando su cédula de identidad.";
}

/** NOMAD — OTP WhatsApp — raw `[17]`. */
export function buildLineaNuevaNomadOtpSpeech(): string {
  return "Tú como titular podrás recibir el producto, te enviaremos un código OTP vía WHATSAPP a tu número de contacto, este código se lo debes entregar al repartidor para poder hacer la entrega efectiva. Si tú no puedes recibirlo, lo puede hacer un tercero autorizado por ti siempre y cuando le puedas compartir el código OTP que recibiste para que se lo pueda entregar al repartidor.";
}

export function buildLineaNuevaHomeDeliveryCarrierSpeech(
  input: LineaNuevaDeliverySpeechInput,
): string {
  if (isLineaNuevaNomadCarrier(input.carrier)) {
    return buildLineaNuevaNomadOtpSpeech();
  }
  if (isLineaNuevaIdCardCarrier(input.carrier)) {
    return buildLineaNuevaIdCardCarrierReceiverSpeech();
  }
  throw new Error(
    `Carrier de despacho no soportado para Línea Nueva: "${input.carrier ?? "sin carrier"}".`,
  );
}

/** Retiro en tienda — raw `[18]` (código por correo, sin SMS). */
export function buildLineaNuevaStorePickupSpeech(input: LineaNuevaDeliverySpeechInput): string {
  return [
    `Tu producto será despachado a nuestra sucursal ${input.pickupStoreName} ubicada en ${input.pickupStoreAddress} y podrás retirar tus productos en el horario de ${input.pickupStoreSchedule}, registrando la entrega de tus productos para el día ${input.fechaEntrega}.`,
    "",
    'Te enviaremos un correo con el asunto "Listo para tu retiro" y te deberás acercar a la sucursal Wom a retirar tu producto directamente mostrando el correo recibido con el código de verificación de 6 dígitos, a partir de este momento deberás acercarte a la sucursal Wom a retirar tu producto. Desde la recepción de este correo podrás realizar el retiro de tus productos hasta un plazo de 7 días continuos. Si tú no puedes retirar tu producto puedes entregar el código de verificación a un tercero para que realice el retiro por ti. El código es válido solo por una vez, por lo tanto si lo entregas es bajo tu responsabilidad.',
  ].join("\n");
}

/** Orquestador Bloque 6 — despacho domicilio o tienda. */
export function buildLineaNuevaDeliverySpeech(input: LineaNuevaDeliverySpeechInput): string {
  if (input.deliveryIsHome) {
    return [
      buildLineaNuevaHomeDeliveryHeader(input),
      buildLineaNuevaHomeDeliveryEmailNotice(),
      buildLineaNuevaHomeDeliveryCarrierSpeech(input),
    ].join("\n\n");
  }

  if (input.deliveryIsStore) {
    return buildLineaNuevaStorePickupSpeech(input);
  }

  throw new Error("Tipo de entrega no definido para generar el Bloque 6 de despacho.");
}
