/** Textos de bienvenida al cliente (WhatsApp: *negrita*, saltos de línea reales). */

export function buildNewLeadWelcomeMessages(advisorName: string): [string, string] {
  const name = advisorName.trim();
  const first = (name.split(/\s+/)[0] || name).trim();
  const greeting = `Hola 👋 ¡Un gusto saludarte! Te saluda *${first}*, ejecutiva de *WOM* 💜📱.

Estoy aquí para ayudarte y contarte sobre nuestras opciones disponibles.`;
  const dataRequest = `Para validar la oferta disponible para ti 💜, por favor confírmame los siguientes datos:

Nombre:
Número de teléfono:
Compañía actual:`;
  return [greeting, dataRequest];
}
