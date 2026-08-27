import { redirect } from "next/navigation";
import { requireAdministradorSession } from "@/lib/require-administrador";
import { WebQrConnectPanel } from "@/components/admin/web-qr/web-qr-connect-panel";

export default async function AdminWebQrPage() {
  const session = await requireAdministradorSession();
  if (!session) redirect("/admin");

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
      <header>
        <h1 className="text-xl font-semibold text-fg">WhatsApp Web (QR)</h1>
        <p className="mt-1 text-sm text-muted">
          Conecta líneas móviles escaneando un código QR.
        </p>
      </header>
      <WebQrConnectPanel />
    </div>
  );
}
