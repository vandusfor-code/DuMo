import "server-only";

const GRAPH = "https://graph.facebook.com";

export function graphVersion(): string {
  return process.env.WHATSAPP_GRAPH_VERSION ?? process.env.META_GRAPH_VERSION ?? "v21.0";
}

/** Indica si hay un token global configurado (sin exponer su valor). */
export function hasGlobalWhatsAppToken(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN?.trim());
}

/** Indica si hay un phone_number_id por defecto configurado. */
export function defaultPhoneNumberId(): string | null {
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  return id || null;
}

type MetaPhoneProbe = {
  ok: boolean;
  displayPhone?: string;
  verifiedName?: string;
  error?: string;
};

/** Comprueba si un token puede acceder al phone_number_id en Meta. */
export async function probePhoneNumberAccess(
  token: string,
  phoneNumberId: string,
): Promise<MetaPhoneProbe> {
  const version = graphVersion();
  try {
    const res = await fetch(
      `${GRAPH}/${version}/${phoneNumberId}?fields=display_phone_number,verified_name`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
    const json = (await res.json()) as {
      display_phone_number?: string;
      verified_name?: string;
      error?: { message?: string };
    };
    if (!res.ok) {
      return { ok: false, error: json.error?.message ?? `Meta respondió ${res.status}` };
    }
    return {
      ok: true,
      displayPhone: json.display_phone_number,
      verifiedName: json.verified_name,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export type SendCredentials = {
  token: string;
  phoneNumberId: string;
  tokenSource: "connected_number" | "env";
};

/** Resuelve token + phone_number_id para enviar un mensaje. */
export function resolveSendCredentials(
  phoneNumberId: string,
  perNumberToken: string | null,
): SendCredentials | { error: string } {
  const token = perNumberToken?.trim() || process.env.WHATSAPP_TOKEN?.trim();
  if (!token) {
    return {
      error:
        "Falta token de WhatsApp. Configura WHATSAPP_TOKEN en Vercel o registra el número con accessToken.",
    };
  }
  if (!phoneNumberId) {
    return { error: "Falta phone_number_id para enviar (WHATSAPP_PHONE_NUMBER_ID)." };
  }
  return {
    token,
    phoneNumberId,
    tokenSource: perNumberToken?.trim() ? "connected_number" : "env",
  };
}
