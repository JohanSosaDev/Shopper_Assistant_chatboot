export function createInputArea(onSend: (text: string) => void): HTMLElement {
  const container = document.createElement('div');
  container.className = 'hermes-chat__input-area';

  const input = document.createElement('input');
  input.className = 'hermes-chat__input';
  input.type = 'text';
  input.placeholder = 'Escribe tu mensaje';
  input.setAttribute('aria-label', 'Escribe tu mensaje');
  input.autocomplete = 'off';

  const sendBtn = document.createElement('button');
  sendBtn.className = 'hermes-chat__send-btn';
  sendBtn.setAttribute('aria-label', 'Enviar mensaje');
  sendBtn.type = 'button';
  sendBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;

  function submit(): void {
    const text = input.value.trim();
    if (!text) return;
    onSend(text);
    input.value = '';
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
  });
  sendBtn.addEventListener('click', submit);

  container.appendChild(input);
  container.appendChild(sendBtn);
  return container;
}
