"use client";

import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, ScrollText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GeneratedSalesScript, SalesScriptBranch, SalesScriptStep } from "@/types/sales-script";
import { cn } from "@/lib/utils";

type BranchPhase = "ask" | "resolved" | "followup";

export function SalesScriptTab({
  script,
  unavailableReason,
  gestionSaved,
}: {
  script: GeneratedSalesScript | null | undefined;
  unavailableReason?: string | null;
  gestionSaved?: boolean;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [branchPhase, setBranchPhase] = useState<BranchPhase>("ask");
  const [branchChoice, setBranchChoice] = useState<"yes" | "no" | null>(null);
  const [followUpChoice, setFollowUpChoice] = useState<"yes" | "no" | null>(null);

  useEffect(() => {
    setStepIndex(0);
    resetBranch();
  }, [script?.id]);

  useEffect(() => {
    resetBranch();
  }, [stepIndex]);

  function resetBranch() {
    setBranchPhase("ask");
    setBranchChoice(null);
    setFollowUpChoice(null);
  }

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

  const steps = script.steps;
  const current = steps[stepIndex];
  const progress = steps.length > 0 ? ((stepIndex + 1) / steps.length) * 100 : 0;
  const displayContent = resolveDisplayContent(current, branchPhase, branchChoice, followUpChoice);
  const canContinue = canAdvance(current, branchPhase, branchChoice, followUpChoice);

  function handleBranch(choice: "yes" | "no") {
    if (!current?.branch) return;
    setBranchChoice(choice);
    if (choice === "no" && current.branch.followUp && current.branch.noSpeech) {
      setBranchPhase("resolved");
    } else if (choice === "no" && current.branch.followUp && !current.branch.noSpeech) {
      setBranchPhase("followup");
    } else {
      setBranchPhase("resolved");
    }
  }

  function handleFollowUp(choice: "yes" | "no") {
    setFollowUpChoice(choice);
    setBranchPhase("resolved");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-canvas/50 p-4">
        <div className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
          <InfoItem label="Cliente" value={script.meta.clientName} />
          <InfoItem label="Tipo" value={script.meta.saleTypeLabel} />
          <InfoItem label="Plan" value={script.meta.planName} />
          <InfoItem label="Total" value={script.meta.totalMonthlyLabel} highlight />
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-brand">
              {script.flowTitle}
            </p>
            <p className="mt-1 text-[13px] text-muted">
              Paso {stepIndex + 1} de {steps.length}
            </p>
          </div>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-canvas">
          <div
            className="h-full rounded-full bg-brand transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <h4 className="mt-5 text-[15px] font-semibold text-ink">{current?.title}</h4>
        <div
          className="mt-3 select-none whitespace-pre-wrap text-[14px] leading-relaxed text-ink"
          onCopy={(e) => e.preventDefault()}
        >
          {displayContent}
        </div>

        <StepControls
          current={current}
          branchPhase={branchPhase}
          branchChoice={branchChoice}
          followUpChoice={followUpChoice}
          canContinue={canContinue}
          stepIndex={stepIndex}
          totalSteps={steps.length}
          onBranch={handleBranch}
          onFollowUp={handleFollowUp}
          onPrev={() => setStepIndex((i) => Math.max(0, i - 1))}
          onNext={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
        />
      </div>
    </div>
  );
}

function resolveDisplayContent(
  step: SalesScriptStep | undefined,
  phase: BranchPhase,
  choice: "yes" | "no" | null,
  followUpChoice: "yes" | "no" | null,
): string {
  if (!step) return "";
  const base = step.content;
  const branch = step.branch;
  if (!branch || phase === "ask") return base;

  if (phase === "followup" && branch.followUp) {
    return [base, "", branch.followUp.prompt].join("\n");
  }

  if (choice === "yes" && branch.yesSpeech) {
    return [base, "", branch.yesSpeech].join("\n");
  }

  if (choice === "no" && branch.noSpeech) {
    const parts = [base, "", branch.noSpeech];
    if (branch.followUp && phase === "resolved" && !followUpChoice) {
      parts.push("", branch.followUp.prompt);
    }
    if (followUpChoice === "yes" && branch.followUp?.yesSpeech) {
      parts.push("", branch.followUp.yesSpeech);
    }
    if (followUpChoice === "no" && branch.followUp?.noSpeech) {
      parts.push("", branch.followUp.noSpeech);
    }
    return parts.join("\n");
  }

  return base;
}

function canAdvance(
  step: SalesScriptStep | undefined,
  phase: BranchPhase,
  choice: "yes" | "no" | null,
  followUpChoice: "yes" | "no" | null,
): boolean {
  if (!step?.branch) return true;
  if (phase === "ask") return false;
  if (step.branch.followUp && choice === "no" && followUpChoice === null && phase === "resolved") {
    return false;
  }
  if (phase === "followup") return false;
  return choice !== null && (followUpChoice !== null || !needsFollowUp(step.branch, choice));
}

function needsFollowUp(branch: SalesScriptBranch, choice: "yes" | "no"): boolean {
  return choice === "no" && Boolean(branch.followUp) && Boolean(branch.noSpeech);
}

function StepControls({
  current,
  branchPhase,
  branchChoice,
  followUpChoice,
  canContinue,
  stepIndex,
  totalSteps,
  onBranch,
  onFollowUp,
  onPrev,
  onNext,
}: {
  current: SalesScriptStep | undefined;
  branchPhase: BranchPhase;
  branchChoice: "yes" | "no" | null;
  followUpChoice: "yes" | "no" | null;
  canContinue: boolean;
  stepIndex: number;
  totalSteps: number;
  onBranch: (c: "yes" | "no") => void;
  onFollowUp: (c: "yes" | "no") => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const branch = current?.branch;

  if (branch && branchPhase === "ask") {
    return (
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button type="button" size="sm" className="flex-1 gap-2" onClick={() => onBranch("yes")}>
          <Check className="size-4" />
          Sí
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="flex-1 gap-2"
          onClick={() => onBranch("no")}
        >
          <X className="size-4" />
          No
        </Button>
      </div>
    );
  }

  if (
    branch?.followUp &&
    branchChoice === "no" &&
    branchPhase === "resolved" &&
    followUpChoice === null &&
    branch.noSpeech
  ) {
    return (
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button type="button" size="sm" className="flex-1 gap-2" onClick={() => onFollowUp("yes")}>
          <Check className="size-4" />
          Sí
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="flex-1 gap-2"
          onClick={() => onFollowUp("no")}
        >
          <X className="size-4" />
          No
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      <Button type="button" variant="secondary" size="sm" disabled={stepIndex === 0} onClick={onPrev}>
        <ChevronLeft className="size-4" />
        Anterior
      </Button>
      <Button type="button" size="sm" disabled={stepIndex >= totalSteps - 1 || !canContinue} onClick={onNext}>
        Siguiente
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

function InfoItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="border-b border-line/60 pb-2 last:border-0 sm:border-b-0 sm:pb-0">
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className={cn("mt-0.5 text-[14px] font-medium", highlight ? "text-brand" : "text-ink")}>
        {value || "—"}
      </p>
    </div>
  );
}
