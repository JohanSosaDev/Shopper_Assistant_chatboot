import type { Message } from '../core/widget-state.js';
import { createBubble } from './message-bubble.js';

export function createMessageList(primaryColor: string): { el: HTMLElement; render: (messages: Message[]) => void } {
  const container = document.createElement('div');
  container.className = 'hermes-chat__messages';
  container.setAttribute('role', 'log');
  container.setAttribute('aria-live', 'polite');

  function render(messages: Message[]): void {
    container.innerHTML = '';
    messages.forEach((msg) => {
      container.appendChild(createBubble(msg, primaryColor));
    });
    container.scrollTop = container.scrollHeight;
  }

  return { el: container, render };
}
