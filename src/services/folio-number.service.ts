import "server-only";
import { isValidFolioNumberFormat } from "@/lib/folio-number";
import { getFolioNumberRepository } from "@/repositories/folio-number.repository";

/** Devuelve el mensaje de error a mostrar, o null si el folio es válido. */
export async function validateFolioNumberForSale(
  folioNumber: string | undefined,
): Promise<string | null> {
  const value = (folioNumber ?? "").trim();
  if (!value) {
    return "El número de folio es obligatorio para ventas y Operación Duo.";
  }
  if (!isValidFolioNumberFormat(value)) {
    return "El número de folio solo puede contener números.";
  }
  const taken = await getFolioNumberRepository().exists(value);
  if (taken) {
    return "Ese número de folio ya fue usado en otra venta. Verifícalo e intenta de nuevo.";
  }
  return null;
}
