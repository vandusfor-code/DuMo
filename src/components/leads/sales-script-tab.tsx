"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, ScrollText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GeneratedSalesScript, SalesScriptStep } from "@/types/sales-script";

type BranchPhase = "idle" | "answered" | "cap-done" | "809-followup" | "809-done";

export function SalesScriptTab({
  script,
  unavailableReason,
  gestionSaved,
}: {
  script: GeneratedSalesScript | null | undefined;
  unavailableReason?: string | null;
  gestionSaved?: boolean;
}) {
  const [blockIndex, setBlockIndex] = useState(0);
  const [branchPhase, setBranchPhase] = useState<BranchPhase>("idle");
  const [choice, setChoice] = useState<"yes" | "no" | null>(null);
  const [followUpChoice, setFollowUpChoice] = useState<"yes" | "no" | null>(null);
  const [capChoice, setCapChoice] = useState<"yes" | "no" | null>(null);
  const [condicionesChoice, setCondicionesChoice] = useState<"yes" | "no" | null>(null);
  const [acceptanceChoice, setAcceptanceChoice] = useState<"yes" | "no" | null>(null);

  useEffect(() => {
    setBlockIndex(0);
    resetBranch();
  }, [script?.id]);

  useEffect(() => {
    resetBranch();
  }, [blockIndex]);

  function resetBranch() {
    setBranchPhase("idle");
    setChoice(null);
    setFollowUpChoice(null);
    setCapChoice(null);
    setCondicionesChoice(null);
    setAcceptanceChoice(null);
  }

  const blocks = script?.steps ?? [];
  const current = blocks[blockIndex];
  const progress = blocks.length > 0 ? ((blockIndex + 1) / blocks.length) * 100 : 0;

  const displayContent = useMemo(
    () =>
      current
        ? resolveContent(current, branchPhase, choice, followUpChoice, capChoice, condicionesChoice, acceptanceChoice)
        : "",
    [current, branchPhase, choice, followUpChoice, capChoice, condicionesChoice, acceptanceChoice],
  );

  const canContinue = current
    ? canAdvanceBlock(current, branchPhase, choice, followUpChoice, capChoice, condicionesChoice, acceptanceChoice)
    : false;

  if (!script) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-canvas/50 px-6 py-12 text-center">
        <ScrollText className="size-10 text-muted" />
        <p className="mt-3 text-[14px] font-medium text-ink">
          {gestionSaved ? "Script no generado" : "Script no disponible"}
        </p>
        <p className="mt-1 max-w-sm text-[13px] text-muted">
          {gestionSaved && unavailableReason
            ? unavailableReason
            : gestionSaved
              ? "La gestión se guardó, pero no se pudo generar el script con los datos ingresados."
              : "Guarda una gestión de venta de Portabilidad sin equipo para generar automáticamente el script de la llamada."}
        </p>
      </div>
    );
  }

  const sectionLabel = current?.sectionLabel ?? current?.title ?? "";
  const interaction = getInteractionMode(
    current,
    capChoice,
    condicionesChoice,
    acceptanceChoice,
    choice,
    followUpChoice,
  );

  const showCapButtons = interaction === "cap";
  const showDudasButtons = interaction === "dudas";
  const showCondicionesButtons = interaction === "condiciones-dudas";
  const showAcceptanceButtons = interaction === "acceptance";
  const show809Buttons = interaction === "809";
  const show809FollowUp = interaction === "809-followup";
  const showSimpleButtons = interaction === "binary";
  const showNav = interaction === "navigate";

  return (
    <div className="space-y-4">
      <AdvisorSummaryCard script={script} blockIndex={blockIndex} blocksCount={blocks.length} />

      <div className="rounded-2xl border border-line bg-card p-5">
        <div className="h-1 overflow-hidden rounded-full bg-canvas">
          <div
            className="h-full rounded-full bg-brand transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {sectionLabel ? (
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-widest text-muted">
            {sectionLabel}
          </p>
        ) : null}

        <div
          className="mt-3 select-none whitespace-pre-wrap text-[15px] leading-[1.75] text-ink"
          onCopy={(e) => e.preventDefault()}
        >
          {displayContent}
        </div>

        {showCapButtons ? (
          <BranchButtons
            onYes={() => {
              setCapChoice("yes");
              setBranchPhase("cap-done");
            }}
            onNo={() => {
              setCapChoice("no");
              setBranchPhase("cap-done");
            }}
          />
        ) : null}

        {showDudasButtons ? (
          <BranchButtons
            onYes={() => {
              setChoice("yes");
              setBranchPhase("answered");
            }}
            onNo={() => {
              setChoice("no");
              setBranchPhase("answered");
            }}
          />
        ) : null}

        {showCondicionesButtons ? (
          <BranchButtons
            onYes={() => {
              setCondicionesChoice("yes");
              setBranchPhase("answered");
            }}
            onNo={() => {
              setCondicionesChoice("no");
              setBranchPhase("answered");
            }}
          />
        ) : null}

        {showAcceptanceButtons ? (
          <BranchButtons
            onYes={() => {
              setAcceptanceChoice("yes");
              setBranchPhase("answered");
            }}
            onNo={() => {
              setAcceptanceChoice("no");
              setBranchPhase("answered");
            }}
          />
        ) : null}

        {showSimpleButtons || show809Buttons ? (
          <BranchButtons
            onYes={() => {
              setChoice("yes");
              setBranchPhase("answered");
            }}
            onNo={() => {
              setChoice("no");
              if (current?.branch?.prefijo809?.followUpPrompt) {
                setBranchPhase("809-followup");
              } else {
                setBranchPhase("answered");
              }
            }}
          />
        ) : null}

        {!showCapButtons &&
        !showDudasButtons &&
        !showCondicionesButtons &&
        !showAcceptanceButtons &&
        !showSimpleButtons &&
        !show809Buttons &&
        !show809FollowUp &&
        showNav ? (
          <div className="mt-6 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={blockIndex === 0}
              onClick={() => setBlockIndex((i) => Math.max(0, i - 1))}
            >
              <ChevronLeft className="size-4" />
              Anterior
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={blockIndex >= blocks.length - 1 || !canContinue}
              onClick={() => setBlockIndex((i) => Math.min(blocks.length - 1, i + 1))}
            >
              Continuar
              <ChevronRight className="size-4" />
            </Button>
          </div>
        ) : null}

        {show809FollowUp ? (
          <BranchButtons
            onYes={() => {
              setFollowUpChoice("yes");
              setBranchPhase("809-done");
            }}
            onNo={() => {
              setFollowUpChoice("no");
              setBranchPhase("809-done");
            }}
          />
        ) : null}

        {(showCapButtons ||
          showDudasButtons ||
          showCondicionesButtons ||
          showAcceptanceButtons ||
          showSimpleButtons ||
          show809Buttons ||
          show809FollowUp) &&
        canContinue ? (
          <div className="mt-4 flex justify-end">
            <Button type="button" size="sm" onClick={() => setBlockIndex((i) => i + 1)}>
              Continuar
              <ChevronRight className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function resolveContent(
  step: SalesScriptStep,
  phase: BranchPhase,
  choice: "yes" | "no" | null,
  followUpChoice: "yes" | "no" | null,
  capChoice: "yes" | "no" | null,
  condicionesChoice: "yes" | "no" | null,
  acceptanceChoice: "yes" | "no" | null,
): string {
  const base = step.content;
  const b = step.branch;
  if (!b) return base;

  const parts = [base];

  if (b.cap && capChoice === "yes") parts.push("", b.cap.yesSpeech);
  if (b.cap && capChoice === "no") parts.push("", b.cap.noSpeech);

  if (condicionesChoice === "yes" && b.condicionesDudas?.yesSpeech) {
    parts.push("", b.condicionesDudas.yesSpeech);
  }
  if (acceptanceChoice === "no" && b.acceptance?.noSpeech) {
    parts.push("", b.acceptance.noSpeech);
  }

  if (choice === "yes" && b.yesSpeech) parts.push("", b.yesSpeech);
  if (choice === "no" && b.noSpeech) parts.push("", b.noSpeech);

  if (b.prefijo809) {
    if (choice === "yes") parts.push("", b.prefijo809.yesSpeech);
    if (choice === "no") {
      parts.push("", b.prefijo809.noSpeech);
      if (phase === "809-followup" || phase === "809-done") {
        parts.push("", b.prefijo809.followUpPrompt);
      }
    }
    if (followUpChoice === "yes") parts.push("", b.prefijo809.followUpYesSpeech);
    if (followUpChoice === "no") parts.push("", b.prefijo809.followUpNoSpeech);
  }

  return parts.join("\n");
}

function canAdvanceBlock(
  step: SalesScriptStep,
  phase: BranchPhase,
  choice: "yes" | "no" | null,
  followUpChoice: "yes" | "no" | null,
  capChoice: "yes" | "no" | null,
  condicionesChoice: "yes" | "no" | null,
  acceptanceChoice: "yes" | "no" | null,
): boolean {
  const b = step.branch;
  if (!b) return true;

  if (b.cap && capChoice === null) return false;
  if (b.cap && capChoice !== null && choice === null) return false;

  if (b.condicionesDudas && condicionesChoice === null) return false;
  if (b.acceptance && condicionesChoice !== null && acceptanceChoice === null) return false;

  if (b.prefijo809 && acceptanceChoice !== null && choice === null) return false;
  if (b.prefijo809 && choice === "no" && followUpChoice === null && phase === "809-followup") {
    return false;
  }

  if ((b.yesSpeech || b.noSpeech) && !b.cap && !b.prefijo809 && !b.condicionesDudas && choice === null) {
    return false;
  }

  if (b.cap && capChoice !== null && choice !== null) return true;
  if (b.condicionesDudas && condicionesChoice !== null && acceptanceChoice !== null) {
    if (b.prefijo809 && choice === null) return false;
    if (b.prefijo809 && choice === "no" && followUpChoice === null && phase === "809-followup") {
      return false;
    }
    if (b.prefijo809 && choice !== null && (choice === "yes" || followUpChoice !== null)) return true;
    if (!b.prefijo809) return true;
  }
  if (b.prefijo809 && !b.condicionesDudas && choice !== null && (choice === "yes" || followUpChoice !== null)) {
    return true;
  }
  if (!b.cap && !b.prefijo809 && !b.condicionesDudas && choice !== null) return true;

  return capChoice !== null || condicionesChoice !== null || acceptanceChoice !== null || choice !== null;
}

function BranchButtons({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
      <Button type="button" size="sm" className="flex-1 gap-2" onClick={onYes}>
        <Check className="size-4" />
        Sí
      </Button>
      <Button type="button" variant="secondary" size="sm" className="flex-1 gap-2" onClick={onNo}>
        <X className="size-4" />
        No
      </Button>
    </div>
  );
}

function getInteractionMode(
  step: SalesScriptStep | undefined,
  capChoice: "yes" | "no" | null,
  condicionesChoice: "yes" | "no" | null,
  acceptanceChoice: "yes" | "no" | null,
  choice: "yes" | "no" | null,
  followUpChoice: "yes" | "no" | null,
):
  | "cap"
  | "dudas"
  | "condiciones-dudas"
  | "acceptance"
  | "809"
  | "809-followup"
  | "binary"
  | "navigate" {
  const b = step?.branch;
  if (!b) return "navigate";
  if (b.cap && capChoice === null) return "cap";
  if (b.cap && capChoice !== null && choice === null) return "dudas";
  if (b.condicionesDudas && condicionesChoice === null) return "condiciones-dudas";
  if (b.acceptance && condicionesChoice !== null && acceptanceChoice === null) return "acceptance";
  if (b.prefijo809 && acceptanceChoice !== null && choice === null) return "809";
  if (b.prefijo809 && choice === "no" && followUpChoice === null) return "809-followup";
  if (
    choice === null &&
    (b.yesSpeech || b.noSpeech) &&
    !b.cap &&
    !b.prefijo809 &&
    !b.condicionesDudas
  ) {
    return "binary";
  }
  return "navigate";
}

function AdvisorSummaryCard({
  script,
  blockIndex,
  blocksCount,
}: {
  script: GeneratedSalesScript;
  blockIndex: number;
  blocksCount: number;
}) {
  const s = script.meta.advisorSummary;
  const items = [
    { icon: "👤", label: "Cliente", value: script.meta.clientName },
    { icon: "📱", label: "Operador actual", value: s?.currentOperator ?? "—" },
    { icon: "📦", label: "Tipo", value: script.meta.saleTypeLabel },
    { icon: "📋", label: "Plan", value: script.meta.planName },
    { icon: "💰", label: "Valor", value: s?.planValueLabel ?? script.meta.totalMonthlyLabel },
    { icon: "➕", label: "Líneas", value: String(s?.lineCount ?? 1) },
    { icon: "🚚", label: "Entrega", value: s?.deliveryLabel ?? "—" },
    { icon: "📅", label: "Fecha entrega", value: s?.deliveryDate ?? "—" },
  ];

  return (
    <div className="sticky top-0 z-10 rounded-2xl border border-line bg-canvas/95 px-4 py-3 shadow-sm backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">
          {script.flowTitle}
          {script.meta.accountModalityLabel ? (
            <span className="ml-2 font-normal text-muted">· {script.meta.accountModalityLabel}</span>
          ) : null}
        </p>
        <p className="text-[11px] text-muted">
          Bloque {blockIndex + 1} / {blocksCount}
        </p>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px] sm:grid-cols-4 lg:grid-cols-8">
        {items.map((item) => (
          <div key={item.label} className="min-w-0">
            <p className="truncate text-[10px] uppercase tracking-wide text-muted">
              {item.icon} {item.label}
            </p>
            <p className="truncate font-medium text-ink">{item.value || "—"}</p>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-line/60 pt-2 text-[12px]">
        <span className="text-muted">Total mensual</span>
        <span className="font-semibold text-brand">{script.meta.totalMonthlyLabel}</span>
      </div>
    </div>
  );
}
