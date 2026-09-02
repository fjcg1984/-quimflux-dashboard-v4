/* QUIMFLUX — Shell moderno. Conserva la navegación y el contenido funcional. */
(function(){
  function apply(){
    const app=document.querySelector('#app');
    const header=app?.querySelector(':scope > header');
    const nav=app?.querySelector(':scope > nav');
    const content=app?.querySelector(':scope > #content');
    if(!app||!header||!nav||!content||app.dataset.qfModernShell==='1')return;
    app.dataset.qfModernShell='1';
    const oldLogout=header.querySelector('#logout');
    const shell=document.createElement('div'); shell.className='qf-shell';
    const side=document.createElement('aside'); side.className='qf-sidebar';
    side.innerHTML=`<div class="qf-sidebar-head"><div class="qf-logo">Q</div><div><div class="qf-name">QUIMFLUX</div><div class="qf-sub">Administración de Planta</div></div></div><div class="qf-section-label">OPERACIÓN</div><div class="qf-nav"></div><div class="qf-sidebar-foot"><span class="qf-live-dot"></span> EN LÍNEA<br><span class="qf-side-note">Conectado al sistema</span></div>`;
    const navBox=side.querySelector('.qf-nav');
    [...nav.querySelectorAll('button,a')].forEach(b=>{b.classList.add('qf-nav-btn');navBox.appendChild(b)});
    const main=document.createElement('div'); main.className='qf-main';
    const top=document.createElement('header'); top.className='qf-topbar';
    const now=new Date();
    const dateText=now.toLocaleDateString('es-PE',{day:'numeric',month:'long',year:'numeric'});
    const timeText=now.toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'});
    top.innerHTML=`<div class="qf-top-brand"><img src="./quimflux-logo.png" alt="QUIMFLUX"><div class="qf-top-titles"><div class="qf-page-context">CENTRO DE CONTROL DE OPERACIONES</div><div class="qf-welcome">Administración de Planta</div></div></div><div class="qf-top-actions"><span class="qf-status"><i></i> EN LÍNEA</span><span class="qf-meta"><b>▣</b> ${dateText}</span><span class="qf-meta"><b>↻</b> Última sincronización <em>${timeText}</em></span></div>`;
    if(oldLogout){oldLogout.className='qf-logout';top.querySelector('.qf-top-actions').appendChild(oldLogout)}
    const area=document.createElement('div'); area.className='qf-content'; area.appendChild(content);
    main.append(top,area); shell.append(side,main); app.innerHTML=''; app.appendChild(shell);
  }
  const observer=new MutationObserver(()=>{try{if(!document.querySelector('.qf-shell'))apply()}catch(e){console.error(e)}});
  observer.observe(document.body,{childList:true,subtree:true});
  setInterval(()=>{try{if(!document.querySelector('.qf-shell'))apply()}catch(e){}},300);
})();
