// QUIMFLUX — Retiro definitivo del cargador de 5 guías de prueba.
// El módulo Despachos definitivo usa únicamente registro manual.
(function () {
  const LEGACY_TEXT = 'Cargar las 5 guías reales';

  function cleanupLegacyLoader() {
    document.querySelectorAll('button, p, div, span').forEach(el => {
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text.includes(LEGACY_TEXT)) return;

      // Si el texto está dentro de un botón, elimina el botón.
      if (el.tagName === 'BUTTON' && text.includes(LEGACY_TEXT)) {
        el.remove();
        return;
      }

      // El mensaje de ayuda antiguo también se elimina.
      if (el.tagName === 'P' && text.includes(LEGACY_TEXT)) {
        el.remove();
      }
    });
  }

  cleanupLegacyLoader();

  const observer = new MutationObserver(cleanupLegacyLoader);
  observer.observe(document.body, { childList: true, subtree: true });
})();
