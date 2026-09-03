/* QUIMFLUX — corrección del Stock actual en Inventario.
   Las Entradas históricas ya incluyen INV INICIAL, por lo que no debe
   volver a sumarse stock_inicial en el cálculo mostrado.

   Fórmula oficial para el histórico importado:
     Stock actual = Entradas - Salidas

   La columna Inicial se conserva como referencia y no se modifica.
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
    if (!table || table.dataset.qfInventoryStockFixed === '1') return;

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
    const initialIndex = headers.indexOf('inicial');
    const entradasIndex = headers.indexOf('entradas');
    const salidasIndex = headers.indexOf('salidas');
    const stockIndex = headers.indexOf('stock actual');

    if (entradasIndex < 0 || salidasIndex < 0 || stockIndex < 0) return;

    let changed = false;

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
        changed = true;
      }

      cell.dataset.qfCalculatedStock = String(stockActual);
      cell.title = 'Stock actual = Entradas − Salidas. El Inicial ya está incluido en las entradas históricas.';
    });

    if (changed || rows.length > 1) {
      table.dataset.qfInventoryStockFixed = '1';
    }
  }

  function scan() {
    document.querySelectorAll('table').forEach(fixInventoryTable);
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
})();
