export function createHeader(primaryColor: string, onClose: () => void): HTMLElement {
  const header = document.createElement('div');
  header.className = 'hermes-chat__header';
  header.style.backgroundColor = primaryColor;

  header.innerHTML = `
    <span class="hermes-chat__header-title">Patprimo</span>
    <span class="hermes-chat__header-indicator">IA</span>
    <button class="hermes-chat__header-close" aria-label="Cerrar chat" type="button">×</button>
  `;

  header.querySelector('.hermes-chat__header-close')!.addEventListener('click', onClose);
  return header;
}
