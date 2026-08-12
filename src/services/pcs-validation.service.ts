import "server-only";
import * as XLSX from "xlsx";
import { getPcsValidationRepository } from "@/repositories/pcs-validation.repository";
import {
  normalizeAndDedupePcsRows,
  PCS_VALIDATION_TEMPLATE_SHEET,
  type PcsValidationInputRow,
} from "@/lib/pcs-validation";
import type { PcsValidationJobDetail } from "@/types/pcs-validation";

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const pcsValidationService = {
  /** Preview de subida — normaliza/de-duplica sin crear ningún job todavía. */
  preview(rows: PcsValidationInputRow[]) {
    const normalized = normalizeAndDedupePcsRows(rows);
    return {
      total: normalized.length,
      preview: normalized.slice(0, 5).map((r) => ({ pcs: r.pcsOriginal, nombre: r.nombre })),
    };
  },

  async createValidationJob(
    userId: string,
    rows: PcsValidationInputRow[],
  ): Promise<{ jobId: string }> {
    const repo = getPcsValidationRepository();
    const normalized = normalizeAndDedupePcsRows(rows);
    if (normalized.length === 0) {
      throw new Error("No hay números para validar en el archivo.");
    }
    if (await repo.hasActiveJob(userId)) {
      throw new Error("Ya tienes una validación en curso. Espera a que termine antes de iniciar otra.");
    }

    const jobId = newId("pcsjob");
    await repo.createJob({ id: jobId, userId, total: normalized.length });

    const { enqueuePcsValidationJob } = await import("@/server/queue/pcs-validation-queue");
    const queued = await enqueuePcsValidationJob({
      jobId,
      rows: normalized.map((r) => ({ digits: r.digits, pcsOriginal: r.pcsOriginal, nombre: r.nombre, valido: r.valido })),
    });

    if (!queued) {
      // Sin Redis configurado: no hay forma de procesar el job en segundo plano.
      await repo.markError(jobId, "Cola de procesamiento no disponible. Contacta a soporte.");
    }

    return { jobId };
  },

  async getJobDetail(jobId: string): Promise<PcsValidationJobDetail> {
    const repo = getPcsValidationRepository();
    const job = await repo.getJob(jobId);
    if (!job) throw new Error("Validación no encontrada.");
    const resultados = await repo.getResults(jobId);
    return {
      status: job.status,
      progreso: { total: job.total, procesados: job.procesados },
      resultados,
      error: job.error,
    };
  },

  async buildResultsWorkbookBuffer(jobId: string): Promise<Buffer> {
    const repo = getPcsValidationRepository();
    const job = await repo.getJob(jobId);
    if (!job) throw new Error("Validación no encontrada.");
    const resultados = await repo.getResults(jobId);
    const validos = resultados.filter((r) => r.estado === "valido");

    const sheet = XLSX.utils.aoa_to_sheet([
      ["PCS", "Nombre"],
      ...validos.map((r) => [r.pcs, r.nombre ?? ""]),
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, PCS_VALIDATION_TEMPLATE_SHEET);
    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  },
};
