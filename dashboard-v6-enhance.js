/* QUIMFLUX V6 · Dashboard content styling */
(function(){
 function enhance(){
  const c=document.querySelector('#content'); if(!c||c.dataset.qfEnhanced==='1')return;
  const title=c.querySelector('h1');
  if(!title)return;
  c.dataset.qfEnhanced='1';
  c.classList.add('qf-dashboard-content');
  const cards=[...c.querySelectorAll('.card,.kpi,.metric,.stat')];
  cards.forEach(x=>x.classList.add('qf-v6-kpi'));
  [...c.querySelectorAll('table')].forEach(t=>{t.classList.add('qf-v6-table'); if(t.parentElement)t.parentElement.classList.add('qf-v6-table-wrap')});
 }
 new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});
 setInterval(enhance,700);
})();
