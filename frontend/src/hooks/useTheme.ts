import { useSyncExternalStore } from 'react';

type Tema = 'light' | 'dark';

// A classe `dark` no <html> é a fonte da verdade (aplicada no index.html antes do React montar).
const lerTema = (): Tema => (document.documentElement.classList.contains('dark') ? 'dark' : 'light');

function assinar(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => obs.disconnect();
}

export function useTheme() {
  const tema = useSyncExternalStore(assinar, lerTema);

  function alternar() {
    const novo: Tema = tema === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', novo === 'dark');
    try {
      localStorage.setItem('tema', novo);
    } catch {
      /* sem storage: vale só nesta aba */
    }
  }

  return { tema, alternar };
}
