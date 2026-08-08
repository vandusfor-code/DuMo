"use client";

import { useEffect, useState } from "react";
import { Loader2, LogOut, QrCode, Smartphone, Trash2, Wifi, WifiOff } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  useCreateWebQrChannel,
  useDeleteWebQrChannel,
  useDisconnectWebQrSession,
  useStartWebQrSession,
  useWebQrChannels,
  useWebQrSession,
  webQrKeys,
} from "@/hooks/use-web-qr";
import type { WhatsAppChannel } from "@/types/web-qr";

function StatusBadge({ status }: { status: WhatsAppChannel["status"] | string }) {
  const normalized =
    status === "QR_PENDING" || status === "INITIALIZING"
      ? "INITIALIZING"
      : status === "CONNECTED"
        ? "CONNECTED"
        : "DISCONNECTED";

  const map = {
    CONNECTED: { label: "Conectado", className: "bg-success-soft text-success-ink", icon: Wifi },
    DISCONNECTED: { label: "Desconectado", className: "bg-muted/20 text-muted", icon: WifiOff },
    INITIALIZING: { label: "Inicializando", className: "bg-warning-soft text-warning-ink", icon: Loader2 },
  } as const;
  const cfg = map[normalized];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.className}`}>
      <Icon className={`size-3.5 ${normalized === "INITIALIZING" ? "animate-spin" : ""}`} />
      {cfg.label}
    </span>
  );
}

function resolveLiveStatus(
  channel: WhatsAppChannel,
  sessionStatus?: string,
): WhatsAppChannel["status"] | string {
  if (sessionStatus === "CONNECTED") return "CONNECTED";
  if (sessionStatus === "QR_PENDING" || sessionStatus === "INITIALIZING") return "INITIALIZING";
  if (sessionStatus === "DISCONNECTED") return "DISCONNECTED";
  return channel.status;
}

function ChannelCard({ channel }: { channel: WhatsAppChannel }) {
  const qc = useQueryClient();
  const start = useStartWebQrSession();
  const disconnect = useDisconnectWebQrSession();
  const remove = useDeleteWebQrChannel();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const session = useWebQrSession(channel.id, true);

  const liveStatus = resolveLiveStatus(channel, session.data?.status);
  const isConnected = liveStatus === "CONNECTED";
  const isInitializing = liveStatus === "INITIALIZING" || session.data?.status === "QR_PENDING";

  useEffect(() => {
    if (session.data?.status === "DISCONNECTED" && channel.status !== "DISCONNECTED") {
      void qc.invalidateQueries({ queryKey: webQrKeys.channels });
    }
  }, [session.data?.status, channel.status, qc]);

  const handleConnect = async () => {
    setLocalError(null);
    try {
      await start.mutateAsync(channel.id);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "No se pudo conectar con el bridge.");
    }
  };

  const handleDisconnect = async () => {
    setLocalError(null);
    try {
      await disconnect.mutateAsync(channel.id);
      setConfirmLogout(false);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "No se pudo cerrar la sesión.");
    }
  };

  const handleDelete = async () => {
    setLocalError(null);
    try {
      await remove.mutateAsync(channel.id);
      setConfirmDelete(false);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "No se pudo eliminar la línea.");
    }
  };

  const qr = session.data?.qrDataUrl ?? start.data?.qrDataUrl;
  const connectedPhone = isConnected
    ? session.data?.phoneNumber ??
      (channel.phoneNumber !== "pending" ? channel.phoneNumber : null)
    : null;

  const busy = disconnect.isPending || remove.isPending || start.isPending;

  return (
    <>
      <div className="rounded-card border border-line bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-fg">{channel.label}</p>
            {isConnected && connectedPhone ? (
              <p className="mt-1 text-xs font-medium text-fg">+{connectedPhone}</p>
            ) : (
              <p className="mt-1 text-xs text-muted">Sin número vinculado</p>
            )}
          </div>
          <StatusBadge status={liveStatus} />
        </div>

        {isConnected ? (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-success-ink">
              Sesión activa. Los mensajes entrantes aparecerán en Leads con prefijo webqr.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
                onClick={() => setConfirmLogout(true)}
                disabled={busy}
              >
                {disconnect.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <LogOut className="size-4" />
                )}
                Cerrar sesión
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
                onClick={() => setConfirmDelete(true)}
                disabled={busy}
              >
                <Trash2 className="size-4" />
                Eliminar línea
              </Button>
            </div>
          </div>
        ) : (
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
                <p className="text-center text-xs">
                  {start.isPending || session.isFetching || isInitializing
                    ? "Conectando con el bridge… el QR aparecerá en unos segundos."
                    : "Pulsa el botón para generar el código QR."}
                </p>
              </div>
            )}
            {localError || start.error ? (
              <p className="text-center text-xs text-danger-ink">
                {localError ?? (start.error instanceof Error ? start.error.message : "Error al generar QR")}
              </p>
            ) : null}
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleConnect}
                disabled={busy}
                className="gap-2"
              >
                {start.isPending ? <Loader2 className="size-4 animate-spin" /> : <Smartphone className="size-4" />}
                {qr ? "Actualizar QR" : "Generar código QR"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-2 text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
                onClick={() => setConfirmDelete(true)}
                disabled={busy}
              >
                {remove.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                Eliminar línea
              </Button>
            </div>
          </div>
        )}

        {localError && isConnected ? (
          <p className="mt-2 text-xs text-danger-ink">{localError}</p>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmLogout}
        title="Cerrar sesión de WhatsApp Web"
        description="Se desvinculará el número y se borrarán las credenciales del bridge. La línea seguirá en DuMo para que puedas escanear un QR nuevo."
        confirmLabel="Cerrar sesión"
        isLoading={disconnect.isPending}
        onConfirm={() => void handleDisconnect()}
        onCancel={() => setConfirmLogout(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar línea QR"
        description="Se borrará esta línea de DuMo y se purgará su sesión en el bridge. Esta acción no se puede deshacer."
        confirmLabel="Eliminar línea"
        isLoading={remove.isPending}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
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
