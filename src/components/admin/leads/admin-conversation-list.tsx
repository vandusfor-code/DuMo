"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, Download, SlidersHorizontal, SquarePen, Tags, UserRound, Zap } from "lucide-react";
import { LeadsExportDialog } from "./leads-export-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConversationSearch } from "@/components/leads/conversation-search";
import { ConversationAvatarItem } from "@/components/leads/conversation-avatar-item";
import { ManualMessageModal } from "@/components/leads/manual-message-modal";
import type { AdminAdvisor, AdminConversation, AdminLeadFilter } from "@/types/admin-lead";
import type { Conversation } from "@/types/conversation";
import { AdminConversationFilters } from "./admin-conversation-filters";
import { AdminConversationItem } from "./admin-conversation-item";
import { cn } from "@/lib/utils";

function ToggleSwitch({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors",
        on ? "bg-brand" : "bg-line",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform",
          on ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </span>
  );
}

function toConversation(c: AdminConversation): Conversation {
  return {
    id: c.id,
    customerName: c.customerName,
    phone: c.phone,
    rut: c.rut,
    channel: c.channel,
    isManualOrigin: c.isManualOrigin,
    lastMessage: c.lastMessage,
    lastMessageTime: c.lastMessageTime,
    unread: c.unread,
    status: "in_progress",
    online: c.online,
  };
}

export function AdminConversationList({
  conversations,
  advisors,
  isLoading,
  selectedId,
  autoAssignEnabled,
  autoAssignLoading,
  slaAutoReassignEnabled,
  slaAutoReassignLoading,
  onSelect,
  onAssign,
  onToggleAutoAssign,
  onToggleSlaAutoReassign,
  collapsed = false,
  onCollapsedChange,
}: {
  conversations: AdminConversation[];
  advisors: AdminAdvisor[];
  isLoading: boolean;
  selectedId: string | null;
  autoAssignEnabled: boolean;
  autoAssignLoading?: boolean;
  slaAutoReassignEnabled: boolean;
  slaAutoReassignLoading?: boolean;
  onSelect: (id: string) => void;
  onAssign: (conversationId: string, advisorId: string) => void;
  onToggleAutoAssign: (enabled: boolean) => void;
  onToggleSlaAutoReassign: (enabled: boolean) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AdminLeadFilter>("all");
  const [advisorFilter, setAdvisorFilter] = useState<string>("all");
  const [tipificationFilter, setTipificationFilter] = useState<string>("all");
  const [exportOpen, setExportOpen] = useState(false);
  const [manualMessageOpen, setManualMessageOpen] = useState(false);

  const tipificationOptions = useMemo(() => {
    const bySlug = new Map<string, string>();
    for (const c of conversations) {
      const tip = c.latestTipification;
      if (!tip?.slug) continue;
      if (!bySlug.has(tip.slug)) bySlug.set(tip.slug, tip.name);
    }
    return [...bySlug.entries()]
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [conversations]);

  const scoped = useMemo(() => {
    return conversations.filter((c) => {
      const matchesAdvisor =
        advisorFilter === "all" ||
        (advisorFilter === "unassigned"
          ? !c.assignedAdvisor
          : c.assignedAdvisor?.id === advisorFilter);
      const slug = c.latestTipification?.slug;
      const matchesTip =
        tipificationFilter === "all" ||
        (tipificationFilter === "none" ? !slug : slug === tipificationFilter);
      return matchesAdvisor && matchesTip;
    });
  }, [conversations, advisorFilter, tipificationFilter]);

  const counts = useMemo(() => {
    const base: Record<AdminLeadFilter, number> = {
      all: scoped.length,
      nuevo: 0,
      asignado: 0,
      contactado: 0,
      negociacion: 0,
      convertido: 0,
      perdido: 0,
    };
    for (const c of scoped) base[c.status] += 1;
    return base;
  }, [scoped]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scoped.filter((c) => {
      const matchesFilter = filter === "all" || c.status === filter;
      const matchesSearch =
        !q ||
        c.customerName.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.lastMessage.toLowerCase().includes(q) ||
        (c.assignedAdvisor?.name.toLowerCase().includes(q) ?? false);
      return matchesFilter && matchesSearch;
    });
  }, [scoped, search, filter]);

  const listBody = isLoading ? (
    collapsed ? (
      <div className="flex flex-col items-center gap-3 py-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="size-11 rounded-full" />
        ))}
      </div>
    ) : (
      Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3.5 py-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-44" />
          </div>
        </div>
      ))
    )
  ) : filtered.length === 0 ? (
    !collapsed ? (
      <p className="px-4 py-8 text-center text-[13px] text-muted">No hay conversaciones.</p>
    ) : null
  ) : collapsed ? (
    filtered.map((c) => (
      <ConversationAvatarItem
        key={c.id}
        conversation={toConversation(c)}
        active={c.id === selectedId}
        onClick={() => onSelect(c.id)}
      />
    ))
  ) : (
    filtered.map((c) => (
      <AdminConversationItem
        key={c.id}
        conversation={c}
        active={c.id === selectedId}
        advisors={advisors}
        onSelect={() => onSelect(c.id)}
        onAssign={(advisorId) => onAssign(c.id, advisorId)}
      />
    ))
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!collapsed ? (
        <div className="space-y-4 border-b border-line px-5 pb-4 pt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-semibold leading-[1.45] text-ink">Conversaciones</h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Exportar leads por fecha"
                title="Exportar leads por fecha"
                onClick={() => setExportOpen(true)}
                className="grid size-9 place-items-center rounded-btn text-muted transition-colors hover:bg-canvas hover:text-ink"
              >
                <Download className="size-[18px]" />
              </button>
              <button
                type="button"
                aria-label="Nueva conversación"
                title="Nueva conversación"
                onClick={() => setManualMessageOpen(true)}
                className="grid size-9 place-items-center rounded-btn bg-brand text-white transition-colors hover:bg-brand-hover"
              >
                <SquarePen className="size-[18px]" />
              </button>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={autoAssignLoading || slaAutoReassignLoading}
              className="flex w-full items-center justify-between rounded-xl border border-line bg-canvas px-3 py-2 text-left transition-colors hover:bg-card"
            >
              <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                <SlidersHorizontal className="size-4 text-muted" />
                Automatizaciones
                {autoAssignEnabled || slaAutoReassignEnabled ? (
                  <span className="rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                    {[autoAssignEnabled, slaAutoReassignEnabled].filter(Boolean).length}
                  </span>
                ) : null}
              </span>
              <ChevronDown className="size-4 text-muted" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[300px]">
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  onToggleAutoAssign(!autoAssignEnabled);
                }}
                className="flex-col items-stretch gap-0.5"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Zap className="size-4" />
                    Asignación automática
                  </span>
                  <ToggleSwitch on={autoAssignEnabled} />
                </span>
                <span className="pl-[26px] text-[11px] font-normal text-muted">
                  {autoAssignEnabled
                    ? "Activa — nuevos chats van a asesoras conectadas"
                    : "Inactiva — asignación manual"}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  onToggleSlaAutoReassign(!slaAutoReassignEnabled);
                }}
                className="flex-col items-stretch gap-0.5"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="size-4" />
                    Alerta de respuesta automática
                  </span>
                  <ToggleSwitch on={slaAutoReassignEnabled} />
                </span>
                <span className="pl-[26px] text-[11px] font-normal text-muted">
                  {slaAutoReassignEnabled
                    ? "Activa — avisa y reasigna chats sin responder"
                    : "Inactiva — sin avisos ni reasignación automática"}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ConversationSearch value={search} onChange={setSearch} />

          <div className="grid grid-cols-2 gap-2">
            <Select value={advisorFilter} onValueChange={setAdvisorFilter}>
              <SelectTrigger
                aria-label="Filtrar por asesora"
                className="h-auto min-w-0 rounded-xl border-line bg-canvas px-2.5 py-2 text-[13px] font-semibold"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <UserRound className="size-4 shrink-0 text-muted" />
                  <span className="min-w-0 truncate">
                    <SelectValue placeholder="Asesoras" />
                  </span>
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las asesoras</SelectItem>
                <SelectItem value="unassigned">Sin asignar</SelectItem>
                {advisors.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={tipificationFilter} onValueChange={setTipificationFilter}>
              <SelectTrigger
                aria-label="Filtrar por tipificación"
                className="h-auto min-w-0 rounded-xl border-line bg-canvas px-2.5 py-2 text-[13px] font-semibold"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <Tags className="size-4 shrink-0 text-muted" />
                  <span className="min-w-0 truncate">
                    <SelectValue placeholder="Tipificaciones" />
                  </span>
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las tipificaciones</SelectItem>
                <SelectItem value="none">Sin tipificar</SelectItem>
                {tipificationOptions.map((t) => (
                  <SelectItem key={t.slug} value={t.slug}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AdminConversationFilters value={filter} onChange={setFilter} counts={counts} />
        </div>
      ) : null}

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-y-contain",
          collapsed ? "space-y-3 px-2 py-3" : "space-y-1 p-3",
        )}
      >
        {listBody}
      </div>

      {onCollapsedChange ? (
        <div className="shrink-0 border-t border-line bg-hover/50 px-2 py-2">
          <button
            type="button"
            onClick={() => onCollapsedChange(!collapsed)}
            aria-label={collapsed ? "Expandir conversaciones" : "Recoger conversaciones"}
            aria-expanded={!collapsed}
            className="flex w-full items-center justify-center rounded-btn py-2 text-muted transition-colors duration-200 hover:bg-hover hover:text-ink"
          >
            {collapsed ? (
              <ChevronRight className="size-[18px]" />
            ) : (
              <ChevronLeft className="size-[18px]" />
            )}
          </button>
        </div>
      ) : null}

      {exportOpen ? <LeadsExportDialog onClose={() => setExportOpen(false)} /> : null}
      <ManualMessageModal
        open={manualMessageOpen}
        onClose={() => setManualMessageOpen(false)}
        onSent={(conversationId) => onSelect(conversationId)}
      />
    </div>
  );
}
