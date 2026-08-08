import { redirect } from "next/navigation";
import { requireAdministradorSession } from "@/lib/require-administrador";
import { WebQrConnectPanel } from "@/components/admin/web-qr/web-qr-connect-panel";
import { WebQrCutoverChecklist } from "@/components/admin/web-qr/web-qr-cutover-checklist";

export default async function AdminWebQrPage() {
  const session = await requireAdministradorSession();
  if (!session) redirect("/admin");

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      <header>
        <h1 className="text-xl font-semibold text-fg">WhatsApp Web (QR)</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Módulo alternativo para conectar líneas móviles escaneando un código QR. Aislado de la
          API Cloud (WABA) — solo visible para administradores. Ideal para campañas de Meta Ads sin
          restricciones de la API comercial.
        </p>
      </header>
      <WebQrCutoverChecklist />
      <WebQrConnectPanel />
    </div>
  );
}
