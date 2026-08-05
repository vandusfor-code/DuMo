"use client";

import { LoginBackground } from "./login-background";
import { LoginFormPanel } from "./login-form-panel";
import { LoginHeroPanel } from "./login-hero-panel";

export function LoginScreen() {
  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-x-hidden bg-[#FAFAFC] lg:h-dvh lg:overflow-hidden">
      <LoginBackground />

      <div className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-1 flex-col p-12">
        <div className="grid flex-1 grid-cols-1 items-center gap-12 lg:grid-cols-[45fr_55fr] lg:gap-20">
          <div className="order-1 block md:hidden lg:block">
            <LoginHeroPanel />
          </div>
          <div className="order-2 md:col-span-1 lg:order-none">
            <LoginFormPanel />
          </div>
        </div>
      </div>

      <footer className="relative z-10 shrink-0 pb-8 text-center text-[13px] text-[#6B7280]">
        © 2026 DuMo. Todos los derechos reservados.
      </footer>
    </div>
  );
}
