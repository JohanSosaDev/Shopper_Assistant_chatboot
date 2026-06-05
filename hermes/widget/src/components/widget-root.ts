import type { ApiClient, WidgetConfig } from '../core/api-client.js';
import type { WidgetStateManager } from '../core/widget-state.js';
import type { EventBus } from '../core/event-bus.js';
import { createHeader } from './widget-header.js';
import { createMessageList } from './message-list.js';
import { createInputArea } from './input-area.js';
import { createConsentPrompt } from './consent-prompt.js';
import { createHandoffButton } from './handoff-button.js';
import { createErrorBanner } from './error-banner.js';

export interface WidgetRootConfig {
  apiBaseUrl: string;
  brand: string;
  primaryColor: string;
  onPrimaryColor: string;
  conversationId: string;
}

export function createWidgetRoot(
  config: WidgetRootConfig,
  state: WidgetStateManager,
  bus: EventBus,
  apiClient: ApiClient,
): { el: HTMLElement; init: () => Promise<void> } {
  const container = document.createElement('div');
  container.className = 'hermes-chat';
  container.setAttribute('role', 'dialog');
  container.setAttribute('aria-label', 'Chat con asistente virtual Patprimo');

  const header = createHeader(config.primaryColor, () => {
    state.setState({ isOpen: false });
    container.classList.remove('hermes-chat--open');
  });

  const messages = createMessageList(config.primaryColor);
  const inputArea = createInputArea((text) => {
    bus.emit('send', text);
  });
  const consentPrompt = createConsentPrompt('', config.primaryColor,
    () => bus.emit('consent', true),
    () => bus.emit('consent', false),
  );
  const handoffBtn = createHandoffButton(() => bus.emit('handoff'));
  const errorBanner = createErrorBanner();

  container.appendChild(header);
  container.appendChild(messages.el);
  container.appendChild(handoffBtn);
  container.appendChild(inputArea);
  container.appendChild(consentPrompt);
  container.appendChild(errorBanner.el);

  const fab = document.createElement('button');
  fab.className = 'hermes-chat__fab';
  fab.setAttribute('aria-label', 'Abrir chat con asistente virtual');
  fab.style.backgroundColor = config.primaryColor;
  fab.style.color = config.onPrimaryColor;
  fab.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;

  fab.addEventListener('click', () => {
    state.setState({ isOpen: true });
    container.classList.add('hermes-chat--open');
  });

  const wrapper = document.createElement('div');
  wrapper.className = 'hermes-chat-root';
  wrapper.appendChild(fab);
  wrapper.appendChild(container);

  let widgetConfig: WidgetConfig | null = null;

  async function init(): Promise<void> {
    try {
      widgetConfig = await apiClient.fetchWidgetConfig(config.brand);
      consentPrompt.querySelector('.hermes-chat__consent-text')!.textContent = widgetConfig.consentRequestText;
      const titleEl = header.querySelector('.hermes-chat__header-title');
      if (titleEl && widgetConfig.customerFacingName) {
        titleEl.textContent = widgetConfig.customerFacingName;
      }
    } catch {
      consentPrompt.querySelector('.hermes-chat__consent-text')!.textContent =
        '¿Me autoriza procesar sus datos para esta consulta?';
    }

    inputArea.style.display = 'none';
    handoffBtn.style.display = 'none';

    state.subscribe(() => {
      const s = state.getState();
      messages.render(s.messages);
      inputArea.style.display = s.hasConsented ? '' : 'none';
      handoffBtn.style.display = s.messages.length > 0 && s.hasConsented ? '' : 'none';
      consentPrompt.style.display = s.hasConsented || s.messages.length > 0 ? 'none' : '';

      if (s.isLoading) {
        const typing = document.createElement('div');
        typing.className = 'hermes-chat__typing';
        typing.textContent = 'Escribiendo...';
        messages.el.appendChild(typing);
        messages.el.scrollTop = messages.el.scrollHeight;
      } else {
        messages.el.querySelector('.hermes-chat__typing')?.remove();
      }

      if (s.error) errorBanner.show(s.error);
    });
  }

  return { el: wrapper, init };
}
