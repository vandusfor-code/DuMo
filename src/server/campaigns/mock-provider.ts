import "server-only";
import {
  registerMessageProvider,
  type CampaignSendParams,
  type CampaignSendResult,
  type MessageProvider,
} from "@/server/campaigns/message-provider";

/** Tasa de fallo simulada — permite probar manejo de errores/risk controller sin depender del azar real. */
const MOCK_FAILURE_RATE = Number(process.env.CAMPAIGNS_MOCK_FAILURE_RATE ?? 0.05);
const MOCK_MIN_LATENCY_MS = 150;
const MOCK_MAX_LATENCY_MS = 600;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Proveedor de prueba — NO toca infraestructura real de WhatsApp. Simula
 * latencia y una tasa de fallo baja para poder probar de punta a punta
 * (cola, worker, risk controller, pausas) antes de conectar un canal real.
 */
class MockMessageProvider implements MessageProvider {
  readonly name = "mock";

  async validateConnection(): Promise<boolean> {
    return true;
  }

  async sendMessage(params: CampaignSendParams): Promise<CampaignSendResult> {
    const latency = MOCK_MIN_LATENCY_MS + Math.random() * (MOCK_MAX_LATENCY_MS - MOCK_MIN_LATENCY_MS);
    await sleep(latency);

    if (!params.phone || !params.message.trim()) {
      return { success: false, error: "Datos de envío incompletos (teléfono o mensaje vacío)." };
    }

    if (Math.random() < MOCK_FAILURE_RATE) {
      return { success: false, error: "Fallo simulado por MockMessageProvider." };
    }

    return { success: true, messageId: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
  }
}

registerMessageProvider("mock", () => new MockMessageProvider());
