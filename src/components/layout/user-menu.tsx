"use client";

import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import { PhotoAvatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CURRENT_USER } from "@/lib/session";

export function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex items-center gap-3 rounded-full py-1 pl-1 pr-2 outline-none transition-colors hover:bg-brand-soft/60 focus-visible:ring-2 focus-visible:ring-brand/30">
        <PhotoAvatar src={CURRENT_USER.avatarUrl} alt={CURRENT_USER.name} />
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-[14px] font-semibold text-ink">
            {CURRENT_USER.name}
          </span>
          <span className="block text-[12px] text-muted">{CURRENT_USER.role}</span>
        </span>
        <ChevronDown className="size-4 text-muted transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[200px]">
        <DropdownMenuItem>
          <User /> Perfil
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings /> Configuración
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem tone="danger">
          <LogOut /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
