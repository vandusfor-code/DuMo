import "server-only";
import { graphVersion } from "@/server/whatsapp/credentials";

const GRAPH = "https://graph.facebook.com";

export type WhatsAppMediaDownload = {
  data: Buffer;
  mimeType: string;
  fileName?: string;
};

/** Descarga un archivo multimedia de WhatsApp Cloud API (Meta Graph). */
export async function downloadWhatsAppMedia(input: {
  mediaId: string;
  token: string;
}): Promise<WhatsAppMediaDownload> {
  const version = graphVersion();
  const metaRes = await fetch(`${GRAPH}/${version}/${input.mediaId}`, {
    headers: { Authorization: `Bearer ${input.token}` },
    cache: "no-store",
  });
  const meta = (await metaRes.json()) as {
    url?: string;
    mime_type?: string;
    file_size?: number;
    sha256?: string;
    error?: { message?: string };
  };
  if (!metaRes.ok || !meta.url) {
    throw new Error(meta.error?.message ?? "No se pudo obtener la URL del archivo en Meta.");
  }

  const fileRes = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${input.token}` },
    cache: "no-store",
  });
  if (!fileRes.ok) {
    throw new Error(`No se pudo descargar el archivo (${fileRes.status}).`);
  }

  const mimeType =
    meta.mime_type ?? fileRes.headers.get("content-type") ?? "application/octet-stream";
  const data = Buffer.from(await fileRes.arrayBuffer());
  const ext = mimeType.split("/")[1]?.split(";")[0] ?? "bin";

  return {
    data,
    mimeType,
    fileName: `wa-${input.mediaId}.${ext}`,
  };
}
