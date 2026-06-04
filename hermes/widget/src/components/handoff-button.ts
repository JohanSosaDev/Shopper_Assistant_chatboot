export function createHandoffButton(onClick: () => void): HTMLElement {
  const btn = document.createElement('button');
  btn.className = 'hermes-chat__handoff-btn';
  btn.type = 'button';
  btn.textContent = 'Hablar con una persona';
  btn.addEventListener('click', onClick);
  return btn;
}
