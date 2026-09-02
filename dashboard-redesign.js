/* QUIMFLUX — rediseño estructural del Dashboard.
   No recalcula KPI: reorganiza la información que main.js ya calculó. */
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

    const key=[title,alerts,security,latest,accumulated,comparison,trends,records].map(x=>x?.textContent?.slice(0,100)||'').join('|');
    if(key===lastKey && main.querySelector('.qf-dashboard-new')) return;
    lastKey=key;

    const old=[...main.children];
    const wrap=document.createElement('div');
    wrap.className='qf-dashboard-new';

    // Encabezado ejecutivo.
    if(title) wrap.appendChild(title);

    // KPI principales: tomamos las tarjetas del consolidado y mostramos solo los 8 KPI de gestión.
    const kpiSection=document.createElement('section');
    kpiSection.className='qf-dashboard-kpis';
    kpiSection.innerHTML='<div class="qf-section-head"><div><span class="qf-eyebrow">INDICADORES CLAVE</span><h2>Desempeño de planta</h2><p>Visión consolidada de los principales KPI operativos.</p></div><span class="qf-kpi-period">ACUMULADO</span></div>';
    const grid=document.createElement('div'); grid.className='qf-kpi-grid';
    const cards=accumulated ? [...accumulated.querySelectorAll('.card')] : [];
    const wanted=['Producción total','Cumplimiento','Yield','Merma','Disponibilidad','Asistencia','Rechazo calidad','OEE'];
    wanted.forEach(name=>{
      const c=cards.find(x=>(x.querySelector('small')?.textContent||'').trim().toLowerCase()===name.toLowerCase());
      if(c){ const clone=c.cloneNode(true); clone.classList.add('qf-kpi-card'); grid.appendChild(clone); }
    });
    kpiSection.appendChild(grid);
    wrap.appendChild(kpiSection);

    // Dos columnas: alertas y seguridad.
    const ops=document.createElement('div'); ops.className='qf-dashboard-two-col';
    if(alerts){alerts.classList.add('qf-dashboard-alerts'); ops.appendChild(alerts);}
    if(security){security.classList.add('qf-dashboard-security'); ops.appendChild(security);}
    if(ops.children.length) wrap.appendChild(ops);

    // Último turno como tarjeta operativa destacada.
    if(latest){latest.classList.add('qf-dashboard-latest'); wrap.appendChild(latest);}

    // Comparativa + tendencias.
    const analytics=document.createElement('div'); analytics.className='qf-dashboard-analytics';
    if(comparison){comparison.classList.add('qf-dashboard-comparison'); analytics.appendChild(comparison);}
    if(trends){trends.classList.add('qf-dashboard-trends'); analytics.appendChild(trends);}
    if(analytics.children.length) wrap.appendChild(analytics);

    // Registros al final. El bloque general duplicado no se muestra.
    if(records){records.classList.add('qf-dashboard-records'); wrap.appendChild(records);}
    if(general) general.remove();

    main.innerHTML='';
    main.appendChild(wrap);
    main.classList.add('qf-dashboard-redesigned');
  }

  const run=()=>{try{redesign()}catch(e){console.error('QUIMFLUX dashboard redesign',e)}};
  new MutationObserver(()=>setTimeout(run,0)).observe(document.body,{childList:true,subtree:true});
  setInterval(run,700);
  run();
})();
