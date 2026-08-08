"use client";

import { useEffect, useState } from "react";
import { Loader2, QrCode, Smartphone, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useCreateWebQrChannel,
  useStartWebQrSession,
  useWebQrChannels,
  useWebQrSession,
} from "@/hooks/use-web-qr";
import type { WhatsAppChannel } from "@/types/web-qr";

function StatusBadge({ status }: { status: WhatsAppChannel["status"] }) {
  const map = {
    CONNECTED: { label: "Conectado", className: "bg-success-soft text-success-ink", icon: Wifi },
    DISCONNECTED: { label: "Desconectado", className: "bg-muted/20 text-muted", icon: WifiOff },
    INITIALIZING: { label: "Inicializando", className: "bg-warning-soft text-warning-ink", icon: Loader2 },
  } as const;
  const cfg = map[status] ?? map.DISCONNECTED;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.className}`}>
      <Icon className={`size-3.5 ${status === "INITIALIZING" ? "animate-spin" : ""}`} />
      {cfg.label}
    </span>
  );
}

function ChannelCard({ channel }: { channel: WhatsAppChannel }) {
  const start = useStartWebQrSession();
  const [polling, setPolling] = useState(channel.status !== "CONNECTED");
  const session = useWebQrSession(channel.id, polling);

  useEffect(() => {
    if (session.data?.status === "CONNECTED") setPolling(false);
    if (session.data?.status === "QR_PENDING") setPolling(true);
  }, [session.data?.status]);

  const handleConnect = async () => {
    setPolling(true);
    await start.mutateAsync(channel.id);
  };

  const qr = session.data?.qrDataUrl;
  const connectedPhone = session.data?.phoneNumber ?? channel.phoneNumber;

  return (
    <div className="rounded-card border border-line bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-fg">{channel.label}</p>
          <p className="mt-0.5 font-mono text-[11px] text-muted">{channel.id}</p>
          {connectedPhone && connectedPhone !== "pending" ? (
            <p className="mt-1 text-xs text-muted">+{connectedPhone}</p>
          ) : null}
        </div>
        <StatusBadge status={channel.status} />
      </div>

      {channel.status !== "CONNECTED" ? (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-canvas/60 p-4">
          {qr ? (
            <>
              <p className="text-center text-xs text-muted">
                Escanea con WhatsApp → Dispositivos vinculados → Vincular dispositivo
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="Código QR WhatsApp Web" className="size-52 rounded-lg bg-white p-2" />
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 text-muted">
              <QrCode className="size-10 opacity-40" />
              <p className="text-xs">Genera un código QR para vincular esta línea</p>
            </div>
          )}
          <Button
            type="button"
            size="sm"
            onClick={handleConnect}
            disabled={start.isPending}
            className="gap-2"
          >
            {start.isPending ? <Loader2 className="size-4 animate-spin" /> : <Smartphone className="size-4" />}
            {qr ? "Actualizar QR" : "Generar código QR"}
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-success-ink">
          Sesión activa. Los mensajes entrantes aparecerán en Leads con prefijo webqr.
        </p>
      )}
    </div>
  );
}

export function WebQrConnectPanel() {
  const { data, isLoading, isError } = useWebQrChannels();
  const create = useCreateWebQrChannel();
  const [label, setLabel] = useState("Campaña Meta Ads");

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="size-4 animate-spin" />
        Cargando canales QR…
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-danger-ink">
        No se pudo cargar el módulo QR. Solo administradores pueden acceder.
      </p>
    );
  }

  const configured = data?.configured ?? false;
  const channels = data?.channels ?? [];

  return (
    <div className="space-y-6">
      {!configured ? (
        <div className="rounded-card border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning-ink">
          El bridge Baileys no está configurado. Despliega{" "}
          <code className="text-xs">services/web-qr-bridge</code> en Railway/Fly y define{" "}
          <code className="text-xs">WEB_QR_BRIDGE_URL</code>,{" "}
          <code className="text-xs">WEB_QR_BRIDGE_SECRET</code> y{" "}
          <code className="text-xs">WEB_QR_WEBHOOK_SECRET</code> en Vercel.
        </div>
      ) : null}

      <div className="rounded-card border border-line bg-card p-5">
        <h3 className="text-sm font-semibold text-fg">Nueva línea WhatsApp Web</h3>
        <p className="mt-1 text-xs text-muted">
          Conexión alternativa por QR — no modifica la API Cloud (WABA) existente.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Nombre de la línea"
            className="max-w-xs"
          />
          <Button
            type="button"
            onClick={() => create.mutate(label.trim() || "Línea WhatsApp Web")}
            disabled={!configured || create.isPending}
          >
            {create.isPending ? "Creando…" : "Agregar línea"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {channels.map((ch) => (
          <ChannelCard key={ch.id} channel={ch} />
        ))}
      </div>

      {channels.length === 0 ? (
        <p className="text-sm text-muted">Aún no hay líneas QR. Agrega una para generar el código.</p>
      ) : null}
    </div>
  );
}
