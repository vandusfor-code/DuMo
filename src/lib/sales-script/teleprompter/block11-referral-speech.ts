/**
 * Bloque 11 — Referido.
 * Fuente: portabilidad-sin-equipo.raw.txt (línea 76).
 */

import type { SalesScriptBranch } from "@/types/sales-script";

export type Block11ReferralSpeechInput = {
  clientFirstName: string;
};

const REFERRAL_ADVISOR_NOTE = "Solicita nombre y teléfono del referido.";

export function buildBlock11ReferralSpeech(input: Block11ReferralSpeechInput): {
  content: string;
  branch: SalesScriptBranch;
} {
  return {
    content: `${input.clientFirstName}, me gustaría saber si conoces a alguien que quiera acceder a todos los beneficios de WOM.`,
    branch: {
      referral: {
        advisorNote: REFERRAL_ADVISOR_NOTE,
      },
    },
  };
}
