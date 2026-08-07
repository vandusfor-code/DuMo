"use client";

import { ClientsPortfolio } from "@/components/clients/clients-portfolio";
import { useAdminCrmClients } from "@/hooks/use-crm-clients";

export default function AdminClientesPage() {
  const { data, isLoading } = useAdminCrmClients();

  return <ClientsPortfolio clients={data ?? []} showAdvisor leadsHref="/admin/leads" isLoading={isLoading} />;
}
