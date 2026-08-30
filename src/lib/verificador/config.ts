/** URL del CRM DuMo para el botón «Volver a DuMo». Configurable vía env. */
export const DUMO_URL = process.env.NEXT_PUBLIC_DUMO_URL?.trim() || "";

export const MAX_NUMBERS = 1000;

export const SUBTEL_INDEX_PATH = "/verificador/subtel-index.json";

export const PLANTILLA_PATH = "/verificador/plantilla_verificador_numeracion_dumo.csv";

export const RESULT_FILENAME = "resultado_numeracion.csv";
