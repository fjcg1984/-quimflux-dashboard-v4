/* QUIMFLUX · Layout final inspirado en el bosquejo aprobado */
(function(){
  const NAV_ORDER=['Dashboard','Resumen Ejecutivo','Registro Diario','Costos','Producción','Despachos','Recepciones','Inventario','Mantenimiento','Personal','SSOMA'];
  let lastApp=null;

  function apply(){
    const app=document.querySelector('#app');
    if(!app || app===lastApp && document.querySelector('.qf-final-shell')) return;
    const header=app.querySelector('header');
    const nav=app.querySelector('nav');
    const content=app.querySelector('#content');
    if(!header||!nav||!content) return;

    const buttons=[...nav.querySelectorAll('button,a')];
    if(!buttons.length) return;

    const shell=document.createElement('div');
    shell.className='qf-final-shell';
    const side=document.createElement('aside');
    side.className='qf-final-sidebar';
    side.innerHTML=`
      <div class="qf-final-brand"><img src="./quimflux-logo.png" alt="QUIMFLUX"><div>Administrador de Planta</div></div>
      <div class="qf-final-nav-title">PRINCIPAL</div>
      <div class="qf-final-nav" data-qf-final-nav></div>
      <div class="qf-final-footer">QUIMFLUX<br><span>Administrador de Planta</span><small>© 2026 QUIMFLUX</small></div>`;

    const navBox=side.querySelector('[data-qf-final-nav]');
    const ordered=[];
    NAV_ORDER.forEach(label=>{
      const b=buttons.find(x=>x.textContent.trim()===label);
      if(b && !ordered.includes(b)) ordered.push(b);
    });
    buttons.forEach(b=>{if(!ordered.includes(b)) ordered.push(b)});
    ordered.forEach(b=>{
      b.classList.add('qf-final-nav-btn');
      navBox.appendChild(b);
    });

    const main=document.createElement('section');
    main.className='qf-final-main';
    const top=document.createElement('header');
    top.className='qf-final-topbar';
    top.innerHTML=`
      <div><h1>Dashboard</h1><p>Resumen general de la planta</p></div>
      <div class="qf-final-top-actions"><span class="qf-final-live">● Sistema activo</span><span>${new Date().toLocaleDateString('es-PE',{day:'2-digit',month:'long',year:'numeric'})}</span></div>`;
    const area=document.createElement('div');
    area.className='qf-final-content';
    area.appendChild(content);
    main.append(top,area);
    shell.append(side,main);
    app.innerHTML='';
    app.appendChild(shell);
    lastApp=app;
    syncActive();
  }

  function syncActive(){
    const all=[...document.querySelectorAll('.qf-final-nav-btn')];
    all.forEach(b=>{
      const active=b.classList.contains('active') || b.classList.contains('selected');
      b.classList.toggle('qf-final-active',active);
    });
  }

  function watch(){
    apply();
    syncActive();
  }
  new MutationObserver(watch).observe(document.body,{childList:true,subtree:true});
  setInterval(watch,800);
  window.addEventListener('load',watch);
})();
