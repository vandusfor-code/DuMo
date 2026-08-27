"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  LogOut,
  MoreVertical,
  Pencil,
  QrCode,
  Smartphone,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  useCreateWebQrChannel,
  useDeleteWebQrChannel,
  useDisconnectWebQrSession,
  useStartWebQrSession,
  useUpdateWebQrChannelCarrier,
  useWebQrChannels,
  useWebQrSession,
  webQrKeys,
} from "@/hooks/use-web-qr";
import type { WhatsAppChannel } from "@/types/web-qr";
import { cn } from "@/lib/utils";

const DEFAULT_LINE_LABEL = "Línea WhatsApp Web";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function StatusBadge({ status }: { status: WhatsAppChannel["status"] | string }) {
  const normalized =
    status === "QR_PENDING" || status === "INITIALIZING"
      ? "INITIALIZING"
      : status === "CONNECTED"
        ? "CONNECTED"
        : "DISCONNECTED";

  const map = {
    CONNECTED: { label: "Conectado", className: "bg-success-soft text-success-ink", icon: Wifi },
    DISCONNECTED: { label: "Desconectado", className: "bg-muted/15 text-muted", icon: WifiOff },
    INITIALIZING: {
      label: "Inicializando",
      className: "bg-warning-soft text-warning-ink",
      icon: Loader2,
    },
  } as const;
  const cfg = map[normalized];
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        cfg.className,
      )}
    >
      <Icon className={cn("size-3.5", normalized === "INITIALIZING" ? "animate-spin" : "")} />
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

function formatPhone(phone: string | null | undefined) {
  if (!phone || phone === "pending") return "Sin número vinculado";
  return phone.startsWith("+") ? phone : `+${phone}`;
}

function CarrierBadgeSelect({ channel }: { channel: WhatsAppChannel }) {
  const updateCarrier = useUpdateWebQrChannelCarrier();
  return (
    <Select
      value={channel.carrier}
      onValueChange={(carrier) => updateCarrier.mutate({ channelId: channel.id, carrier })}
    >
      <SelectTrigger
        className="h-7 w-[92px] shrink-0 px-2 text-[12px]"
        aria-label="Operador de esta línea"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="wom">WOM</SelectItem>
        <SelectItem value="claro">Claro</SelectItem>
      </SelectContent>
    </Select>
  );
}

function ChannelRow({ channel }: { channel: WhatsAppChannel }) {
  const qc = useQueryClient();
  const start = useStartWebQrSession();
  const disconnect = useDisconnectWebQrSession();
  const remove = useDeleteWebQrChannel();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [autoRestoreAttempted, setAutoRestoreAttempted] = useState(false);
  const [showQrPanel, setShowQrPanel] = useState(false);

  const session = useWebQrSession(channel.id, true);

  const liveStatus = resolveLiveStatus(channel, session.data?.status);
  const isConnected = liveStatus === "CONNECTED";
  const isInitializing = liveStatus === "INITIALIZING" || session.data?.status === "QR_PENDING";

  const handleConnect = async () => {
    setLocalError(null);
    setShowQrPanel(true);
    try {
      await start.mutateAsync(channel.id);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "No se pudo conectar con el bridge.");
    }
  };

  useEffect(() => {
    if (session.data?.status === "DISCONNECTED" && channel.status !== "DISCONNECTED") {
      void qc.invalidateQueries({ queryKey: webQrKeys.channels });
    }
  }, [session.data?.status, channel.status, qc]);

  useEffect(() => {
    if (autoRestoreAttempted || start.isPending || session.isFetching) return;
    const bridgeStatus = session.data?.status;
    // phoneNumber === "pending" significa que este canal nunca llegó a
    // conectarse (o se desvinculó por completo) — en ese caso no hay una
    // sesión real que "restaurar" tras un reinicio del bridge, así que no
    // debe arrancar un intento de conexión solo porque la pantalla admin
    // está abierta. El primer intento de un número nuevo debe venir de
    // pulsar "Generar código QR", nunca de un efecto automático.
    const staleDbSession =
      (channel.status === "CONNECTED" || channel.status === "INITIALIZING") &&
      channel.phoneNumber !== "pending";
    const needsRestore =
      staleDbSession &&
      (bridgeStatus === "DISCONNECTED" ||
        bridgeStatus === "INITIALIZING" ||
        bridgeStatus === "QR_PENDING" ||
        !bridgeStatus);
    if (needsRestore) {
      setAutoRestoreAttempted(true);
      setShowQrPanel(true);
      void handleConnect();
    }
  }, [
    autoRestoreAttempted,
    channel.status,
    session.data?.status,
    session.isFetching,
    start.isPending,
  ]);

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
    ? (session.data?.phoneNumber ?? (channel.phoneNumber !== "pending" ? channel.phoneNumber : null))
    : null;

  const busy = disconnect.isPending || remove.isPending || start.isPending;

  const statusText = isConnected
    ? "Sesión activa. Los mensajes entrantes aparecerán en Leads con prefijo webqr…"
    : isInitializing
      ? "Conectando con el bridge. El código QR estará listo en unos segundos…"
      : "Sin sesión activa. Genera un código QR para vincular esta línea.";

  return (
    <>
      <div className="border-b border-line last:border-b-0">
        <div className="flex flex-wrap items-center gap-3 px-4 py-4 lg:flex-nowrap lg:gap-4 lg:px-5">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-success-soft text-[#25D366]">
            <WhatsAppIcon className="size-6" />
          </div>

          <div className="min-w-[120px] shrink-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[14px] font-semibold text-ink">{channel.label}</p>
              <button
                type="button"
                disabled
                aria-label="Renombrar línea (próximamente)"
                title="Renombrar línea (próximamente)"
                className="grid size-6 place-items-center rounded-md text-muted opacity-40"
              >
                <Pencil className="size-3.5" />
              </button>
            </div>
            <p className="mt-0.5 text-[12px] text-muted">{formatPhone(connectedPhone)}</p>
          </div>

          <StatusBadge status={liveStatus} />
          <CarrierBadgeSelect channel={channel} />

          <p className="min-w-0 flex-1 truncate text-[12px] text-muted lg:text-[13px]">{statusText}</p>

          <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 lg:w-auto">
            {isConnected ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 border-danger/25 text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
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
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5 border-brand/20 text-brand hover:bg-brand-soft"
                onClick={() => void handleConnect()}
                disabled={busy}
              >
                {start.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <QrCode className="size-4" />
                )}
                {qr ? "Actualizar QR" : "Generar QR"}
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 border-danger/25 text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
              onClick={() => setConfirmDelete(true)}
              disabled={busy}
            >
              <Trash2 className="size-4" />
              Eliminar línea
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="size-9 shrink-0 px-0"
                  aria-label="Más opciones"
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isConnected ? (
                  <DropdownMenuItem onClick={() => setConfirmLogout(true)}>
                    <LogOut className="size-4" />
                    Cerrar sesión
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => void handleConnect()}>
                    <Smartphone className="size-4" />
                    {qr ? "Actualizar código QR" : "Generar código QR"}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem tone="danger" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="size-4" />
                  Eliminar línea
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {!isConnected && (showQrPanel || qr || isInitializing) ? (
          <div className="border-t border-line bg-canvas/50 px-4 py-4 lg:px-5">
            <div className="flex flex-col items-center gap-3">
              {qr ? (
                <>
                  <p className="text-center text-xs text-muted">
                    Escanea con WhatsApp → Dispositivos vinculados → Vincular dispositivo
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qr}
                    alt="Código QR WhatsApp Web"
                    className="size-48 rounded-lg bg-white p-2 shadow-sm"
                  />
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 py-4 text-muted">
                  <QrCode className="size-10 opacity-40" />
                  <p className="text-center text-xs">
                    {start.isPending || session.isFetching || isInitializing
                      ? "Conectando con el bridge… el QR aparecerá en unos segundos."
                      : "Pulsa «Generar QR» para mostrar el código."}
                  </p>
                </div>
              )}
              {localError || start.error ? (
                <p className="text-center text-xs text-danger-ink">
                  {localError ??
                    (start.error instanceof Error ? start.error.message : "Error al generar QR")}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {localError && isConnected ? (
          <p className="border-t border-line px-5 py-2 text-xs text-danger-ink">{localError}</p>
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
  const [newLineCarrier, setNewLineCarrier] = useState("wom");

  const handleAddLine = () => {
    create.mutate({ label: DEFAULT_LINE_LABEL, carrier: newLineCarrier });
  };

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

      <section className="rounded-card border border-line bg-card p-5 shadow-sm">
        <h2 className="text-[15px] font-semibold text-ink">Nueva línea WhatsApp Web</h2>
        <p className="mt-1 text-[13px] text-muted">
          Conecta una nueva línea móvil escaneando el código QR desde tu dispositivo.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Selecciona la línea a conectar (próximamente)"
            className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-input border border-line bg-card px-4 text-left text-[14px] text-muted opacity-80"
          >
            <QrCode className="size-[18px] shrink-0 text-brand" />
            <span className="truncate">Conectar nueva línea por QR</span>
          </button>
          <Select value={newLineCarrier} onValueChange={setNewLineCarrier}>
            <SelectTrigger className="h-11 w-full sm:w-[140px]" aria-label="Operador de la nueva línea">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="wom">WOM</SelectItem>
              <SelectItem value="claro">Claro</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            onClick={handleAddLine}
            disabled={!configured || create.isPending}
            className="h-11 shrink-0 gap-2 px-5 shadow-send"
          >
            {create.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <QrCode className="size-4" />
            )}
            {create.isPending ? "Creando…" : "Agregar línea"}
          </Button>
        </div>
      </section>

      <section className="overflow-hidden rounded-card border border-line bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Líneas conectadas</h2>
            <p className="mt-1 text-[13px] text-muted">
              Administra las líneas WhatsApp Web conectadas.
            </p>
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="h-10 w-full sm:w-[180px]" aria-label="Filtrar líneas">
              <SelectValue placeholder="Todas las líneas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las líneas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {channels.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-muted">
            Aún no hay líneas QR. Pulsa «Agregar línea» para crear una y generar el código.
          </p>
        ) : (
          <div>
            {channels.map((ch) => (
              <ChannelRow key={ch.id} channel={ch} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
