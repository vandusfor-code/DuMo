/**
 * Bloque 2 — Introducción + Audio transversal (todos los flujos comerciales DuMo).
 * Fuente aprobada: Portabilidad Sin Equipo v1.0 (congelado).
 */

import type { SalesScriptBranch } from "@/types/sales-script";

export type Block2AudioSpeech = {
  content: string;
  branch: SalesScriptBranch;
};

/** Bloque 2 — Introducción + Audio ✅ Aprobado v1.0 (congelado, transversal). */
export function buildBlock2AudioSpeech(): Block2AudioSpeech {
  const content = [
    "Has tomado una gran decisión y como no contamos con letra chica, a continuación escucharás una grabación que dura 30 segundos con las condiciones que respaldan tu contratación,",
    "",
    "por lo que te pido que escuches atentamente y no cortes, ya que yo retomaré tu llamado para resolver tus dudas y realizar un breve resumen del producto que te llevas.",
  ].join("\n");

  return {
    content,
    branch: {
      externalAudio: {
        postAudioQuestion: "¿Tienes alguna duda con el audio que escuchaste?",
        advisorNoteOnYes:
          "El cliente manifestó tener dudas sobre la grabación. Resuelve sus inquietudes y, cuando finalices, continúa con el resumen de la contratación.",
      },
    },
  };
}
