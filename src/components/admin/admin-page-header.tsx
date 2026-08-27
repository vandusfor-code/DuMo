"use client";

import { Bell, Calendar, ChevronDown } from "lucide-react";
import { PhotoAvatar, InitialsAvatar } from "@/components/ui/avatar";
import { getInitials } from "@/lib/format";
import { businessDateISO, formatBusinessDateLabel } from "@/lib/date";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useUnreadMessageCount } from "@/hooks/use-unread-messages";

function todayLabel(): string {
  return formatBusinessDateLabel(businessDateISO());
}

/** Cabecera del área admin: título/subtítulo + fecha, campana y usuario admin. */
export function AdminPageHeader({
  title,
  subtitle,
  selectedDate,
  onDateChange,
}: {
  title: string;
  subtitle?: string;
  /** yyyy-mm-dd — habilita selector de fecha operativa. */
  selectedDate?: string;
  onDateChange?: (dateIso: string) => void;
}) {
  const { data: user } = useCurrentUser();
  const unread = useUnreadMessageCount("admin");
  const name = user?.name ?? "Administrador";
  const role = user?.role ?? "Admin";

  return (
    <div className="flex flex-col gap-4 py-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-[15px] text-muted">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {onDateChange ? (
          <label className="relative inline-flex h-11 cursor-pointer items-center gap-2.5 rounded-2xl border border-line bg-card px-4 text-[14px] font-medium text-ink transition-colors hover:bg-canvas">
            <Calendar className="size-[18px] text-muted" />
            <span>{formatBusinessDateLabel(selectedDate ?? businessDateISO())}</span>
            <ChevronDown className="size-4 text-muted" />
            <input
              type="date"
              value={selectedDate ?? businessDateISO()}
              max={businessDateISO()}
              onChange={(e) => {
                if (e.target.value) onDateChange(e.target.value);
              }}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Seleccionar fecha operativa"
            />
          </label>
        ) : (
          <button
            type="button"
            className="inline-flex h-11 items-center gap-2.5 rounded-2xl border border-line bg-card px-4 text-[14px] font-medium text-ink transition-colors hover:bg-canvas"
          >
            <Calendar className="size-[18px] text-muted" />
            {todayLabel()}
            <ChevronDown className="size-4 text-muted" />
          </button>
        )}

        <button
          type="button"
          aria-label="Notificaciones"
          className="relative grid size-11 place-items-center rounded-full text-muted transition-colors hover:bg-brand-soft hover:text-brand"
        >
          <Bell className="size-[21px]" />
          {unread > 0 ? (
            <span className="absolute right-2 top-2 grid size-[18px] min-w-[18px] place-items-center rounded-full border-2 border-canvas bg-brand px-0.5 text-[10px] font-semibold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>

        <div className="flex items-center gap-2.5 border-l border-line pl-3">
          {user?.avatarUrl ? (
            <PhotoAvatar src={user.avatarUrl} alt={name} />
          ) : (
            <InitialsAvatar initials={getInitials(name)} />
          )}
          <div className="hidden leading-tight sm:block">
            <p className="text-[14px] font-semibold text-ink">{name}</p>
            <p className="text-[12px] text-muted">{role}</p>
          </div>
          <ChevronDown className="size-4 text-muted" />
        </div>
      </div>
    </div>
  );
}
