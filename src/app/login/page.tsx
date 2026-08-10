import type { Metadata } from "next";
import { LoginScreen } from "@/components/auth/login/login-screen";
import { LogoutCleanup } from "@/components/auth/logout-cleanup";

export const metadata: Metadata = {
  title: "Iniciar sesión — DuMo",
  description:
    "Accede a DuMo, la plataforma interna de gestión comercial de la organización.",
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string; signedOut?: string }>;
};

/** Login SSR: evita Suspense vacío que dejaba la pantalla en blanco sin JS. */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const sp = await searchParams;

  return (
    <>
      <LogoutCleanup signedOut={sp.signedOut === "1"} />
      <LoginScreen nextPath={sp.next ?? null} />
    </>
  );
}
