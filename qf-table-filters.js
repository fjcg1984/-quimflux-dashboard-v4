/* QUIMFLUX · Filtros de tablas de Recepciones y Despachos */
(() => {
  const normalize = value => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  const css = `
    .qf-filterbar{display:flex;flex-wrap:wrap;gap:10px;align-items:end;margin:0 0 14px;padding:14px;border:1px solid #dfe8e3;border-radius:10px;background:#f7faf8}
    .qf-filterbar label{display:flex;flex-direction:column;gap:5px;min-width:170px;font-size:11px;font-weight:800;color:#44564d}
    .qf-filterbar input,.qf-filterbar select{min-height:38px;padding:8px 10px;border:1px solid #cfdcd5;border-radius:8px;background:#fff;color:#26372f;font:inherit;font-weight:500}
    .qf-filterbar .qf-filter-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .qf-filterbar button{min-height:38px;padding:8px 12px;border:1px solid #cfddd5;border-radius:8px;background:#fff;color:#264137;font-weight:700;cursor:pointer}
    .qf-filterbar button.primary{border:0;background:linear-gradient(135deg,#00a66a,#087f4f);color:#fff}
    .qf-filter-result{font-size:11px;color:#6b7972;font-weight:700;margin-left:auto;white-space:nowrap}
    @media(max-width:760px){.qf-filterbar label{min-width:140px;flex:1}.qf-filter-result{width:100%;margin-left:0}}
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  function dateMatches(value, selected) {
    return !selected || String(value || '').slice(0,10) === selected;
  }

  function filterRows(table, predicate, resultEl) {
    const rows = [...table.querySelectorAll('tbody tr')];
    let visible = 0;
    rows.forEach(row => {
      const show = predicate(row);
      row.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    if (resultEl) resultEl.textContent = `${visible} de ${rows.length} registro(s)`;
  }

  function addRecepcionesFilters() {
    const main = document.querySelector('#content main.qf-rec-page, #content main');
    if (!main) return;
    const title = [...main.querySelectorAll('h1')].find(x => normalize(x.textContent) === 'recepciones');
    const table = main.querySelector('.qf-rec-table');
    if (!title || !table || main.querySelector('[data-qf-rec-filters]')) return;

    const panel = table.closest('.qf-rec-panel');
    if (!panel) return;

    const bar = document.createElement('div');
    bar.className = 'qf-filterbar';
    bar.dataset.qfRecFilters = '1';
    bar.innerHTML = `
      <label>Fecha
        <input type="date" data-qf-rec-date>
      </label>
      <label>Guía / OC
        <input type="search" placeholder="Buscar guía u OC" data-qf-rec-text>
      </label>
      <label>Proveedor
        <input type="search" placeholder="Nombre del proveedor" data-qf-rec-supplier>
      </label>
      <label>Estado
        <select data-qf-rec-status>
          <option value="">Todos</option>
          <option>Registrada</option>
          <option>Pendiente de revisión</option>
          <option>Recibida</option>
          <option>Aprobada</option>
          <option>Rechazada</option>
        </select>
      </label>
      <div class="qf-filter-actions">
        <button type="button" class="primary" data-qf-rec-provider-btn>Consultar proveedor</button>
        <button type="button" data-qf-rec-apply>Filtrar</button>
        <button type="button" data-qf-rec-clear>Limpiar</button>
      </div>
      <span class="qf-filter-result" data-qf-rec-result></span>
    `;
    panel.insertBefore(bar, table.closest('.qf-rec-table-wrap') || table);

    const date = bar.querySelector('[data-qf-rec-date]');
    const text = bar.querySelector('[data-qf-rec-text]');
    const supplier = bar.querySelector('[data-qf-rec-supplier]');
    const status = bar.querySelector('[data-qf-rec-status]');
    const result = bar.querySelector('[data-qf-rec-result]');

    const apply = () => {
      const q = normalize(text.value);
      const s = normalize(supplier.value);
      const st = normalize(status.value);
      filterRows(table, row => {
        const cells = [...row.cells].map(c => c.textContent || '');
        const rowDate = cells[0];
        const rowGuide = normalize(cells[1]);
        const rowSupplier = normalize(cells[2]);
        const rowStatus = normalize(cells[5]);
        return dateMatches(rowDate, date.value) &&
          (!q || rowGuide.includes(q) || normalize(cells[3]).includes(q)) &&
          (!s || rowSupplier.includes(s)) &&
          (!st || rowStatus.includes(st));
      }, result);
    };

    bar.querySelector('[data-qf-rec-apply]').onclick = apply;
    bar.querySelector('[data-qf-rec-provider-btn]').onclick = () => {
      if (!supplier.value.trim()) {
        supplier.focus();
        return;
      }
      apply();
    };
    [date, text, status].forEach(el => el.addEventListener('change', apply));
    text.addEventListener('input', apply);
    supplier.addEventListener('keydown', e => { if (e.key === 'Enter') apply(); });
    bar.querySelector('[data-qf-rec-clear]').onclick = () => {
      date.value = '';
      text.value = '';
      supplier.value = '';
      status.value = '';
      apply();
    };
    apply();
  }

  function addDespachosFilters() {
    const main = document.querySelector('#content main');
    if (!main) return;
    const title = [...main.querySelectorAll('h1')].find(x => normalize(x.textContent) === 'despachos');
    const table = main.querySelector('.qf-table');
    if (!title || !table || main.querySelector('[data-qf-desp-filters]')) return;

    const wrap = table.closest('.tableWrap, .qf-v6-table-wrap') || table.parentElement;
    if (!wrap) return;

    const bar = document.createElement('div');
    bar.className = 'qf-filterbar';
    bar.dataset.qfDespFilters = '1';
    bar.innerHTML = `
      <label>Fecha
        <input type="date" data-qf-desp-date>
      </label>
      <label>Guía / Cliente
        <input type="search" placeholder="Buscar guía o cliente" data-qf-desp-text>
      </label>
      <label>Estado
        <select data-qf-desp-status>
          <option value="">Todos</option>
          <option>registrado</option>
          <option>preparando</option>
          <option>despachado</option>
          <option>entregado</option>
          <option>anulado</option>
        </select>
      </label>
      <div class="qf-filter-actions">
        <button type="button" class="primary" data-qf-desp-apply>Filtrar despachos</button>
        <button type="button" data-qf-desp-clear>Limpiar</button>
      </div>
      <span class="qf-filter-result" data-qf-desp-result></span>
    `;
    wrap.parentElement.insertBefore(bar, wrap);

    const date = bar.querySelector('[data-qf-desp-date]');
    const text = bar.querySelector('[data-qf-desp-text]');
    const status = bar.querySelector('[data-qf-desp-status]');
    const result = bar.querySelector('[data-qf-desp-result]');

    const apply = () => {
      const q = normalize(text.value);
      const st = normalize(status.value);
      filterRows(table, row => {
        const cells = [...row.cells].map(c => c.textContent || '');
        const rowDate = cells[0];
        const rowAll = normalize(cells.join(' '));
        return dateMatches(rowDate, date.value) &&
          (!q || rowAll.includes(q)) &&
          (!st || rowAll.includes(st));
      }, result);
    };

    bar.querySelector('[data-qf-desp-apply]').onclick = apply;
    date.addEventListener('change', apply);
    status.addEventListener('change', apply);
    text.addEventListener('input', apply);
    bar.querySelector('[data-qf-desp-clear]').onclick = () => {
      date.value = '';
      text.value = '';
      status.value = '';
      apply();
    };
    apply();
  }

  function scan() {
    addRecepcionesFilters();
    addDespachosFilters();
  }

  new MutationObserver(() => setTimeout(scan, 50)).observe(document.body, { childList:true, subtree:true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan, { once:true });
  else scan();
  setInterval(scan, 700);
})();
