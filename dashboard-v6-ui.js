/* QUIMFLUX V6 · Capa visual del Dashboard */
(function(){
  const logo='./quimflux-logo.png';
  const navLabels=['Dashboard','Registro Diario','Resumen Ejecutivo','Costos','Mantenimiento','Inventario','Despachos','Personal','SSOMA','Recepciones','Reportes'];
  function activeLabel(){const b=[...document.querySelectorAll('nav button, nav a')];return b.find(x=>x.classList.contains('active')||x.classList.contains('selected'))?.textContent.trim()||''}
  function apply(){
    const app=document.querySelector('#app');
    if(!app||app.dataset.qfV6==='1')return;
    const header=app.querySelector('header');
    const nav=app.querySelector('nav');
    const content=app.querySelector('#content');
    if(!header||!nav||!content)return;
    app.dataset.qfV6='1';
    const shell=document.createElement('div'); shell.className='qf-v6-shell';
    const side=document.createElement('aside'); side.className='qf-v6-sidebar';
    side.innerHTML=`<div class="qf-v6-brand"><img src="${logo}" alt="QUIMFLUX"></div><div class="qf-v6-nav"><div class="qf-v6-nav-title">Módulos</div></div><div class="qf-v6-footer">QUIMFLUX V6.0<br><br>© 2026 Todos los derechos reservados</div>`;
    const navBox=side.querySelector('.qf-v6-nav');
    [...nav.querySelectorAll('button,a')].forEach(b=>{b.classList.add('qf-v6-nav-btn');navBox.appendChild(b)});
    const main=document.createElement('div');main.className='qf-v6-main';
    const top=document.createElement('div');top.className='qf-v6-topbar';
    top.innerHTML=`<div class="qf-v6-welcome"><h2>Bienvenido, Francisco</h2><p><span class="qf-dot"></span>Administrador de Planta</p></div><div class="qf-v6-date"><b>${new Date().toLocaleDateString('es-PE',{day:'2-digit',month:'long',year:'numeric'})}</b><small>${new Date().toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})}</small></div>`;
    const area=document.createElement('div');area.className='qf-v6-content';area.appendChild(content);
    main.append(top,area);shell.append(side,main);app.innerHTML='';app.appendChild(shell);
    content.classList.add('qf-v6-content-inner');
  }
  const observer=new MutationObserver(()=>{try{apply()}catch(e){console.error(e)}});
  observer.observe(document.body,{childList:true,subtree:true});
  setInterval(()=>{try{if(document.querySelector('#app')&&!document.querySelector('.qf-v6-shell'))apply()}catch(e){}},500);
})();
