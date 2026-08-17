import "server-only";

export interface CampaignSendParams {
  conversationId: string;
  phone: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface CampaignSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Abstracción de proveedor de mensajería — el motor de campañas nunca sabe
 * si el envío ocurrió por Cloud API, un bridge, o cualquier integración
 * futura. Conectar un proveedor real es solo implementar esta interfaz.
 */
export interface MessageProvider {
  readonly name: string;
  validateConnection(): Promise<boolean>;
  sendMessage(params: CampaignSendParams): Promise<CampaignSendResult>;
}

const registry = new Map<string, () => MessageProvider>();

export function registerMessageProvider(name: string, factory: () => MessageProvider): void {
  registry.set(name, factory);
}

export function getMessageProvider(name: string): MessageProvider {
  const factory = registry.get(name);
  if (!factory) throw new Error(`Proveedor de mensajería "${name}" no está registrado.`);
  return factory();
}

export function listRegisteredProviders(): string[] {
  return [...registry.keys()];
}
