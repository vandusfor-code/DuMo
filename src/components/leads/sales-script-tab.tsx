"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, ScrollText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GeneratedSalesScript, SalesScriptStep } from "@/types/sales-script";
import { cn } from "@/lib/utils";

const ADVISOR_NOTE_CLASS = "mt-2 text-[11px] leading-snug text-muted/75 italic";

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
  const [externalAudioAcknowledged, setExternalAudioAcknowledged] = useState(false);
  const [contractSummaryRevealed, setContractSummaryRevealed] = useState(false);
  const [npsQuestionAcknowledged, setNpsQuestionAcknowledged] = useState(false);
  const [consulta809Revealed, setConsulta809Revealed] = useState(false);

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
    setExternalAudioAcknowledged(false);
    setContractSummaryRevealed(false);
    setNpsQuestionAcknowledged(false);
    setConsulta809Revealed(false);
  }

  const blocks = script?.steps ?? [];
  const current = blocks[blockIndex];
  const progress = blocks.length > 0 ? ((blockIndex + 1) / blocks.length) * 100 : 0;

  const displayContent = useMemo(
    () =>
      current
        ? resolveContent(
            current,
            branchPhase,
            choice,
            followUpChoice,
            capChoice,
            condicionesChoice,
            acceptanceChoice,
            externalAudioAcknowledged,
            contractSummaryRevealed,
            npsQuestionAcknowledged,
            consulta809Revealed,
          )
        : "",
    [
      current,
      branchPhase,
      choice,
      followUpChoice,
      capChoice,
      condicionesChoice,
      acceptanceChoice,
      externalAudioAcknowledged,
      contractSummaryRevealed,
      npsQuestionAcknowledged,
      consulta809Revealed,
    ],
  );

  const canContinue = current
    ? canAdvanceBlock(
        current,
        branchPhase,
        choice,
        followUpChoice,
        capChoice,
        condicionesChoice,
        acceptanceChoice,
        externalAudioAcknowledged,
        contractSummaryRevealed,
        npsQuestionAcknowledged,
      )
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
    externalAudioAcknowledged,
    contractSummaryRevealed,
    npsQuestionAcknowledged,
  );

  const showCapButtons = interaction === "cap";
  const showDudasButtons = interaction === "dudas";
  const showCondicionesButtons = interaction === "condiciones-dudas";
  const showAcceptanceButtons = interaction === "acceptance";
  const show809Buttons = interaction === "809";
  const show809FollowUp = interaction === "809-followup";
  const showSimpleButtons = interaction === "binary";
  const showNav = interaction === "navigate";

  const advisorNoteOnYes =
    current?.branch?.externalAudio?.advisorNoteOnYes ??
    current?.branch?.portabilityProcess?.advisorNoteOnYes ??
    (condicionesChoice === "yes" ? current?.branch?.condicionesDudas?.advisorNoteOnYes : undefined);

  const advisorNoteOnNo =
    current?.branch?.dataValidation?.advisorNoteOnNo ??
    (acceptanceChoice === "no" ? current?.branch?.acceptance?.advisorNoteOnNo : undefined);

  const advisorNote809Start = current?.branch?.prefijo809?.advisorNoteOnBlockStart;
  const advisorNote809OnAccept =
    choice === "yes" || followUpChoice === "yes"
      ? current?.branch?.prefijo809?.advisorNoteOnYes
      : undefined;
  const advisorNoteNps = current?.branch?.npsSurvey?.advisorNoteBeforeContinue;
  const advisorNoteReferral = current?.branch?.referral?.advisorNote;

  const awaitingExternalAudioReturn =
    Boolean(current?.branch?.externalAudio) && !externalAudioAcknowledged;
  const awaitingDataCorrection =
    Boolean(current?.branch?.dataValidation) && choice === "no" && !contractSummaryRevealed;
  const awaitingNpsResponse =
    Boolean(current?.branch?.npsSurvey) && !npsQuestionAcknowledged;

  const show809ConsultaButton =
    Boolean(current?.branch?.prefijo809?.consultaSpeech) && choice === null && !consulta809Revealed;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-canvas/50 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">
          {script.flowTitle}
          {script.meta.accountModalityLabel ? (
            <span className="ml-2 font-normal text-muted">· {script.meta.accountModalityLabel}</span>
          ) : null}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[12px] sm:grid-cols-4">
          <MetaItem label="Cliente" value={script.meta.clientName} />
          <MetaItem label="Plan" value={script.meta.planName} />
          <MetaItem label="Total" value={script.meta.totalMonthlyLabel} highlight />
          <MetaItem label="Avance" value={`${blockIndex + 1} / ${blocks.length}`} />
        </div>
      </div>

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

        {advisorNote809Start ? (
          <p className={ADVISOR_NOTE_CLASS}>
            <span className="font-normal not-italic text-muted/65">Nota para la asesora: </span>
            {advisorNote809Start}
          </p>
        ) : null}

        {advisorNoteNps && awaitingNpsResponse ? (
          <p className={ADVISOR_NOTE_CLASS}>
            <span className="font-normal not-italic text-muted/65">Nota para la asesora: </span>
            {advisorNoteNps}
          </p>
        ) : null}

        {advisorNoteReferral ? (
          <p className={ADVISOR_NOTE_CLASS}>
            <span className="font-normal not-italic text-muted/65">Nota para la asesora: </span>
            {advisorNoteReferral}
          </p>
        ) : null}

        {advisorNoteOnYes && (choice === "yes" || condicionesChoice === "yes") ? (
          <p className={ADVISOR_NOTE_CLASS}>
            <span className="font-normal not-italic text-muted/65">Nota para la asesora: </span>
            {advisorNoteOnYes}
          </p>
        ) : null}

        {advisorNoteOnNo && (awaitingDataCorrection || acceptanceChoice === "no") ? (
          <p className={ADVISOR_NOTE_CLASS}>
            <span className="font-normal not-italic text-muted/65">Nota para la asesora: </span>
            {advisorNoteOnNo}
          </p>
        ) : null}

        {advisorNote809OnAccept ? (
          <p className={ADVISOR_NOTE_CLASS}>
            <span className="font-normal not-italic text-muted/65">Nota para la asesora: </span>
            {advisorNote809OnAccept}
          </p>
        ) : null}

        {show809ConsultaButton ? (
          <div className="mt-4">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setConsulta809Revealed(true)}
            >
              El cliente consulta más
            </Button>
          </div>
        ) : null}

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
              if (current?.branch?.dataValidation) {
                setContractSummaryRevealed(true);
              }
            }}
            onNo={() => {
              setChoice("no");
              if (current?.branch?.prefijo809?.followUpPrompt || current?.branch?.prefijo809?.noSpeech) {
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
        showNav &&
        !(Boolean(current?.branch?.npsSurvey) && npsQuestionAcknowledged) &&
        !(Boolean(current?.branch?.externalAudio) && externalAudioAcknowledged && choice !== null) &&
        !(Boolean(current?.branch?.dataValidation) && contractSummaryRevealed) &&
        !awaitingNpsResponse ? (
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
              disabled={
                (blockIndex >= blocks.length - 1 || !canContinue) &&
                !awaitingExternalAudioReturn &&
                !awaitingDataCorrection &&
                !awaitingNpsResponse
              }
              onClick={() => {
                if (awaitingExternalAudioReturn) {
                  setExternalAudioAcknowledged(true);
                  return;
                }
                if (awaitingDataCorrection) {
                  setContractSummaryRevealed(true);
                  return;
                }
                if (awaitingNpsResponse) {
                  setNpsQuestionAcknowledged(true);
                  return;
                }
                setBlockIndex((i) => Math.min(blocks.length - 1, i + 1));
              }}
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
          show809FollowUp ||
          awaitingNpsResponse ||
          (Boolean(current?.branch?.externalAudio) &&
            externalAudioAcknowledged &&
            choice !== null) ||
          (Boolean(current?.branch?.dataValidation) && contractSummaryRevealed) ||
          (Boolean(current?.branch?.npsSurvey) && npsQuestionAcknowledged)) &&
        (canContinue || awaitingNpsResponse) ? (
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (awaitingNpsResponse) {
                  setNpsQuestionAcknowledged(true);
                  return;
                }
                setBlockIndex((i) => i + 1);
              }}
            >
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
  externalAudioAcknowledged: boolean,
  contractSummaryRevealed: boolean,
  npsQuestionAcknowledged: boolean,
  consulta809Revealed: boolean,
): string {
  const base = step.content;
  const b = step.branch;
  if (!b) return base;

  const parts = [base];

  if (b.externalAudio) {
    if (externalAudioAcknowledged) {
      parts.push("", b.externalAudio.postAudioQuestion);
    }
    return parts.join("\n");
  }

  if (b.npsSurvey) {
    if (npsQuestionAcknowledged) {
      parts.push("", b.npsSurvey.postQuestionSpeech);
    }
    return parts.join("\n");
  }

  if (b.dataValidation) {
    if (contractSummaryRevealed) {
      parts.push("", b.dataValidation.postValidationSpeech);
    }
    return parts.join("\n");
  }

  if (b.cap && capChoice === "yes") parts.push("", b.cap.yesSpeech);
  if (b.cap && capChoice === "no") parts.push("", b.cap.noSpeech);

  if (condicionesChoice !== null && b.acceptance?.postCondicionesSpeech) {
    parts.push("", b.acceptance.postCondicionesSpeech);
  } else if (condicionesChoice === "yes" && b.condicionesDudas?.yesSpeech) {
    parts.push("", b.condicionesDudas.yesSpeech);
  }

  if (acceptanceChoice === "no" && b.acceptance?.noSpeech && !b.acceptance.advisorNoteOnNo) {
    parts.push("", b.acceptance.noSpeech);
  }

  if (choice === "yes" && b.yesSpeech && !b.portabilityProcess) parts.push("", b.yesSpeech);
  if (choice === "no" && b.noSpeech) parts.push("", b.noSpeech);

  if (b.prefijo809) {
    if (consulta809Revealed && b.prefijo809.consultaSpeech) {
      parts.push("", b.prefijo809.consultaSpeech);
    }
    if (choice === "yes") parts.push("", b.prefijo809.yesSpeech);
    if (choice === "no") {
      parts.push("", b.prefijo809.noSpeech);
      if (b.prefijo809.followUpPrompt && (phase === "809-followup" || phase === "809-done")) {
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
  externalAudioAcknowledged: boolean,
  contractSummaryRevealed: boolean,
  npsQuestionAcknowledged: boolean,
): boolean {
  const b = step.branch;
  if (!b) return true;

  if (b.externalAudio) {
    if (!externalAudioAcknowledged) return true;
    return choice !== null;
  }

  if (b.npsSurvey) {
    return npsQuestionAcknowledged;
  }

  if (b.dataValidation) {
    return contractSummaryRevealed;
  }

  if (b.cap && capChoice === null) return false;
  if (b.cap && capChoice !== null && choice === null) return false;

  if (b.condicionesDudas && condicionesChoice === null) return false;
  if (b.acceptance?.postCondicionesSpeech && condicionesChoice !== null && acceptanceChoice === null) {
    return false;
  }
  if (b.acceptance && !b.acceptance.postCondicionesSpeech && condicionesChoice !== null && acceptanceChoice === null) {
    return false;
  }

  if (b.prefijo809 && !b.condicionesDudas) {
    if (choice === null) return false;
    if (choice === "no" && followUpChoice === null && phase === "809-followup") return false;
    if (choice === "yes" || followUpChoice !== null) return true;
    return false;
  }

  if (b.portabilityProcess && !b.cap && choice === null) return false;

  if (
    (b.yesSpeech || b.noSpeech) &&
    !b.cap &&
    !b.prefijo809 &&
    !b.condicionesDudas &&
    !b.dataValidation &&
    !b.portabilityProcess &&
    choice === null
  ) {
    return false;
  }

  if (b.cap && capChoice !== null && choice !== null) return true;

  if (b.condicionesDudas && condicionesChoice !== null && acceptanceChoice !== null) {
    return true;
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
  externalAudioAcknowledged: boolean,
  contractSummaryRevealed: boolean,
  npsQuestionAcknowledged: boolean,
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

  if (b.externalAudio && externalAudioAcknowledged && choice !== null) return "navigate";
  if (b.externalAudio && !externalAudioAcknowledged) return "navigate";
  if (b.externalAudio && externalAudioAcknowledged && choice === null) return "binary";

  if (b.npsSurvey && !npsQuestionAcknowledged) return "navigate";
  if (b.npsSurvey && npsQuestionAcknowledged) return "navigate";

  if (b.dataValidation && contractSummaryRevealed) return "navigate";
  if (b.dataValidation && choice === "no" && !contractSummaryRevealed) return "navigate";
  if (b.dataValidation && choice === null) return "binary";

  if (b.cap && capChoice === null) return "cap";
  if (b.cap && capChoice !== null && choice === null) return "dudas";

  if (b.condicionesDudas && condicionesChoice === null) return "condiciones-dudas";
  if (b.acceptance && condicionesChoice !== null && acceptanceChoice === null) return "acceptance";

  if (b.prefijo809 && !b.condicionesDudas && choice === null) return "809";
  if (b.prefijo809 && !b.condicionesDudas && choice === "no" && followUpChoice === null) {
    return "809-followup";
  }

  if (
    choice === null &&
    (b.yesSpeech || b.noSpeech || b.portabilityProcess) &&
    !b.cap &&
    !b.prefijo809 &&
    !b.condicionesDudas &&
    !b.dataValidation
  ) {
    return b.portabilityProcess ? "dudas" : "binary";
  }

  return "navigate";
}

function MetaItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <p className={cn("mt-0.5 font-medium", highlight ? "text-brand" : "text-ink")}>{value || "—"}</p>
    </div>
  );
}
