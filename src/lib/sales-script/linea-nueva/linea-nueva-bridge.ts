/**
 * Puente de integración con el registro global de flujos.
 *
 * TODO (LINEA NUEVA):
 * Pendiente implementación desde el documento oficial
 * "SCRIPT DE CIERRE LÍNEA NUEVA SIN EQUIPO.docx"
 * No conectar hasta congelar v1.0 tras auditoría documental.
 */

import type { SalesScriptStep } from "@/types/sales-script";
import {
  LINEA_NUEVA_OFFICIAL_DOCUMENT_PENDING,
  LINEA_NUEVA_PENDING_MESSAGE,
  LineaNuevaEngineError,
  LINEA_NUEVA_SIN_EQUIPO_FLOW_KEY,
} from "./linea-nueva-engine";
import type { LineaNuevaEngineInput } from "./linea-nueva-types";

export { LINEA_NUEVA_SIN_EQUIPO_FLOW_KEY };

export function buildLineaNuevaSinEquipoSteps(
  _input: LineaNuevaEngineInput,
): SalesScriptStep[] {
  if (LINEA_NUEVA_OFFICIAL_DOCUMENT_PENDING) {
    throw new LineaNuevaEngineError(
      LINEA_NUEVA_PENDING_MESSAGE,
      "OFFICIAL_DOCUMENT_PENDING",
    );
  }
  return [];
}
