export interface WidgetConfig {
  customerFacingName: string;
  consentRequestText: string;
  consentDeniedText: string;
  neutralFallbackText: string;
  brand: string;
}

export interface ChatResponse {
  turn_id: string;
  conversation_id: string;
  text: string;
  early_exit_reason: string | null;
  latency_ms: number;
  handoff_triggered: boolean;
}

export function createApiClient(apiBaseUrl: string) {
  async function fetchWidgetConfig(brand: string): Promise<WidgetConfig> {
    const res = await fetch(`${apiBaseUrl}/widget/config?brand=${encodeURIComponent(brand)}`);
    if (!res.ok) throw new Error('Failed to fetch widget config');
    return res.json();
  }

  async function sendMessage(conversationId: string, brand: string, message: string): Promise<ChatResponse> {
    const res = await fetch(`${apiBaseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: conversationId, brand, message }),
    });
    if (!res.ok) throw new Error('Failed to send message');
    return res.json();
  }

  return { fetchWidgetConfig, sendMessage };
}

export type ApiClient = ReturnType<typeof createApiClient>;
