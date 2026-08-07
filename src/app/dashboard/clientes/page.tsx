"use client";

import { ClientsPortfolio } from "@/components/clients/clients-portfolio";
import { useCrmClients } from "@/hooks/use-crm-clients";

export default function ClientesPage() {
  const { data, isLoading } = useCrmClients();

  return <ClientsPortfolio clients={data ?? []} isLoading={isLoading} />;
}
