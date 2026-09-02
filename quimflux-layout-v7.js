/* =========================================================
   QUIMFLUX V7 · Layout tipo aplicación
   Sidebar izquierda + barra superior + contenido claro.
   No modifica main.js ni la lógica de los módulos.
========================================================= */
(function(){
  const logo='./quimflux-logo.png';

  function apply(){
    const app=document.querySelector('#app');
    if(!app) return;
    if(app.querySelector('.qf-v7-shell')) return;

    const header=app.querySelector('header');
    const nav=app.querySelector('nav');
    const content=app.querySelector('#content');
    if(!header||!nav||!content) return;

    const buttons=[...nav.querySelectorAll('button,a')];
    if(!buttons.length) return;

    const shell=document.createElement('div'); shell.className='qf-v7-shell';
    const side=document.createElement('aside'); side.className='qf-v7-sidebar';
    side.innerHTML=`
      <div class="qf-v7-brand"><img src="${logo}" alt="QUIMFLUX"></div>
      <div class="qf-v7-nav">
        <div class="qf-v7-section">Principal</div>
      </div>
      <div class="qf-v7-footer">QUIMFLUX · Administrador de Planta<br>© 2026</div>`;

    const navBox=side.querySelector('.qf-v7-nav');
    const groups={
      principal:['Dashboard','Resumen Ejecutivo','Registro Diario','Costos'],
      operaciones:['Producción','Despachos','Recepciones','Inventario'],
      mantenimiento:['Mantenimiento'],
      gestion:['Personal','SSOMA']
    };
    const ordered=[];
    const byText=new Map(buttons.map(b=>[b.textContent.trim(),b]));
    Object.entries(groups).forEach(([group,names])=>{
      const available=names.filter(n=>byText.has(n));
      if(!available.length)return;
      if(group!=='principal'){
        const label=document.createElement('div'); label.className='qf-v7-section';
        label.textContent=group==='operaciones'?'Operaciones':group==='mantenimiento'?'Mantenimiento':'Gestión';
        navBox.appendChild(label);
      }
      available.forEach(name=>{const b=byText.get(name); ordered.push(b); navBox.appendChild(b)});
    });
    buttons.filter(b=>!ordered.includes(b)).forEach(b=>navBox.appendChild(b));

    const main=document.createElement('div'); main.className='qf-v7-main';
    const top=document.createElement('div'); top.className='qf-v7-topbar';
    top.innerHTML=`
      <div class="qf-v7-title">
        <h2 id="qf-v7-page-title">Dashboard</h2><span>•</span><span>Resumen general de la planta</span>
      </div>
      <div class="qf-v7-user">● &nbsp;<b>Administrador</b></div>`;

    const area=document.createElement('div'); area.className='qf-v7-content'; area.appendChild(content);
    main.append(top,area); shell.append(side,main);
    app.innerHTML=''; app.appendChild(shell);

    updateTitle();
  }

  function updateTitle(){
    const active=document.querySelector('.qf-v7-nav button.active,.qf-v7-nav button.qf-active');
    const title=document.querySelector('#qf-v7-page-title');
    if(active&&title) title.textContent=active.textContent.trim();
  }

  new MutationObserver(()=>{try{apply();updateTitle()}catch(e){console.error('QUIMFLUX V7',e)}})
    .observe(document.body,{childList:true,subtree:true});

  setInterval(()=>{try{apply();updateTitle()}catch(e){}},400);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply); else apply();
})();
