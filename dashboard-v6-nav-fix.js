/* QUIMFLUX V6 · Navegación complementaria */
(function(){
 function add(){
  const nav=document.querySelector('.qf-v6-nav');
  if(!nav||nav.querySelector('[data-qf-rec-v6]'))return;
  const b=document.createElement('button');b.type='button';b.textContent='Recepciones';b.dataset.qfRecV6='1';
  b.addEventListener('click',()=>window.qfOpenRecepciones?.());nav.appendChild(b);
 }
 new MutationObserver(add).observe(document.body,{childList:true,subtree:true});
 setInterval(add,500);add();
})();
