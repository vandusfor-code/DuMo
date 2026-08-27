import "server-only";
import { graphVersion } from "@/server/whatsapp/credentials";
import { getInstagramIntegrationConfig } from "@/server/instagram/config";

/**
 * Instagram Business Login (el flujo nuevo, sin pasar por una Página de
 * Facebook) usa su propio host de Graph API — graph.instagram.com, no
 * graph.facebook.com — con un token de usuario de Instagram, no un Page
 * Access Token.
 */
const GRAPH = "https://graph.instagram.com";

export async function sendInstagramText(input: {
  igsid: string;
  text: string;
}): Promise<{ id: string }> {
  const config = await getInstagramIntegrationConfig();
  if (!config) {
    throw new Error(
      "Instagram no configurado. Define INSTAGRAM_USER_ID y INSTAGRAM_ACCESS_TOKEN en Vercel o en Admin → Configuración.",
    );
  }

  const version = graphVersion();
  const res = await fetch(`${GRAPH}/${version}/me/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: input.igsid },
      message: { text: input.text },
    }),
  });

  const json = (await res.json()) as {
    message_id?: string;
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(json.error?.message ?? "Error enviando mensaje por Instagram.");
  }

  return { id: json.message_id ?? `instagram-out-${Date.now()}` };
}

export async function sendInstagramAttachment(input: {
  igsid: string;
  type: "image" | "audio" | "video";
  url: string;
}): Promise<{ id: string }> {
  const config = await getInstagramIntegrationConfig();
  if (!config) {
    throw new Error(
      "Instagram no configurado. Define INSTAGRAM_USER_ID y INSTAGRAM_ACCESS_TOKEN en Vercel o en Admin → Configuración.",
    );
  }

  const version = graphVersion();
  const res = await fetch(`${GRAPH}/${version}/me/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: input.igsid },
      message: {
        attachment: {
          type: input.type,
          payload: { url: input.url, is_reusable: true },
        },
      },
    }),
  });

  const json = (await res.json()) as {
    message_id?: string;
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(json.error?.message ?? `Error enviando ${input.type} por Instagram.`);
  }

  return { id: json.message_id ?? `instagram-out-${Date.now()}` };
}

export async function fetchInstagramProfile(igsid: string): Promise<string> {
  const config = await getInstagramIntegrationConfig();
  if (!config) return "";

  const version = graphVersion();
  try {
    const res = await fetch(`${GRAPH}/${version}/${igsid}?fields=name,username`, {
      headers: { Authorization: `Bearer ${config.accessToken}` },
      cache: "no-store",
    });
    const json = (await res.json()) as { name?: string; username?: string };
    if (!res.ok) return "";
    return json.name?.trim() || json.username?.trim() || "";
  } catch {
    return "";
  }
}
