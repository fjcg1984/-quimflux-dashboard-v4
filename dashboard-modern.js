/* QUIMFLUX Dashboard Moderno
   Solo añade una clase visual al dashboard existente.
   No reemplaza #app, no mueve nodos y no usa observers recursivos.
*/
(function(){
  const apply=()=>{
    const content=document.getElementById('content');
    const active=document.querySelector('nav button[data-tab="dashboard"].active');
    if(!content||!active)return;
    if(!content.classList.contains('qf-modern-dashboard')){
      content.classList.add('qf-modern-dashboard');
    }
  };
  const boot=()=>{
    apply();
    const app=document.getElementById('app');
    if(!app)return;
    const observer=new MutationObserver(()=>apply());
    observer.observe(app,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
