/** Textos de bienvenida al cliente (WhatsApp: *negrita*, saltos de línea reales). */

export function buildNewLeadWelcomeMessages(advisorName: string): [string, string] {
  const name = advisorName.trim();
  const first = (name.split(/\s+/)[0] || name).trim();
  const greeting = `¡Hola! 👋 Gracias por comunicarte con WOM 💜
Te saluda *${first}*, mucho gusto.

Tenemos 2 opciones para ti:`;
  const dataRequest = `📱 *PORTABILIDAD*:
RUT:
Número que deseas portar:
Compañía actual:

🔄 *RECAMBIO*:
RUT:
Número WOM:

Una vez recibamos tus datos, revisaremos tu evaluación y stock disponible para enviarte las opciones disponibles. 😊`;
  return [greeting, dataRequest];
}
