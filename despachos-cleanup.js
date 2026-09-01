// QUIMFLUX — Limpieza definitiva del cargador de demostración de Despachos.
// El módulo Despachos definitivo usa únicamente registro manual.
(function () {
  const LEGACY_BUTTON = 'cargar las 5 guías reales';
  const LEGACY_HELP = 'pulsa “cargar las 5 guías reales” para insertar en supabase los documentos que analizamos.';

  function normalize(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function cleanupLegacyLoader() {
    document.querySelectorAll('button, p, div, span').forEach(el => {
      const text = normalize(el.textContent);
      if (!text) return;

      // El botón antiguo.
      if (el.tagName === 'BUTTON' && text.includes(LEGACY_BUTTON)) {
        el.remove();
        return;
      }

      // El texto de ayuda antiguo que aparece dentro de "Guías de remisión".
      // Solo eliminamos el elemento si su propio texto es el mensaje,
      // evitando borrar accidentalmente el contenedor completo.
      if (
        (el.tagName === 'P' || el.tagName === 'SPAN' || el.tagName === 'DIV') &&
        (text === LEGACY_HELP ||
          (text.includes('pulsa') && text.includes(LEGACY_BUTTON) && !el.querySelector('button, h1, h2, h3, table')))
      ) {
        el.remove();
      }
    });
  }

  cleanupLegacyLoader();

  const observer = new MutationObserver(cleanupLegacyLoader);
  observer.observe(document.body, { childList: true, subtree: true });
})();
