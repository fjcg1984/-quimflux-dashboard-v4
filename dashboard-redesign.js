/* QUIMFLUX — Dashboard ejecutivo. Reorganiza el DOM existente sin tocar cálculos. */
(function(){
  let lastKey='';

  function activeDashboard(){
    const b=document.querySelector('.qf-nav button.active, #app>nav button.active');
    return b && b.dataset.tab==='dashboard';
  }

  function redesign(){
    if(!activeDashboard()) return;
    const main=document.querySelector('#content main');
    if(!main) return;

    const title=main.querySelector('.titleRow');
    const panels=[...main.querySelectorAll('.panel')];
    if(!title || !panels.length) return;

    const find=label=>panels.find(p=>((p.querySelector('h2')?.textContent||'').toLowerCase()).includes(label));
    const alerts=find('alertas quimflux');
    const security=find('seguridad');
    const latest=find('último turno');
    const accumulated=find('indicadores acumulados');
    const comparison=find('comparativa');
    const trends=find('tendencias');
    const general=find('indicadores generales');
    const records=find('últimos registros');

    const key=[title,alerts,security,latest,accumulated,comparison,trends,records]
      .map(x=>x?.textContent?.slice(0,140)||'').join('|');
    if(key===lastKey && main.querySelector('.qf-dashboard-new')) return;
    lastKey=key;

    const h1=title.querySelector('h1');
    const tp=title.querySelector('p');
    if(h1) h1.textContent='Administración de Planta';
    if(tp) tp.textContent='Centro de Control de Operaciones';

    const wrap=document.createElement('div');
    wrap.className='qf-dashboard-new';
    wrap.appendChild(title);

    const kpiSection=document.createElement('section');
    kpiSection.className='qf-dashboard-kpis';
    kpiSection.innerHTML='<div class="qf-section-head"><div><span class="qf-eyebrow">DESEMPEÑO DE PLANTA · HOY</span><h2>Indicadores clave</h2></div><span class="qf-kpi-period">ACUMULADO</span></div>';
    const grid=document.createElement('div');
    grid.className='qf-kpi-grid';
    const cards=accumulated ? [...accumulated.querySelectorAll('.card')] : [];
    const wanted=['Producción total','Cumplimiento','Yield','Merma','Disponibilidad','Asistencia','Rechazo calidad','OEE'];
    wanted.forEach(name=>{
      const c=cards.find(x=>(x.querySelector('small')?.textContent||'').trim().toLowerCase()===name.toLowerCase());
      if(c){const clone=c.cloneNode(true);clone.classList.add('qf-kpi-card');grid.appendChild(clone)}
    });
    kpiSection.appendChild(grid);
    wrap.appendChild(kpiSection);

    // Bloque operativo: izquierda = alertas + seguridad; derecha = último turno.
    const ops=document.createElement('div');
    ops.className='qf-dashboard-ops';

    const attention=document.createElement('div');
    attention.className='qf-dashboard-attention';
    if(alerts){alerts.classList.add('qf-dashboard-alerts');attention.appendChild(alerts)}
    if(security){security.classList.add('qf-dashboard-security');attention.appendChild(security)}
    if(attention.children.length) ops.appendChild(attention);

    if(latest){latest.classList.add('qf-dashboard-latest');ops.appendChild(latest)}
    if(ops.children.length) wrap.appendChild(ops);

    const analytics=document.createElement('div');
    analytics.className='qf-dashboard-analytics';
    if(comparison){comparison.classList.add('qf-dashboard-comparison');analytics.appendChild(comparison)}
    if(trends){trends.classList.add('qf-dashboard-trends');analytics.appendChild(trends)}
    if(analytics.children.length) wrap.appendChild(analytics);

    if(records){records.classList.add('qf-dashboard-records');wrap.appendChild(records)}
    if(general) general.remove();
    if(accumulated) accumulated.remove();

    main.innerHTML='';
    main.appendChild(wrap);
    main.classList.add('qf-dashboard-redesigned');
  }

  const run=()=>{try{redesign()}catch(e){console.error('QUIMFLUX dashboard redesign',e)}};
  new MutationObserver(()=>setTimeout(run,0)).observe(document.body,{childList:true,subtree:true});
  setInterval(run,700);
  run();
})();
