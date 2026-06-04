import type { Message } from '../core/widget-state.js';

export function createBubble(message: Message, primaryColor: string): HTMLElement {
  const isUser = message.role === 'user';
  const bubble = document.createElement('div');
  bubble.className = `hermes-chat__bubble hermes-chat__bubble--${isUser ? 'user' : 'assistant'}`;

  if (isUser) {
    bubble.style.backgroundColor = primaryColor;
  }

  bubble.textContent = message.text;
  return bubble;
}
