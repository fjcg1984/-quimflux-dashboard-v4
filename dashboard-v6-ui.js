/* QUIMFLUX — Shell moderno. Conserva la navegación y el contenido funcional. */
(function(){
  let mounted=false;
  function apply(){
    const app=document.querySelector('#app');
    const header=app?.querySelector(':scope > header');
    const nav=app?.querySelector(':scope > nav');
    const content=app?.querySelector(':scope > #content');
    if(!app||!header||!nav||!content)return;
    if(app.dataset.qfModernShell==='1')return;
    app.dataset.qfModernShell='1';
    const shell=document.createElement('div');
    shell.className='qf-shell';
    const side=document.createElement('aside');
    side.className='qf-sidebar';
    side.innerHTML=`
      <div class="qf-sidebar-head">
        <div class="qf-logo">Q</div>
        <div><div class="qf-name">QUIMFLUX</div><div class="qf-sub">Administrador de Planta</div></div>
      </div>
      <div class="qf-section-label">OPERACIÓN</div>
      <div class="qf-nav"></div>
      <div class="qf-sidebar-foot"><span class="qf-live-dot"></span> Sistema en línea</div>`;
    const navBox=side.querySelector('.qf-nav');
    [...nav.querySelectorAll('button,a')].forEach(b=>{b.classList.add('qf-nav-btn');navBox.appendChild(b)});
    const main=document.createElement('div');
    main.className='qf-main';
    const top=document.createElement('header');
    top.className='qf-topbar';
    top.innerHTML=`<div><div class="qf-page-context">CENTRO DE CONTROL</div><div class="qf-welcome">Administración de Planta</div></div><div class="qf-top-actions"><span class="qf-status"><i></i> EN LÍNEA</span><button id="qfLogout" type="button">Salir</button></div>`;
    const area=document.createElement('div');area.className='qf-content';area.appendChild(content);
    main.append(top,area);shell.append(side,main);
    app.innerHTML='';app.appendChild(shell);
    document.getElementById('qfLogout').onclick=()=>document.getElementById('logout')?.click();
    mounted=true;
  }
  const observer=new MutationObserver(()=>{try{if(!document.querySelector('.qf-shell'))apply()}catch(e){}});
  observer.observe(document.body,{childList:true,subtree:true});
  setInterval(()=>{try{if(!document.querySelector('.qf-shell'))apply()}catch(e){}},300);
})();
