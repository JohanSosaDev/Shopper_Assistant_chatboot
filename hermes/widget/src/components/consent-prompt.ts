export function createConsentPrompt(
  text: string,
  primaryColor: string,
  onAccept: () => void,
  onDeny: () => void,
): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'hermes-chat__consent';

  overlay.innerHTML = `
    <p class="hermes-chat__consent-text">${text}</p>
    <div class="hermes-chat__consent-actions">
      <button class="hermes-chat__consent-btn hermes-chat__consent-btn--accept" type="button">Aceptar</button>
      <button class="hermes-chat__consent-btn hermes-chat__consent-btn--deny" type="button">Rechazar</button>
    </div>
  `;

  (overlay.querySelector('.hermes-chat__consent-btn--accept') as HTMLButtonElement).style.backgroundColor = primaryColor;
  overlay.querySelector('.hermes-chat__consent-btn--accept')!.addEventListener('click', onAccept);
  overlay.querySelector('.hermes-chat__consent-btn--deny')!.addEventListener('click', onDeny);

  return overlay;
}
