"use client";

import { useState } from "react";
import {
  Building2,
  FileSpreadsheet,
  MessageCircle,
  Server,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Plus, Trash2 } from "lucide-react";
import type { SettingsSnapshot, SystemUser, UserRole } from "@/types/settings";
import { USER_ROLE_LABELS } from "@/types/settings";

function ConnectionBadge({ status }: { status: "connected" | "disconnected" | "error" }) {
  const labels = { connected: "Conectado", disconnected: "Desconectado", error: "Error" };
  const colors = {
    connected: "bg-success-soft text-success-ink",
    disconnected: "bg-canvas text-muted",
    error: "bg-danger-soft text-danger-ink",
  };
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", colors[status])}>
      {labels[status]}
    </span>
  );
}

export function SettingsSections({
  data,
  onSaveCompany,
  onSaveWhatsApp,
  onSaveGoogleSheets,
  onTestGoogleSheets,
  onToggleUser,
  onDeleteUser,
}: {
  data: SettingsSnapshot;
  onSaveCompany: (values: SettingsSnapshot["company"]) => void;
  onSaveWhatsApp: (values: SettingsSnapshot["whatsapp"]) => void;
  onSaveGoogleSheets: (values: SettingsSnapshot["googleSheets"]) => void;
  onTestGoogleSheets: () => void;
  onToggleUser: (id: string, active: boolean) => void;
  onDeleteUser: (id: string) => void;
}) {
  const [company, setCompany] = useState(data.company);
  const [whatsapp, setWhatsapp] = useState(data.whatsapp);
  const [sheets, setSheets] = useState(data.googleSheets);

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand"><Building2 className="size-5" /></span>
          <h3 className="text-[15px] font-semibold text-ink">Empresa</h3>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(["name", "address", "city", "phone", "email"] as const).map((k) => (
            <label key={k} className="block sm:col-span-1">
              <span className="text-[13px] capitalize text-muted">{k}</span>
              <input
                value={company[k]}
                onChange={(e) => setCompany({ ...company, [k]: e.target.value })}
                className="mt-1 h-11 w-full rounded-xl border border-line px-4 text-[14px]"
              />
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={() => onSaveCompany(company)}>Guardar empresa</Button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand"><MessageCircle className="size-5" /></span>
            <div>
              <h3 className="text-[15px] font-semibold text-ink">WhatsApp Cloud API</h3>
              <ConnectionBadge status={whatsapp.connectionStatus} />
            </div>
          </div>
          <p className="text-[12px] text-muted">
            Última sync: {whatsapp.lastSync ? new Date(whatsapp.lastSync).toLocaleString("es-CL") : "—"}
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(["businessId", "phoneNumberId", "accessToken", "verifyToken"] as const).map((k) => (
            <label key={k} className="block">
              <span className="text-[13px] text-muted">{k}</span>
              <input
                value={whatsapp[k]}
                onChange={(e) => setWhatsapp({ ...whatsapp, [k]: e.target.value })}
                className="mt-1 h-11 w-full rounded-xl border border-line px-4 text-[14px]"
              />
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={() => onSaveWhatsApp(whatsapp)}>Guardar WhatsApp</Button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand"><FileSpreadsheet className="size-5" /></span>
            <div>
              <h3 className="text-[15px] font-semibold text-ink">Google Sheets</h3>
              <ConnectionBadge status={sheets.connectionStatus} />
            </div>
          </div>
          <p className="text-[12px] text-muted">
            Última sync: {sheets.lastSync ? new Date(sheets.lastSync).toLocaleString("es-CL") : "—"}
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[13px] text-muted">Spreadsheet ID</span>
            <input value={sheets.spreadsheetId} onChange={(e) => setSheets({ ...sheets, spreadsheetId: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-line px-4 text-[14px]" />
          </label>
          <label className="block">
            <span className="text-[13px] text-muted">Nombre hoja</span>
            <input value={sheets.sheetName} onChange={(e) => setSheets({ ...sheets, sheetName: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-line px-4 text-[14px]" />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <Button size="sm" variant="secondary" onClick={onTestGoogleSheets}>Probar conexión</Button>
          <Button size="sm" onClick={() => onSaveGoogleSheets(sheets)}>Guardar Sheets</Button>
        </div>
      </Card>

      <UsersSection users={data.users} onToggle={onToggleUser} onDelete={onDeleteUser} />

      <SystemStatusCard system={data.system} logs={data.logs} />
    </div>
  );
}

function UsersSection({
  users,
  onToggle,
  onDelete,
}: {
  users: SystemUser[];
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand"><Users className="size-5" /></span>
          <h3 className="text-[15px] font-semibold text-ink">Usuarios</h3>
        </div>
        <Button size="sm" variant="secondary"><Plus className="size-4" /> Crear usuario</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-semibold">{u.name}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{USER_ROLE_LABELS[u.role as UserRole]}</TableCell>
              <TableCell>
                <button
                  type="button"
                  onClick={() => onToggle(u.id, !u.active)}
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                    u.active ? "bg-success-soft text-success-ink" : "bg-canvas text-muted",
                  )}
                >
                  {u.active ? "Activo" : "Inactivo"}
                </button>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="grid size-8 place-items-center rounded-lg hover:bg-canvas">
                      <MoreVertical className="size-4 text-muted" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Editar</DropdownMenuItem>
                    <DropdownMenuItem>Cambiar contraseña</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(u.id)} className="text-danger-ink">
                      <Trash2 className="size-4" /> Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function SystemStatusCard({
  system,
  logs,
}: {
  system: SettingsSnapshot["system"];
  logs: SettingsSnapshot["logs"];
}) {
  const statuses = [
    { label: "Versión", value: system.version },
    { label: "Google Sheets", value: system.googleSheetsStatus },
    { label: "WhatsApp", value: system.whatsappStatus },
    { label: "APIs", value: system.apisStatus },
    { label: "Último respaldo", value: system.lastBackup ? new Date(system.lastBackup).toLocaleString("es-CL") : "—" },
  ];

  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand"><Server className="size-5" /></span>
        <h3 className="text-[15px] font-semibold text-ink">Estado del sistema</h3>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {statuses.map((s) => (
          <div key={s.label} className="rounded-xl border border-line px-4 py-3">
            <p className="text-[12px] text-muted">{s.label}</p>
            <p className="mt-1 text-[14px] font-semibold text-ink">{String(s.value)}</p>
          </div>
        ))}
      </div>
      <div className="mt-5">
        <h4 className="text-[14px] font-semibold text-ink">Logs recientes</h4>
        <ul className="mt-3 space-y-2">
          {logs.map((l) => (
            <li key={l.id} className="flex items-start justify-between gap-4 rounded-xl bg-canvas px-4 py-2.5 text-[13px]">
              <span className={cn(l.level === "error" && "text-danger-ink", l.level === "warn" && "text-warning-ink")}>
                {l.message}
              </span>
              <span className="shrink-0 text-muted">{l.at}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
