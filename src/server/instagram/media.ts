import "server-only";
import { getInstagramIntegrationConfig } from "@/server/instagram/config";

export async function downloadInstagramAttachment(url: string): Promise<{
  data: Buffer;
  mimeType: string;
}> {
  const config = await getInstagramIntegrationConfig();
  if (!config) {
    throw new Error("Instagram no configurado.");
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${config.accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`No se pudo descargar adjunto Instagram (${res.status}).`);
  }

  const mimeType =
    res.headers.get("content-type")?.split(";")[0]?.trim() || "application/octet-stream";
  const data = Buffer.from(await res.arrayBuffer());
  if (data.length <= 0) {
    throw new Error("Adjunto Instagram vacío.");
  }
  return { data, mimeType };
}
