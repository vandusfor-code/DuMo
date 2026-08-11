import "server-only";
import { getMessengerIntegrationConfig } from "@/server/messenger/config";

export async function downloadMessengerAttachment(url: string): Promise<{
  data: Buffer;
  mimeType: string;
}> {
  const config = await getMessengerIntegrationConfig();
  if (!config) {
    throw new Error("Messenger no configurado.");
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${config.pageAccessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`No se pudo descargar adjunto Messenger (${res.status}).`);
  }

  const mimeType =
    res.headers.get("content-type")?.split(";")[0]?.trim() || "application/octet-stream";
  const data = Buffer.from(await res.arrayBuffer());
  if (data.length <= 0) {
    throw new Error("Adjunto Messenger vacío.");
  }
  return { data, mimeType };
}
