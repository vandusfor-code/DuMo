import { NextResponse, type NextRequest } from "next/server";
import { ensureSchema, getSql } from "@/server/db/client";
import {
  defaultPhoneNumberId,
  hasGlobalWhatsAppToken,
  probePhoneNumberAccess,
  resolveSendCredentials,
} from "@/server/whatsapp/credentials";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Diagnóstico de envío WhatsApp. No expone tokens — solo si están configurados
 * y si Meta permite acceder al phone_number_id.
 */
export async function GET(request: NextRequest) {
  const phoneNumberId =
    request.nextUrl.searchParams.get("phoneNumberId")?.trim() ||
    defaultPhoneNumberId() ||
    "";

  let perNumberToken: string | null = null;
  if (phoneNumberId && getSql()) {
    await ensureSchema();
    const rows = (await getSql()!`
      SELECT access_token FROM connected_numbers WHERE phone_number_id = ${phoneNumberId}
    `) as unknown as { access_token: string | null }[];
    perNumberToken = rows[0]?.access_token?.trim() || null;
  }

  const creds = phoneNumberId
    ? resolveSendCredentials(phoneNumberId, perNumberToken)
    : { error: "Falta phoneNumberId (query param o WHATSAPP_PHONE_NUMBER_ID)." };

  const base = {
    phoneNumberId: phoneNumberId || null,
    globalTokenConfigured: hasGlobalWhatsAppToken(),
    defaultPhoneNumberId: defaultPhoneNumberId(),
    perNumberTokenConfigured: Boolean(perNumberToken),
    canSend: !("error" in creds),
    tokenSource: "error" in creds ? null : creds.tokenSource,
    configError: "error" in creds ? creds.error : null,
  };

  if ("error" in creds) {
    return NextResponse.json({ ok: false, ...base });
  }

  const probe = await probePhoneNumberAccess(creds.token, creds.phoneNumberId);
  return NextResponse.json({
    ok: probe.ok,
    ...base,
    meta: probe.ok
      ? { displayPhone: probe.displayPhone, verifiedName: probe.verifiedName }
      : { error: probe.error },
  });
}
