/* =========================================================
   QUIMFLUX · Recepciones
   Navegación robusta para el shell moderno.
========================================================= */

(function () {
  function isRecepciones(el) {
    if (!el) return false;
    const text = String(el.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    return text === 'recepciones' || el.matches?.('[data-qf-rec-nav], [data-qf-rec-v6]');
  }

  function setActive(button) {
    const nav = button?.closest?.('.qf-nav, .qf-v6-nav, nav');
    if (!nav) return;
    nav.querySelectorAll('button, a').forEach(el => {
      el.classList.remove('active', 'qf-active');
    });
    button.classList.add('active', 'qf-active');
  }

  function openRecepciones(button) {
    setActive(button);
    const open = window.qfOpenRecepciones;
    if (typeof open === 'function') {
      Promise.resolve(open()).then(() => setActive(button)).catch(error => {
        console.error('QUIMFLUX Recepciones:', error);
        alert('No se pudo abrir Recepciones: ' + (error?.message || error));
      });
      return;
    }
    // Evita fallos por el orden de carga de módulos.
    setTimeout(() => {
      const retry = window.qfOpenRecepciones;
      if (typeof retry === 'function') {
        Promise.resolve(retry()).then(() => setActive(button)).catch(error => {
          console.error('QUIMFLUX Recepciones:', error);
          alert('No se pudo abrir Recepciones: ' + (error?.message || error));
        });
      } else {
        console.error('QUIMFLUX: qfOpenRecepciones no está disponible.');
        alert('Recepciones todavía no está disponible. Recarga la página e inténtalo nuevamente.');
      }
    }, 100);
  }

  document.addEventListener('click', function (event) {
    const button = event.target?.closest?.('button, a');
    if (!isRecepciones(button)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openRecepciones(button);
  }, true);
})();
