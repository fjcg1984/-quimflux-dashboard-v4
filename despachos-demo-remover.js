/* =========================================================
   QUIMFLUX · Despachos
   Elimina el antiguo botón de carga de las 5 guías de prueba.
   Las guías ahora se registran manualmente desde + Nueva guía.
========================================================= */

function removeOldDemoButton() {
  const candidates = document.querySelectorAll('button, a, [role="button"]');

  candidates.forEach(el => {
    const text = String(el.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    const isOldFiveGuidesButton =
      /cargar.*5.*gu[ií]as?.*real/.test(text) ||
      /cargar.*5.*gu[ií]as?/.test(text) ||
      /5.*gu[ií]as?.*real.*cargar/.test(text) ||
      /cargar.*gu[ií]as?.*poderosa/.test(text);

    if (isOldFiveGuidesButton) {
      el.remove();
    }
  });
}

const oldDemoObserver = new MutationObserver(() => {
  removeOldDemoButton();
});

oldDemoObserver.observe(document.body, {
  childList: true,
  subtree: true
});

setTimeout(removeOldDemoButton, 100);
setTimeout(removeOldDemoButton, 500);
setTimeout(removeOldDemoButton, 1500);
