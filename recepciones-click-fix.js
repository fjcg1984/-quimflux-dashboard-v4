/* =========================================================
   QUIMFLUX · Recepciones
   Control del clic + estado visual activo.
========================================================= */

(function () {
  function isRecepciones(el) {
    if (!el) return false;
    const text = String(el.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    return text === 'recepciones';
  }

  function setRecepcionesActive(button) {
    const nav = button?.closest('nav');
    if (!nav) return;
    nav.querySelectorAll('button, a').forEach(el => {
      el.classList.remove('active', 'qf-active');
    });
    button.classList.add('active', 'qf-active');
  }

  document.addEventListener('click', function (event) {
    const button = event.target?.closest?.('button, a');
    if (!isRecepciones(button)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    setRecepcionesActive(button);

    const open = window.qfOpenRecepciones;
    if (typeof open !== 'function') {
      console.error('QUIMFLUX: qfOpenRecepciones no está disponible todavía.');
      return;
    }

    Promise.resolve(open()).then(() => {
      setTimeout(() => setRecepcionesActive(button), 50);
    }).catch(error => {
      console.error('QUIMFLUX Recepciones:', error);
      alert('No se pudo abrir Recepciones: ' + (error?.message || error));
    });
  }, true);
})();
