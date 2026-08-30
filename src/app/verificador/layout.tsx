"use client";

import { Logo } from "@/components/layout/logo";
import { DUMO_URL } from "@/lib/verificador/config";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function VerificadorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-[#f8fafc] text-[#0f172a]">
      <header className="sticky top-0 z-20 w-full border-b border-[#e5e7eb] bg-white">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-4 px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <Logo className="origin-left shrink-0 scale-[0.88]" />
            <span className="hidden h-4 w-px bg-[#cbd5e1] sm:block" aria-hidden />
            <span className="truncate text-sm font-medium text-[#64748b]">
              Verificador de Numeración
            </span>
          </div>
          {DUMO_URL ? (
            <Link
              href={DUMO_URL}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#2563eb] px-3 py-1.5 text-sm font-medium text-[#2563eb] transition hover:bg-[#eff6ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]"
            >
              <ArrowLeft className="size-3.5" aria-hidden />
              Volver a DuMo
            </Link>
          ) : (
            <span
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#cbd5e1] px-3 py-1.5 text-sm font-medium text-[#94a3b8]"
              title="Configure NEXT_PUBLIC_DUMO_URL para habilitar el enlace"
            >
              <ArrowLeft className="size-3.5" aria-hidden />
              Volver a DuMo
            </span>
          )}
        </div>
      </header>
      {children}
    </div>
  );
}
