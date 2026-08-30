import type { Metadata } from "next";
import { VerificadorApp } from "@/components/verificador/verificador-app";

export const metadata: Metadata = {
  title: "DuMo — Verificador de Numeración Chile",
  description:
    "Consulta números de Chile utilizando la base oficial de numeración de SUBTEL.",
};

export default function VerificadorPage() {
  return <VerificadorApp />;
}
