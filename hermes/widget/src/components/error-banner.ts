export function createErrorBanner(): { el: HTMLElement; show: (msg: string) => void; hide: () => void } {
  const banner = document.createElement('div');
  banner.className = 'hermes-chat__error';
  banner.setAttribute('role', 'alert');

  function show(msg: string): void {
    banner.textContent = msg;
    banner.classList.add('hermes-chat__error--visible');
    setTimeout(() => hide(), 5000);
  }

  function hide(): void {
    banner.classList.remove('hermes-chat__error--visible');
  }

  return { el: banner, show, hide };
}
