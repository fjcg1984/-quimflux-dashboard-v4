/* Marca exclusivamente la página SSOMA para aplicar el ajuste de tabla. */
import './qf-ssoma-table-fix.css';

function markSsoma(){
  document.querySelectorAll('main').forEach(main=>{
    const title=main.querySelector('h1')?.textContent?.trim();
    if(title==='SSOMA') main.classList.add('qf-ssoma-page');
  });
}

const observer=new MutationObserver(markSsoma);
function start(){
  if(!document.body){setTimeout(start,50);return;}
  observer.observe(document.body,{childList:true,subtree:true});
  markSsoma();
}
start();
