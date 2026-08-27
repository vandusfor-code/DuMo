export type PcsValidationJobStatus = "pending" | "processing" | "done" | "error";

export type PcsValidationEstado = "valido" | "no_valido" | "invalido" | "error";

export interface PcsValidationNumero {
  pcs: string;
  nombre: string | null;
}

export interface PcsValidationJob {
  id: string;
  userId: string;
  status: PcsValidationJobStatus;
  total: number;
  procesados: number;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
}

export interface PcsValidationResultRow {
  pcs: string;
  nombre: string | null;
  estado: PcsValidationEstado;
}

export interface PcsValidationJobDetail {
  status: PcsValidationJobStatus;
  progreso: { total: number; procesados: number };
  resultados: PcsValidationResultRow[];
  error: string | null;
}
