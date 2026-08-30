"use client";

import { Logo } from "@/components/layout/logo";
import { DUMO_URL } from "@/lib/verificador/config";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function VerificadorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-[#0f172a]">
      <header className="sticky top-0 z-20 border-b border-[#e8edf3] bg-white">
        <div className="mx-auto flex h-[60px] max-w-[1680px] items-center justify-between gap-4 px-4 sm:px-8 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <Logo className="shrink-0" />
            <span className="hidden h-5 w-px bg-[#dbe3ef] sm:block" aria-hidden />
            <span className="truncate text-sm font-medium text-[#64748b] sm:text-[15px]">
              Verificador de Numeración
            </span>
          </div>
          {DUMO_URL ? (
            <Link
              href={DUMO_URL}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#2563eb] px-3 py-2 text-sm font-medium text-[#2563eb] transition hover:bg-[#eff6ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Volver a DuMo
            </Link>
          ) : (
            <span
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm font-medium text-[#94a3b8]"
              title="Configure NEXT_PUBLIC_DUMO_URL para habilitar el enlace"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Volver a DuMo
            </span>
          )}
        </div>
      </header>
      {children}
    </div>
  );
}
