/* QUIMFLUX V6 · Navegación complementaria */
(function(){
 function add(){
  const nav=document.querySelector('.qf-v6-nav');
  if(!nav)return;
  let b=nav.querySelector('[data-qf-rec-v6]');
  if(!b){
   b=document.createElement('button');
   b.type='button';
   b.textContent='Recepciones';
   b.dataset.qfRecV6='1';
   b.addEventListener('click',()=>{
    nav.querySelectorAll('button').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    window.qfOpenRecepciones?.();
   });
   const inv=[...nav.querySelectorAll('button')].find(x=>x.textContent.trim()==='Inventario');
   if(inv)inv.after(b);else nav.appendChild(b);
  }
 }
 new MutationObserver(add).observe(document.body,{childList:true,subtree:true});
 setInterval(add,500);add();
})();
