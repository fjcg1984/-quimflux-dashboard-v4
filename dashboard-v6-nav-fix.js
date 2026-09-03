/* QUIMFLUX V6 · Navegación complementaria */
(function(){
 function add(){
  const nav=document.querySelector('.qf-nav, .qf-v6-nav, nav');
  if(!nav)return;

  // Recepciones ya puede haber sido creada por recepciones.js.
  // Reconocerla por texto evita que ambos scripts creen botones duplicados.
  const existing=[...nav.querySelectorAll('button,a')].find(x=>x.textContent.trim().toLowerCase()==='recepciones');
  if(existing){
   existing.dataset.qfRecV6=existing.dataset.qfRecV6||'1';
   return;
  }

  const b=document.createElement('button');
  b.type='button';
  b.textContent='Recepciones';
  b.className='qf-nav-btn';
  b.dataset.qfRecV6='1';
  b.addEventListener('click',e=>{
   e.preventDefault();
   nav.querySelectorAll('button,a').forEach(x=>x.classList.remove('active','qf-active'));
   b.classList.add('active','qf-active');
   window.qfOpenRecepciones?.();
  });
  const inv=[...nav.querySelectorAll('button,a')].find(x=>x.textContent.trim().toLowerCase()==='inventario');
  if(inv)inv.after(b);else nav.appendChild(b);
 }
 new MutationObserver(add).observe(document.body,{childList:true,subtree:true});
 setInterval(add,500);add();
})();
