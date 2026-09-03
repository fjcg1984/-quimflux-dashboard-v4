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

    const titleRow = content.querySelector('main .titleRow');
    const title = titleRow?.querySelector('h1');
    if (!title || normalize(title.textContent) !== 'control de inventario') return;

    let button = titleRow.querySelector('#openInventoryConsulta');

    if (!button) {
      button = document.createElement('button');
      button.id = 'openInventoryConsulta';
      button.type = 'button';
      button.textContent = '🔎 Consultar inventario';
      titleRow.appendChild(button);
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

      const fallback = Array.from(titleRow.querySelectorAll('button')).find(b =>
        normalize(b.textContent).includes('consultar inventario')
      );

      if (fallback && fallback !== button) {
        fallback.click();
      }
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
  // No modifica Supabase; solo corrige la celda visible y garantiza
  // que el acceso a Consulta permanezca visible.
  setInterval(scan, 500);
})();
