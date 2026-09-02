/* QUIMFLUX — Dashboard ejecutivo V3 */
(function(){
  let observerStarted=false;
  let applying=false;

  function text(el){return (el?.textContent||'').trim().toLowerCase();}

  function apply(){
    if(applying)return;
    const content=document.getElementById('content');
    const active=document.querySelector('nav button[data-tab="dashboard"].active');
    if(!content||!active)return;
    const main=content.querySelector('main');
    if(!main)return;

    applying=true;
    content.classList.add('qf-modern-dashboard');
    main.classList.add('qf-dashboard-main');

    const version=document.querySelector('.qf-brand span');
    if(version)version.textContent=' · Administrador de Planta';

    const panels=[...main.querySelectorAll(':scope > section')];
    const find=(needle)=>panels.find(s=>text(s.querySelector('h2')).includes(needle));
    const alert=find('alertas quimflux');
    const security=find('seguridad: días');
    const latest=find('último turno');
    const accumulated=find('indicadores acumulados');
    const comparison=find('comparativa');
    const trends=find('tendencias');
    const general=find('indicadores generales');
    const records=find('últimos registros');

    /* Elimina duplicidad: "Indicadores generales" repetía los primeros KPI. */
    if(general)general.classList.add('qf-hide-duplicate');

    if(accumulated){
      accumulated.classList.add('qf-kpi-section');
      const cards=accumulated.querySelector('.cards');
      if(cards){
        cards.classList.add('qf-kpi-grid');
        [...cards.children].forEach((card,i)=>{
          card.classList.add('qf-kpi-card');
          if(i<8)card.classList.add('qf-kpi-primary');
          if(i===0)card.classList.add('qf-kpi-production');
        });
      }
    }

    if(alert){
      alert.classList.add('qf-alert-section');
      const list=alert.querySelector('div[style*="flex-direction:column"]');
      if(list)list.classList.add('qf-alert-list');
    }

    if(security){
      security.classList.add('qf-security-section');
      const cards=security.querySelector('.cards');
      if(cards){
        cards.classList.add('qf-security-grid');
        [...cards.children].forEach((card,i)=>card.classList.add(i===0?'qf-security-main':'qf-security-item'));
      }
    }

    if(latest){
      latest.classList.add('qf-latest-section');
      const cards=latest.querySelector('.cards');
      if(cards){
        cards.classList.add('qf-latest-grid');
        [...cards.children].forEach(card=>card.classList.add('qf-mini-kpi'));
      }
    }

    if(comparison)comparison.classList.add('qf-comparison-section');
    if(trends)trends.classList.add('qf-trend-section');
    if(records)records.classList.add('qf-records-section');

    /* Reordenamiento ejecutivo: primero decisión, luego análisis y detalle. */
    [accumulated,alert,security,latest,trends,comparison,records,general]
      .filter(Boolean)
      .forEach(s=>main.appendChild(s));

    /* Sustituye el encabezado genérico por un encabezado ejecutivo. */
    let hero=main.querySelector('.qf-hero');
    if(!hero){
      hero=document.createElement('section');
      hero.className='qf-hero';
      hero.innerHTML='<div class="qf-hero-copy"><div class="qf-kicker">CENTRO DE CONTROL OPERATIVO</div><h1>QUIMFLUX</h1><p>Visión ejecutiva de producción, costos, calidad, mantenimiento y seguridad.</p><div class="qf-hero-meta"><span>● DATOS EN VIVO</span><span>SUPABASE CONECTADO</span></div></div><div class="qf-hero-status"><strong>EN LÍNEA</strong><small>Operación conectada</small></div>';
      main.insertBefore(hero,main.firstChild);
    }

    /* El título original ya queda cubierto por el nuevo encabezado. */
    const oldTitle=[...main.children].find(el=>el.classList?.contains('titleRow') && !el.closest('section'));
    if(oldTitle)oldTitle.classList.add('qf-hide-old-title');

    applying=false;
  }

  function boot(){
    apply();
    if(observerStarted)return;
    const app=document.getElementById('app');
    if(!app)return;
    observerStarted=true;
    const observer=new MutationObserver(()=>{
      if(!applying)apply();
    });
    observer.observe(app,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
