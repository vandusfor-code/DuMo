/**
 * Bloque 3 — Párrafo de financiamiento de equipo (Portabilidad con Equipo) ✅ Aprobado v1.0 (congelado).
 * Fuente: portabilidad-con-equipo.raw.txt (línea 14).
 * No modificar copy salvo cambio del script oficial o hallazgo de auditoría.
 */

import type { ScriptEquipmentLine } from "@/lib/sales-script/context";
import { formatCurrency } from "@/lib/format";

function formatEquipmentCommercialName(equipment: ScriptEquipmentLine): string {
  const name = `${equipment.brand} ${equipment.model}`.trim();
  const color = equipment.color.trim();
  if (color) return `${name}, color ${color}`;
  return name;
}

export function buildBlock3EquipmentFinancingSpeech(equipment: ScriptEquipmentLine): string {
  const equipmentName = formatEquipmentCommercialName(equipment);
  const installmentValue = formatCurrency(Number(equipment.installmentValue));
  const installmentsCount = equipment.installments.trim();
  const downPaymentAmount = Number(equipment.downPayment);
  const nameToModalidad = equipment.color.trim() ? ", " : " ";
  const financingIntro = `Adicionalmente llevarás el equipo ${equipmentName}${nameToModalidad}con modalidad de compra en cuotas`;

  if (downPaymentAmount > 0) {
    const downPayment = formatCurrency(downPaymentAmount);
    return [
      `${financingIntro}, donde tu pago inicial es de ${downPayment} y ${installmentsCount} cuotas fijas de ${installmentValue}.`,
      "Una vez aprobada tu venta, recibirás a tu correo un link para que puedas realizar el pago de tu equipo en máximo 24 horas y las distintas formas de pago que podrás utilizar.",
    ].join(" ");
  }

  const financingIntroZeroPie = financingIntro.replace(" en cuotas", " a cuotas");
  return `${financingIntroZeroPie}, sin pago inicial, financiado en ${installmentsCount} cuotas fijas de ${installmentValue}.`;
}
