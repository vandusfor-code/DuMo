/** Sucursal WOM para retiro en tienda — fuente configurable (no embebida en el discurso). */
export type WomPickupStore = {
  id: string;
  name: string;
  address: string;
  schedule: string;
};

/**
 * Configuración de entrega para el teleprompter.
 * Se carga vía `getDeliveryConfigurationRepository().getConfig()`;
 * el constructor del discurso (`block5-delivery-speech.ts`) solo recibe strings resueltos.
 */
export type DeliveryTeleprompterConfig = {
  pickupStores: WomPickupStore[];
  defaultPickupStoreId: string | null;
};

export function resolvePickupStore(
  config: DeliveryTeleprompterConfig,
  storeId?: string | null,
): WomPickupStore | null {
  if (storeId) {
    return config.pickupStores.find((store) => store.id === storeId) ?? null;
  }
  if (config.defaultPickupStoreId) {
    return (
      config.pickupStores.find((store) => store.id === config.defaultPickupStoreId) ?? null
    );
  }
  return config.pickupStores[0] ?? null;
}
