/*
  Ajustes de presentación para la versión de directorio.
  No modifica datos ni lógica de negocio.
  - Retira cualquier rastro del cargador de pruebas.
  - Mejora la legibilidad de la tabla de incidentes SSOMA en pantallas grandes y móviles.
*/

const style = document.createElement('style');
style.textContent = `
  /* Herramienta temporal de pruebas: no debe formar parte de la versión ejecutiva. */
  #qfTestFab,
  #qfTestBackdrop { display: none !important; }

  /* SSOMA: tabla ejecutiva sin scroll horizontal. */
  .qf-ssoma-incidents-panel { overflow: hidden; }
  .qf-ssoma-incidents-panel table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
  }
  .qf-ssoma-incidents-panel th,
  .qf-ssoma-incidents-panel td {
    white-space: normal !important;
    overflow-wrap: anywhere;
    word-break: break-word;
    vertical-align: top;
    line-height: 1.4;
  }
  .qf-ssoma-incidents-panel th:nth-child(1),
  .qf-ssoma-incidents-panel td:nth-child(1) { width: 8%; }
  .qf-ssoma-incidents-panel th:nth-child(2),
  .qf-ssoma-incidents-panel td:nth-child(2) { width: 13%; }
  .qf-ssoma-incidents-panel th:nth-child(3),
  .qf-ssoma-incidents-panel td:nth-child(3) { width: 17%; }
  .qf-ssoma-incidents-panel th:nth-child(4),
  .qf-ssoma-incidents-panel td:nth-child(4) { width: 10%; }
  .qf-ssoma-incidents-panel th:nth-child(5),
  .qf-ssoma-incidents-panel td:nth-child(5) { width: 10%; }
  .qf-ssoma-incidents-panel th:nth-child(6),
  .qf-ssoma-incidents-panel td:nth-child(6) { width: 42%; }

  @media (max-width: 800px) {
    .qf-ssoma-incidents-panel table,
    .qf-ssoma-incidents-panel thead,
    .qf-ssoma-incidents-panel tbody,
    .qf-ssoma-incidents-panel th,
    .qf-ssoma-incidents-panel td,
    .qf-ssoma-incidents-panel tr { display: block; }
    .qf-ssoma-incidents-panel thead { display: none; }
    .qf-ssoma-incidents-panel tbody tr {
      padding: 12px 0;
      border-bottom: 1px solid #e1e9e5;
    }
    .qf-ssoma-incidents-panel td {
      width: auto !important;
      padding: 5px 10px 5px 38%;
      position: relative;
      min-height: 24px;
    }
    .qf-ssoma-incidents-panel td::before {
      position: absolute;
      left: 10px;
      top: 5px;
      width: 34%;
      font-weight: 700;
      color: #52615b;
    }
    .qf-ssoma-incidents-panel td:nth-child(1)::before { content: 'Fecha'; }
    .qf-ssoma-incidents-panel td:nth-child(2)::before { content: 'Tipo'; }
    .qf-ssoma-incidents-panel td:nth-child(3)::before { content: 'Lugar'; }
    .qf-ssoma-incidents-panel td:nth-child(4)::before { content: 'Gravedad'; }
    .qf-ssoma-incidents-panel td:nth-child(5)::before { content: 'Estado'; }
    .qf-ssoma-incidents-panel td:nth-child(6)::before { content: 'Hechos'; }
  }
`;
document.head.appendChild(style);

function markSsomaTable() {
  const main = [...document.querySelectorAll('main')]
    .find(el => el.querySelector('h1')?.textContent?.trim() === 'SSOMA');
  if (!main) return;

  const panel = [...main.querySelectorAll('.panel')]
    .find(el => el.querySelector('h2')?.textContent?.trim() === 'Incidentes registrados');
  if (panel) panel.classList.add('qf-ssoma-incidents-panel');

  // Si el cargador temporal estuviera presente por caché, eliminarlo también.
  document.getElementById('qfTestFab')?.remove();
  document.getElementById('qfTestBackdrop')?.remove();
}

const observer = new MutationObserver(markSsomaTable);
observer.observe(document.body, { childList: true, subtree: true });
markSsomaTable();
