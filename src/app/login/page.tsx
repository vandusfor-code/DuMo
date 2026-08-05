import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginScreen } from "@/components/auth/login/login-screen";

export const metadata: Metadata = {
  title: "Iniciar sesión — DuMo",
  description:
    "Accede a DuMo, la plataforma interna de gestión comercial de la organización.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  );
}
