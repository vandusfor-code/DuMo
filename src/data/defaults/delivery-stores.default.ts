import type { DeliveryTeleprompterConfig } from "@/lib/sales-script/teleprompter/delivery-config";

/** Valores iniciales hasta cargar el listado oficial de sucursales WOM. */
export const DEFAULT_DELIVERY_TELEPROMPTER_CONFIG: DeliveryTeleprompterConfig = {
  defaultPickupStoreId: "wom-costanera",
  pickupStores: [
    {
      id: "wom-costanera",
      name: "WOM Store Costanera Center",
      address: "Av. Andrés Bello 2425, Providencia, Santiago",
      schedule: "Lunes a sábado de 10:00 a 20:00 hrs",
    },
  ],
};
