/**
 * Bloque 7 — Chip prepago de regalo.
 * Fuente: portabilidad-sin-equipo.raw.txt (línea 54).
 */

export type Block7GiftSpeechInput = {
  clientFirstName: string;
};

export function buildBlock7GiftSpeech(input: Block7GiftSpeechInput): string {
  return `${input.clientFirstName}, te regalamos un chip prepago que si lo prefieres podrás usar o regalar a un familiar o amigo. Este chip viene con beneficios como gigas y minutos que podrán disfrutar con solo activar el chip. El empaque del chip te indicará los beneficios y la forma de activarlo y te lo enviaremos con el resto de tus productos.`;
}
