/**
 * Bloque 6 — Despacho Línea Nueva sin equipo
 * Fuente: linea-nueva-sin-equipo.raw.txt [14]–[18]
 */

export type LineaNuevaDeliveryCarrier = "ALAS" | "SROUTE" | "CHILEPARCEL" | "NOMAD";

export const LINEA_NUEVA_ID_CARD_CARRIERS: readonly LineaNuevaDeliveryCarrier[] = [
  "ALAS",
  "SROUTE",
  "CHILEPARCEL",
] as const;

export type LineaNuevaDeliverySpeechInput = {
  deliveryIsHome: boolean;
  deliveryIsStore: boolean;
  region: string;
  comuna: string;
  direccion: string;
  contactPhones: string[];
  fechaEntrega: string;
  carrier: LineaNuevaDeliveryCarrier | null;
  pickupStoreName: string;
  pickupStoreAddress: string;
  pickupStoreSchedule: string;
};

export function isLineaNuevaIdCardCarrier(
  carrier: LineaNuevaDeliveryCarrier | null | undefined,
): carrier is LineaNuevaDeliveryCarrier {
  return carrier === "ALAS" || carrier === "SROUTE" || carrier === "CHILEPARCEL";
}

export function isLineaNuevaNomadCarrier(
  carrier: LineaNuevaDeliveryCarrier | null | undefined,
): carrier is "NOMAD" {
  return carrier === "NOMAD";
}

export function normalizeLineaNuevaDeliveryCarrier(
  value: string | null | undefined,
): LineaNuevaDeliveryCarrier | null {
  const normalized = value?.trim().toUpperCase();
  if (
    normalized === "ALAS" ||
    normalized === "SROUTE" ||
    normalized === "CHILEPARCEL" ||
    normalized === "NOMAD"
  ) {
    return normalized;
  }
  return null;
}
