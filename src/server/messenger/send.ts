import "server-only";
import { graphVersion } from "@/server/whatsapp/credentials";
import { getMessengerIntegrationConfig } from "@/server/messenger/config";

const GRAPH = "https://graph.facebook.com";

export async function sendMessengerAttachment(input: {
  psid: string;
  type: "image" | "audio" | "video";
  url: string;
}): Promise<{ id: string }> {
  const config = await getMessengerIntegrationConfig();
  if (!config) {
    throw new Error(
      "Messenger no configurado. Define MESSENGER_PAGE_ID y MESSENGER_PAGE_ACCESS_TOKEN en Vercel o en Admin → Configuración.",
    );
  }

  const version = graphVersion();
  const res = await fetch(`${GRAPH}/${version}/me/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.pageAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: input.psid },
      messaging_type: "RESPONSE",
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
    throw new Error(json.error?.message ?? `Error enviando ${input.type} por Messenger.`);
  }

  return { id: json.message_id ?? `messenger-out-${Date.now()}` };
}

export async function sendMessengerText(input: {
  psid: string;
  text: string;
}): Promise<{ id: string }> {
  const config = await getMessengerIntegrationConfig();
  if (!config) {
    throw new Error(
      "Messenger no configurado. Define MESSENGER_PAGE_ID y MESSENGER_PAGE_ACCESS_TOKEN en Vercel o en Admin → Configuración.",
    );
  }

  const version = graphVersion();
  const res = await fetch(`${GRAPH}/${version}/me/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.pageAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: input.psid },
      messaging_type: "RESPONSE",
      message: { text: input.text },
    }),
  });

  const json = (await res.json()) as {
    message_id?: string;
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(json.error?.message ?? "Error enviando mensaje por Messenger.");
  }

  return { id: json.message_id ?? `messenger-out-${Date.now()}` };
}

export async function fetchMessengerProfile(psid: string): Promise<string> {
  const config = await getMessengerIntegrationConfig();
  if (!config) return "";

  const version = graphVersion();
  try {
    const res = await fetch(
      `${GRAPH}/${version}/${psid}?fields=first_name,last_name,name`,
      {
        headers: { Authorization: `Bearer ${config.pageAccessToken}` },
        cache: "no-store",
      },
    );
    const json = (await res.json()) as {
      name?: string;
      first_name?: string;
      last_name?: string;
    };
    if (!res.ok) return "";
    return json.name?.trim() || [json.first_name, json.last_name].filter(Boolean).join(" ").trim();
  } catch {
    return "";
  }
}
