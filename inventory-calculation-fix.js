/* QUIMFLUX — corrección del Stock actual en Inventario.
   Las Entradas históricas ya incluyen el movimiento de inventario
   importado, por lo que el Stock actual no debe volver a sumar
   stock_inicial.

   Fórmula para el histórico importado:
     Stock actual = Entradas - Salidas

   La columna Inicial se conserva como referencia.
*/

(() => {
  const normalize = value =>
    String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

  const numberValue = value => {
    const raw = String(value ?? '').replace(/,/g, '').trim();
    const valueNumber = Number(raw);
    return Number.isFinite(valueNumber) ? valueNumber : null;
  };

  const formatQuantity = value =>
    new Intl.NumberFormat('es-PE', {
      maximumFractionDigits: 3
    }).format(value);

  function fixInventoryTable(table) {
    if (!table) return;

    const rows = Array.from(table.querySelectorAll('tr'));
    if (!rows.length) return;

    const header = rows.find(row => {
      const labels = Array.from(row.cells).map(cell => normalize(cell.textContent));
      return labels.includes('inicial') &&
        labels.includes('entradas') &&
        labels.includes('salidas') &&
        labels.includes('stock actual');
    });

    if (!header) return;

    const headers = Array.from(header.cells).map(cell => normalize(cell.textContent));
    const entradasIndex = headers.indexOf('entradas');
    const salidasIndex = headers.indexOf('salidas');
    const stockIndex = headers.indexOf('stock actual');

    if (entradasIndex < 0 || salidasIndex < 0 || stockIndex < 0) return;

    rows.forEach(row => {
      if (row === header || row.cells.length <= stockIndex) return;

      const entradas = numberValue(row.cells[entradasIndex]?.textContent);
      const salidas = numberValue(row.cells[salidasIndex]?.textContent);

      if (entradas === null || salidas === null) return;

      const stockActual = entradas - salidas;
      const cell = row.cells[stockIndex];
      const current = numberValue(cell.textContent);

      if (current !== stockActual) {
        cell.textContent = formatQuantity(stockActual);
      }

      cell.dataset.qfCalculatedStock = String(stockActual);
      cell.title = 'Stock actual = Entradas − Salidas. El Inicial se conserva como referencia.';
    });
  }

  function ensureInventoryConsultaButton() {
    const content = document.querySelector('#content');
    if (!content) return;

    // No dependemos de que el botón original siga dentro de .titleRow.
    // Buscamos el título real del módulo y colocamos una acción propia
    // inmediatamente después de ese encabezado.
    const title = Array.from(content.querySelectorAll('h1')).find(h =>
      normalize(h.textContent) === 'control de inventario'
    );

    if (!title) return;

    const main = title.closest('main') || content;
    let button = main.querySelector('#qfConsultaInventarioVisible');

    if (!button) {
      button = document.createElement('button');
      button.id = 'qfConsultaInventarioVisible';
      button.type = 'button';
      button.textContent = '🔎 Consultar inventario';
      button.className = 'primary';
      button.style.display = 'inline-flex';
      button.style.visibility = 'visible';
      button.style.opacity = '1';
      button.style.position = 'relative';
      button.style.zIndex = '10';
      button.style.margin = '8px 0 16px';

      const titleRow = title.closest('.titleRow');
      if (titleRow?.parentElement) {
        titleRow.parentElement.insertBefore(button, titleRow.nextSibling);
      } else {
        title.insertAdjacentElement('afterend', button);
      }
    }

    button.style.display = 'inline-flex';
    button.style.visibility = 'visible';
    button.style.opacity = '1';
    button.style.cursor = 'pointer';
    button.title = 'Abrir consulta completa del inventario';

    if (button.dataset.qfConsultaBound === '1') return;

    button.dataset.qfConsultaBound = '1';
    button.addEventListener('click', () => {
      const secondary = document.getElementById('openInventoryConsulta2');

      if (secondary) {
        secondary.click();
        return;
      }

      // Compatibilidad si el módulo cambia el id del botón secundario.
      const candidate = Array.from(main.querySelectorAll('button')).find(b => {
        const text = normalize(b.textContent);
        return text.includes('ver todo') || text.includes('buscar') || text.includes('consultar inventario');
      });

      if (candidate && candidate !== button) candidate.click();
    });
  }

  function scan() {
    document.querySelectorAll('table').forEach(fixInventoryTable);
    ensureInventoryConsultaButton();
  }

  const observer = new MutationObserver(() => scan());
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan, { once: true });
  } else {
    scan();
  }

  // Refuerzo para renders asíncronos del módulo Inventario.
  setInterval(scan, 500);
})();
