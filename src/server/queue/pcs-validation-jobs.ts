import "server-only";

export type PcsValidationJobRow = {
  digits: string;
  pcsOriginal: string;
  nombre: string | null;
  valido: boolean;
};

export type PcsValidationJobData = {
  jobId: string;
  rows: PcsValidationJobRow[];
};

export const PCS_VALIDATION_QUEUE_NAME = "pcs-validation";
