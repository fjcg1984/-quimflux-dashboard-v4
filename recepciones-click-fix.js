/* =========================================================
   QUIMFLUX · Recepciones
   Integración robusta del botón del menú.
   Se ejecuta en fase CAPTURE para evitar que el manejador
   general de navegación de main.js intercepte el clic.
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

  document.addEventListener('click', function (event) {
    const button = event.target?.closest?.('button, a');
    if (!isRecepciones(button)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const open = window.qfOpenRecepciones;
    if (typeof open !== 'function') {
      console.error('QUIMFLUX: qfOpenRecepciones no está disponible todavía.');
      return;
    }

    Promise.resolve(open()).catch(error => {
      console.error('QUIMFLUX Recepciones:', error);
      alert('No se pudo abrir Recepciones: ' + (error?.message || error));
    });
  }, true);
})();
