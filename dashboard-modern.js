/* QUIMFLUX — Dashboard ejecutivo V2 */
(function(){
  let busy=false;
  function apply(){
    if(busy)return;
    const content=document.getElementById('content');
    const active=document.querySelector('nav button[data-tab="dashboard"].active');
    if(!content||!active)return;
    busy=true;
    content.classList.add('qf-modern-dashboard');
    const version=document.querySelector('.qf-brand span');
    if(version)version.textContent=' · Administrador de Planta';
    const main=content.querySelector('main');
    if(main){
      main.classList.add('qf-dashboard-main');
      const sections=[...main.children].filter(el=>el.tagName==='SECTION');
      const find=t=>sections.find(s=>(s.querySelector('h2')?.textContent||'').toLowerCase().includes(t));
      const alert=find('alertas quimflux'), security=find('seguridad: días'), latest=find('último turno'), accumulated=find('indicadores acumulados'), comparison=find('comparativa'), trends=find('tendencias'), general=find('indicadores generales'), records=find('últimos registros');
      [accumulated,latest,alert,trends,comparison,security,general,records].filter(Boolean).forEach(s=>main.appendChild(s));
      let hero=main.querySelector('.qf-hero');
      if(!hero){
        hero=document.createElement('div'); hero.className='qf-hero';
        hero.innerHTML='<div class="qf-hero-copy"><div class="qf-kicker">CENTRO DE CONTROL OPERATIVO</div><h1>QUIMFLUX</h1><p>Administración y control integral de planta</p></div><div class="qf-hero-status"><span></span> PLANTA EN LÍNEA</div>';
        main.insertBefore(hero,main.firstChild);
      }
      if(accumulated)accumulated.classList.add('qf-kpi-section');
      if(alert)alert.classList.add('qf-alert-section');
      if(trends)trends.classList.add('qf-trend-section');
    }
    busy=false;
  }
  function boot(){
    apply();
    const app=document.getElementById('app'); if(!app)return;
    const observer=new MutationObserver(()=>{observer.disconnect();apply();observer.observe(app,{childList:true,subtree:true});});
    observer.observe(app,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
