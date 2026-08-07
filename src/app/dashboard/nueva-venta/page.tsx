"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Las ventas se registran desde Leads — redirige enlaces antiguos. */
export default function NuevaVentaRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/leads");
  }, [router]);
  return null;
}
