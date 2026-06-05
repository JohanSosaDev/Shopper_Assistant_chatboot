import { createWidgetStateManager, createInitialState } from './core/widget-state.js';
import { createEventBus } from './core/event-bus.js';
import { createApiClient } from './core/api-client.js';
import { createWidgetRoot, type WidgetRootConfig } from './components/widget-root.js';

export interface HermesWidgetOptions {
  apiBaseUrl: string;
  brand: string;
  primaryColor: string;
  onPrimaryColor: string;
  containerSelector?: string;
}

export function init(options: HermesWidgetOptions): void {
  const conversationId = crypto.randomUUID();
  const state = createWidgetStateManager(createInitialState(conversationId));
  const bus = createEventBus();
  const apiClient = createApiClient(options.apiBaseUrl);

  const rootConfig: WidgetRootConfig = {
    apiBaseUrl: options.apiBaseUrl,
    brand: options.brand,
    primaryColor: options.primaryColor,
    onPrimaryColor: options.onPrimaryColor,
    conversationId,
  };

  const root = createWidgetRoot(rootConfig, state, bus, apiClient);

  const container = options.containerSelector
    ? document.querySelector(options.containerSelector)
    : document.body;

  if (!container) {
    console.error(`HermesWidget: container "${options.containerSelector}" not found`);
    return;
  }

  (container as HTMLElement).appendChild(root.el);

  void root.init();

  bus.on('send', async (raw) => {
    const text = raw as string;

    state.setState({
      messages: [...state.getState().messages, { id: crypto.randomUUID(), role: 'user', text, timestamp: Date.now() }],
      isLoading: true,
      error: null,
    });

    try {
      const res = await apiClient.sendMessage(
        state.getState().conversationId,
        options.brand,
        text,
      );

      state.setState({
        messages: [
          ...state.getState().messages,
          { id: res.turn_id, role: 'assistant', text: res.text, timestamp: Date.now() },
        ],
        isLoading: false,
      });

      if (res.handoff_triggered) {
        bus.emit('handoff');
      }
    } catch {
      state.setState({
        isLoading: false,
        error: 'Error de conexión. Intente de nuevo.',
      });
    }
  });

  bus.on('consent', (value) => {
    state.setState({ hasConsented: value as boolean });
  });

  bus.on('handoff', () => {
    state.setState({
      messages: [
        ...state.getState().messages,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: 'Hemos registrado tu solicitud. Un asesor de Patprimo se contactará contigo al correo registrado en horario hábil (lunes a viernes, 8:00am a 6:00pm). Mientras tanto, ¿hay algo más en lo que pueda ayudarte?',
          timestamp: Date.now(),
        },
      ],
    });
  });
}
