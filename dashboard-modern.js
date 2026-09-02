/* QUIMFLUX — Activación de la nueva interfaz */
(function(){
  const apply=()=>{
    const content=document.getElementById('content');
    if(content) content.classList.add('qf-modern-dashboard');
    const version=document.querySelector('.qf-brand span');
    if(version) version.textContent=' · Administrador de Planta';
  };
  const boot=()=>{
    apply();
    const app=document.getElementById('app');
    if(!app)return;
    const observer=new MutationObserver(apply);
    observer.observe(app,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
