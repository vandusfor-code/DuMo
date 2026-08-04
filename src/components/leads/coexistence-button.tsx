"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Botón de login de WhatsApp en modo COEXISTENCIA (Embedded Signup).
 *
 * Reutiliza la Meta App ya verificada (la de dulabs). Los valores públicos
 * llegan por variables de entorno `NEXT_PUBLIC_*`; el App Secret y el
 * intercambio del `code` viven en el servidor (`/api/whatsapp/connect`).
 *
 * IMPORTANTE: el `configId` y el `featureType` deben coincidir EXACTAMENTE con
 * la configuración de Embedded Signup que ya usas en dulabs para coexistencia.
 */

const APP_ID = process.env.NEXT_PUBLIC_META_APP_ID ?? "";
const CONFIG_ID =
  process.env.NEXT_PUBLIC_META_CONFIG_ID ??
  process.env.NEXT_PUBLIC_META_ES_CONFIG_ID ??
  "";
const GRAPH_VERSION = process.env.NEXT_PUBLIC_META_GRAPH_VERSION ?? "v21.0";
// Coexistencia: mismo valor que uses en dulabs (Meta lo documenta como
// "whatsapp_business_app_onboarding" para el flujo de coexistencia).
const FEATURE_TYPE =
  process.env.NEXT_PUBLIC_META_ES_FEATURE_TYPE ?? "whatsapp_business_app_onboarding";

type FBLoginResponse = { authResponse?: { code?: string } | null };
type FBLoginOptions = {
  config_id: string;
  response_type: "code";
  override_default_response_type: boolean;
  extras: Record<string, unknown>;
};
interface FBSdk {
  init: (options: Record<string, unknown>) => void;
  login: (cb: (r: FBLoginResponse) => void, options: FBLoginOptions) => void;
}
declare global {
  interface Window {
    FB?: FBSdk;
    fbAsyncInit?: () => void;
  }
}

type Status = "idle" | "loading" | "connecting" | "connected" | "error";

export function CoexistenceButton() {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  // Capturado por el postMessage del Embedded Signup.
  const sessionInfo = useRef<{ phoneNumberId?: string; wabaId?: string }>({});

  const configured = Boolean(APP_ID && CONFIG_ID);

  // Carga el SDK de Facebook una sola vez.
  useEffect(() => {
    if (!configured) return;
    if (window.FB) {
      setReady(true);
      return;
    }
    if (document.getElementById("facebook-jssdk")) return;

    window.fbAsyncInit = () => {
      window.FB?.init({
        appId: APP_ID,
        autoLogAppEvents: true,
        xfbml: false,
        version: GRAPH_VERSION,
      });
      setReady(true);
    };
    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    document.body.appendChild(script);
  }, [configured]);

  // Escucha el resultado del Embedded Signup (phone_number_id, waba_id).
  useEffect(() => {
    if (!configured) return;
    const handler = (event: MessageEvent) => {
      if (
        event.origin !== "https://www.facebook.com" &&
        event.origin !== "https://web.facebook.com"
      ) {
        return;
      }
      try {
        const data = JSON.parse(event.data as string) as {
          type?: string;
          event?: string;
          data?: { phone_number_id?: string; waba_id?: string };
        };
        if (data.type === "WA_EMBEDDED_SIGNUP") {
          if (data.data?.phone_number_id) {
            sessionInfo.current.phoneNumberId = data.data.phone_number_id;
          }
          if (data.data?.waba_id) {
            sessionInfo.current.wabaId = data.data.waba_id;
          }
          if (data.event === "CANCEL" || data.event === "ERROR") {
            setStatus("error");
            setMessage("El proceso se canceló o falló en Meta.");
          }
        }
      } catch {
        /* mensajes no-JSON de Meta: ignorar */
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [configured]);

  const launch = useCallback(() => {
    if (!window.FB) return;
    setStatus("loading");
    setMessage(null);
    window.FB.login(
      (response) => {
        const code = response?.authResponse?.code;
        if (!code) {
          setStatus("idle");
          return;
        }
        setStatus("connecting");
        fetch("/api/whatsapp/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            phoneNumberId: sessionInfo.current.phoneNumberId,
            wabaId: sessionInfo.current.wabaId,
          }),
        })
          .then(async (res) => {
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body?.error ?? "No se pudo conectar.");
            setStatus("connected");
            setMessage("Número conectado por coexistencia.");
          })
          .catch((err: Error) => {
            setStatus("error");
            setMessage(err.message);
          });
      },
      {
        config_id: CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: FEATURE_TYPE,
          sessionInfoVersion: "3",
        },
      },
    );
  }, []);

  if (!configured) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-line px-3 py-2 text-[12px] text-muted">
        <ShieldCheck className="size-4" />
        Conexión de WhatsApp no configurada (define las variables de Meta).
      </div>
    );
  }

  const busy = status === "loading" || status === "connecting";

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={launch}
        disabled={!ready || busy || status === "connected"}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-colors duration-200",
          status === "connected"
            ? "bg-success-soft text-success-ink"
            : "bg-[#1877F2] text-white hover:bg-[#1466d6] disabled:opacity-60",
        )}
      >
        {busy ? (
          <Loader2 className="size-[18px] animate-spin" />
        ) : (
          <MessageCircle className="size-[18px]" />
        )}
        {status === "connected"
          ? "WhatsApp conectado"
          : status === "connecting"
            ? "Conectando…"
            : "Conectar WhatsApp (coexistencia)"}
      </button>
      {message && (
        <p
          className={cn(
            "text-[12px]",
            status === "error" ? "text-danger-ink" : "text-muted",
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
