import "server-only";
import { Worker } from "bullmq";
import { getRedisConnection, isQueueEnabled } from "@/server/queue/redis";
import {
  PCS_VALIDATION_QUEUE_NAME,
  type PcsValidationJobData,
  type PcsValidationJobRow,
} from "@/server/queue/pcs-validation-jobs";
import { getPcsValidationRepository } from "@/repositories/pcs-validation.repository";
import { webQrRepository } from "@/repositories/web-qr.repository";
import type { PcsValidationEstado } from "@/types/pcs-validation";

const BATCH_SIZE = 25;
const BATCH_PAUSE_MS = 1500;
const DISCONNECTED_MESSAGE = "No se pudo validar: sesión de WhatsApp desconectada.";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function newId(): string {
  return `pcsres-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function processJob(data: PcsValidationJobData): Promise<void> {
  const { jobId, rows } = data;
  const repo = getPcsValidationRepository();
  const { emitPcsValidationProgress, emitPcsValidationDone } = await import(
    "@/server/realtime/emit"
  );

  await repo.markProcessing(jobId);

  const channel = await webQrRepository.findWebQrChannelForRouting(null);
  if (!channel || channel.status !== "CONNECTED") {
    await repo.markError(jobId, DISCONNECTED_MESSAGE);
    emitPcsValidationDone(jobId, "error", DISCONNECTED_MESSAGE);
    return;
  }

  const invalidRows = rows.filter((r) => !r.valido);
  const validRows = rows.filter((r) => r.valido);

  if (invalidRows.length > 0) {
    await insertBatch(jobId, invalidRows, () => "invalido");
    await repo.incrementProcesados(jobId, invalidRows.length);
    const job = await repo.getJob(jobId);
    if (job) emitPcsValidationProgress(jobId, job.procesados, job.total);
  }

  const { bridgeCheckNumbers } = await import("@/server/web-qr/bridge-client");

  for (const batch of chunk(validRows, BATCH_SIZE)) {
    try {
      const results = await bridgeCheckNumbers({
        channelId: channel.id,
        numeros: batch.map((r) => r.digits),
      });
      const existsByDigits = new Map(results.map((r) => [r.pcs, r.exists]));
      await insertBatch(jobId, batch, (row) =>
        existsByDigits.get(row.digits) ? "valido" : "no_valido",
      );
    } catch (err) {
      console.error("[pcs-validation-worker] lote falló, se aborta el job", jobId, err);
      await repo.markError(jobId, DISCONNECTED_MESSAGE);
      emitPcsValidationDone(jobId, "error", DISCONNECTED_MESSAGE);
      return;
    }

    await repo.incrementProcesados(jobId, batch.length);
    const job = await repo.getJob(jobId);
    if (job) emitPcsValidationProgress(jobId, job.procesados, job.total);

    await sleep(BATCH_PAUSE_MS);
  }

  await repo.markDone(jobId);
  emitPcsValidationDone(jobId, "done");
}

async function insertBatch(
  jobId: string,
  rows: PcsValidationJobRow[],
  estadoFor: (row: PcsValidationJobRow) => PcsValidationEstado,
): Promise<void> {
  const repo = getPcsValidationRepository();
  await repo.insertResults(
    jobId,
    rows.map((r) => ({
      id: newId(),
      pcs: r.pcsOriginal,
      nombre: r.nombre,
      estado: estadoFor(r),
    })),
  );
}

let worker: Worker<PcsValidationJobData> | null = null;
let started = false;

/** Concurrencia 1 a propósito: una sola sesión de Baileys compartida por todos los jobs. */
export function ensurePcsValidationWorker(): void {
  if (started || !isQueueEnabled()) return;
  const connection = getRedisConnection();
  if (!connection) return;

  started = true;
  worker = new Worker<PcsValidationJobData>(
    PCS_VALIDATION_QUEUE_NAME,
    async (job) => {
      await processJob(job.data);
    },
    { connection, concurrency: 1 },
  );

  worker.on("failed", async (job, err) => {
    console.error("[pcs-validation-worker] job failed", job?.id, err);
    if (job?.data?.jobId) {
      try {
        const repo = getPcsValidationRepository();
        await repo.markError(job.data.jobId, "No se pudo completar la validación.");
        const { emitPcsValidationDone } = await import("@/server/realtime/emit");
        emitPcsValidationDone(job.data.jobId, "error", "No se pudo completar la validación.");
      } catch (markErr) {
        console.error("[pcs-validation-worker] no se pudo marcar error", markErr);
      }
    }
  });

  worker.on("error", (err) => {
    console.error("[pcs-validation-worker] error", err);
  });

  console.log("[pcs-validation-worker] BullMQ consumer started (concurrency=1)");
}

export async function closePcsValidationWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
  started = false;
}
