/* QUIMFLUX — clasificación visual del dashboard moderno */
(function(){
  function classify(){
    const content=document.querySelector('#content');
    const nav=document.querySelector('.qf-nav');
    if(!content||!nav)return;
    const active=[...nav.querySelectorAll('button')].find(b=>b.classList.contains('active'));
    if(!active||active.dataset.tab!=='dashboard')return;
    const main=content.querySelector('main'); if(!main)return;
    main.classList.add('qf-final-dashboard');
    [...main.querySelectorAll('section,.panel,.titleRow')].forEach(el=>{
      const text=(el.querySelector('h1,h2,h3')?.textContent||'').trim().toLowerCase();
      if(text.includes('indicadores acumulados'))el.classList.add('qf-final-kpis');
      else if(text.includes('alertas quimflux'))el.classList.add('qf-final-alerts');
      else if(text.includes('seguridad'))el.classList.add('qf-final-security');
      else if(text.includes('último turno'))el.classList.add('qf-final-latest');
      else if(text.includes('comparativa'))el.classList.add('qf-final-comparison');
      else if(text.includes('tendencias'))el.classList.add('qf-final-trends');
      else if(text.includes('indicadores generales'))el.classList.add('qf-final-general');
      else if(text.includes('últimos registros'))el.classList.add('qf-final-records');
    });
  }
  const run=()=>{try{classify()}catch(e){console.error('QUIMFLUX final UI',e)}};
  new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
  setInterval(run,500); run();
})();
