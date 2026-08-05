"use client";

import { Bell, Calendar, ChevronDown } from "lucide-react";
import { PhotoAvatar } from "@/components/ui/avatar";

const ADMIN = {
  name: "Administrador",
  role: "Admin",
  avatarUrl:
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=3&w=160&h=160&q=80",
};

function todayLabel(): string {
  const now = new Date();
  const month = new Intl.DateTimeFormat("es-CL", { month: "long" }).format(now);
  const dd = String(now.getDate()).padStart(2, "0");
  return `${dd} de ${month}, ${now.getFullYear()}`;
}

/** Cabecera del área admin: título/subtítulo + fecha, campana y usuario admin. */
export function AdminPageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col gap-4 py-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-[15px] text-muted">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="inline-flex h-11 items-center gap-2.5 rounded-2xl border border-line bg-card px-4 text-[14px] font-medium text-ink transition-colors hover:bg-canvas"
        >
          <Calendar className="size-[18px] text-muted" />
          {todayLabel()}
          <ChevronDown className="size-4 text-muted" />
        </button>

        <button
          type="button"
          aria-label="Notificaciones"
          className="relative grid size-11 place-items-center rounded-full text-muted transition-colors hover:bg-brand-soft hover:text-brand"
        >
          <Bell className="size-[21px]" />
          <span className="absolute right-2 top-2 grid size-[18px] place-items-center rounded-full border-2 border-canvas bg-brand text-[10px] font-semibold text-white">
            3
          </span>
        </button>

        <div className="flex items-center gap-2.5 border-l border-line pl-3">
          <PhotoAvatar src={ADMIN.avatarUrl} alt={ADMIN.name} />
          <div className="hidden leading-tight sm:block">
            <p className="text-[14px] font-semibold text-ink">{ADMIN.name}</p>
            <p className="text-[12px] text-muted">{ADMIN.role}</p>
          </div>
          <ChevronDown className="size-4 text-muted" />
        </div>
      </div>
    </div>
  );
}
