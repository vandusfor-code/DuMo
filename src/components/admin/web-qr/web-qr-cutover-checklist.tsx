"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, ExternalLink, Loader2, XCircle } from "lucide-react";
import { apiGet } from "@/lib/api-client";

type WebQrDiag = {
  configured?: boolean;
  readyForQr?: boolean;
  problems?: string[];
  health?: { ok?: boolean; body?: { sessions?: number; persistedSessions?: number } };
};

const STEPS = [
  {
    id: "bridge",
    label: "Bridge Railway encendido y variables alineadas (Vercel ↔ Railway)",
  },
  {
    id: "qr",
    label: "Escanear QR en esta página — estado Conectado",
  },
  {
    id: "inbound",
    label: "Prueba entrante: otro celular escribe al número → aparece en Leads (webqr:…)",
  },
  {
    id: "outbound",
    label: "Prueba saliente: responder desde DuMo → cliente recibe en WhatsApp",
  },
  {
    id: "dulabs",
    label: "Recién entonces: desvincular número en dulabs / cortar webhook",
  },
] as const;

export function WebQrCutoverChecklist() {
  const diag = useQuery({
    queryKey: ["system", "web-qr"],
    queryFn: () => apiGet<WebQrDiag>("/api/system/web-qr"),
    refetchInterval: 8000,
  });

  const data = diag.data;
  const bridgeOk = data?.health?.ok === true;
  const configured = data?.configured === true;
  const ready = data?.readyForQr === true;
  const hasSession =
    (data?.health?.body?.sessions ?? 0) > 0 ||
    (data?.health?.body?.persistedSessions ?? 0) > 0;

  const stepDone: Record<string, boolean> = {
    bridge: configured && bridgeOk,
    qr: ready || hasSession,
    inbound: ready,
    outbound: ready,
    dulabs: false,
  };

  return (
    <section className="rounded-card border border-brand/25 bg-brand-soft/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-fg">Checklist: pasar de dulabs a QR</h2>
          <p className="mt-1 max-w-2xl text-xs text-muted">
            Conecta por QR y prueba entrante/saliente <strong>antes</strong> de desvincular el número
            en dulabs. Los chats viejos de WABA quedan en su hilo; los nuevos entran como{" "}
            <code className="text-[11px]">webqr:573…</code>
          </p>
        </div>
        <a
          href="/api/system/web-qr"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
        >
          Diagnóstico JSON
          <ExternalLink className="size-3.5" />
        </a>
      </div>

      {diag.isLoading ? (
        <p className="mt-4 flex items-center gap-2 text-xs text-muted">
          <Loader2 className="size-3.5 animate-spin" />
          Comprobando bridge…
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {STEPS.map((step, i) => {
            const done = stepDone[step.id];
            const Icon = done ? CheckCircle2 : i === 0 && !bridgeOk ? XCircle : Circle;
            return (
              <li key={step.id} className="flex items-start gap-2 text-sm">
                <Icon
                  className={`mt-0.5 size-4 shrink-0 ${
                    done ? "text-success-ink" : step.id === "dulabs" ? "text-muted" : "text-warning-ink"
                  }`}
                />
                <span className={done ? "text-fg" : "text-muted"}>{step.label}</span>
              </li>
            );
          })}
        </ul>
      )}

      {ready ? (
        <p className="mt-4 rounded-lg border border-success/30 bg-success-soft px-3 py-2 text-xs font-medium text-success-ink">
          Sistema QR listo. Haz la prueba manual entrante/saliente y luego corta dulabs.
        </p>
      ) : null}

      {data?.problems?.length ? (
        <div className="mt-3 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-warning-ink">
          <p className="font-semibold">Pendiente:</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {data.problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
