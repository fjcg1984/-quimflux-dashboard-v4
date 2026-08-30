import { createClient } from '@supabase/supabase-js';
import './styles.css';

const SUPABASE_URL = 'https://cgkdztwtodmdteohvuoh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sULeDyfJ1l5xfuVhFgXRKA_bsim9qSe';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const app = document.getElementById('app');

const fields = [
  ['fecha','Fecha','date'],
  ['turno','Turno','select'],
  ['producto','Producto','text'],
  ['programada','Cantidad programada','number'],
  ['producida','Cantidad producida','number'],
  ['mp','Materia prima consumida','number'],
  ['merma','Merma','number'],
  ['horas_turno','Horas de turno','number'],
  ['horas_paradas','Horas de parada','number'],
  ['personal_programado','Personal programado','number'],
  ['personal_presente','Personal presente','number'],
  ['rechazadas','Unidades rechazadas','number'],
  ['costo_produccion','Costo producción (S/)','number'],
  ['energia','Energía (kWh)','number'],
  ['costo_mantenimiento','Costo mantenimiento (S/)','number'],
  ['incidentes','Incidentes SSOMA','number'],
  ['pedidos_programados','Pedidos programados','number'],
  ['pedidos_tiempo','Pedidos a tiempo','number'],
  ['reproceso','Reproceso','number'],
  ['no_conformidades','No conformidades','number'],
  ['observaciones','Observaciones','textarea']
];

const today = new Date().toISOString().slice(0,10);

let user = null;
let rows = [];
let tab = 'dashboard';

let metas = {
  cumplimiento:0.95,
  merma:0.02,
  yield:0.95,
  disponibilidad:0.90,
  asistencia:0.95,
  rechazo:0.03,
  otif:0.95,
  incidentes:0
};

function esc(v=''){
  return String(v).replace(/[&<>"']/g,c=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#039;'
  }[c]));
}

function n(v){
  const x=Number(v);
  return Number.isFinite(x)?x:0;
}

function pct(v){
  return (n(v)*100).toFixed(1)+'%';
}

function money(v){
  return 'S/ '+n(v).toLocaleString('es-PE',{
    minimumFractionDigits:2,
    maximumFractionDigits:2
  });
}

function derive(r){
  const p=n(r.programada);
  const q=n(r.producida);
  const mp=n(r.mp);
  const h=n(r.horas_turno);
  const stop=n(r.horas_paradas);
  const pp=n(r.personal_programado);
  const pa=n(r.personal_presente);
  const rej=n(r.rechazadas);
  const pedidos=n(r.pedidos_programados);
  const at=n(r.pedidos_tiempo);

  const cumplimiento=p?q/p:0;
  const merma=mp?n(r.merma)/mp:0;
  const yieldRate=mp?q/mp:0;
  const disponibilidad=h?Math.max(0,(h-stop)/h):0;
  const asistencia=pp?pa/pp:0;
  const rechazo=q?rej/q:0;
  const otif=pedidos?at/pedidos:0;

  const calidad=Math.max(0,1-rechazo);

  const oee=disponibilidad*yieldRate*calidad;

  return {
    ...r,
    cumplimiento,
    merma,
    yieldRate,
    disponibilidad,
    asistencia,
    rechazo,
    otif,
    oee,
    costoUnitario:q?n(r.costo_produccion)/q:0,
    energiaUnit:q?n(r.energia)/q:0
  };
}

function empty(){
  return {
    fecha:today,
    turno:'Mañana',
    producto:'',
    programada:0,
    producida:0,
    mp:0,
    merma:0,
    horas_turno:8,
    horas_paradas:0,
    personal_programado:0,
    personal_presente:0,
    rechazadas:0,
    costo_produccion:0,
    energia:0,
    costo_mantenimiento:0,
    incidentes:0,
    pedidos_programados:0,
    pedidos_tiempo:0,
    reproceso:0,
    no_conformidades:0,
    observaciones:''
  };
}

/* =========================
   ESTILOS DEL DASHBOARD
========================= */

function dashboardStyles(){
  if(document.getElementById('qfStyles')) return;

  const s=document.createElement('style');
  s.id='qfStyles';

  s.textContent=`
    .qf-grid{
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(190px,1fr));
      gap:12px;
      margin:18px 0;
    }

    .qf-card{
      background:#151b22;
      border:1px solid #2d3742;
      border-radius:14px;
      padding:16px;
      min-height:100px;
    }

    .qf-card small{
      display:block;
      color:#9aa6b2;
      margin-bottom:8px;
    }

    .qf-card strong{
      display:block;
      font-size:25px;
      margin-bottom:7px;
    }

    .qf-badge{
      display:inline-block;
      border-radius:20px;
      padding:4px 9px;
      font-size:11px;
      font-weight:bold;
    }

    .qf-ok{
      background:#173d29;
      color:#54d98a;
    }

    .qf-warn{
      background:#403619;
      color:#f2c94c;
    }

    .qf-critical{
      background:#431d22;
      color:#ff6875;
    }

    .qf-panels{
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(300px,1fr));
      gap:15px;
      margin-top:15px;
    }

    .qf-panel{
      background:#11171e;
      border:1px solid #2d3742;
      border-radius:14px;
      padding:16px;
    }

    .qf-panel h2{
      margin-top:0;
    }

    .qf-chart{
      width:100%;
      overflow:hidden;
    }

    .qf-bar-row{
      margin:13px 0;
    }

    .qf-bar-label{
      display:flex;
      justify-content:space-between;
      margin-bottom:5px;
      font-size:13px;
    }

    .qf-bar-bg{
      height:12px;
      background:#252d36;
      border-radius:10px;
      overflow:hidden;
    }

    .qf-bar{
      height:100%;
      border-radius:10px;
      background:#39a0ff;
    }

    .qf-executive{
      background:linear-gradient(135deg,#111923,#172431);
      border:1px solid #344454;
      border-radius:16px;
      padding:18px;
      margin-bottom:15px;
    }

    .qf-executive h2{
      margin-top:0;
    }

    .qf-alert{
      padding:12px;
      border-radius:10px;
      margin:8px 0;
      background:#241d16;
      border:1px solid #59442a;
    }

    .qf-table{
      width:100%;
      border-collapse:collapse;
      font-size:13px;
    }

    .qf-table th,
    .qf-table td{
      padding:9px;
      border-bottom:1px solid #29323b;
      text-align:left;
    }

    .qf-table th{
      color:#aeb9c5;
    }

    .qf-mini{
      color:#9aa6b2;
      font-size:13px;
    }

    @media(max-width:600px){
      .qf-grid{
        grid-template-columns:repeat(2,1fr);
      }

      .qf-card{
        padding:12px;
      }

      .qf-card strong{
        font-size:20px;
      }

      .qf-panels{
        grid-template-columns:1fr;
      }

      .qf-table{
        font-size:11px;
      }
    }
  `;

  document.head.appendChild(s);
}

/* =========================
   AUTENTICACIÓN
========================= */

function renderAuth(){

  app.innerHTML=`
  <div class="auth">
    <div class="authCard">
      <div class="logo">QUIMFLUX</div>
      <h1>Administrador de Planta</h1>
      <p>Inicia sesión para acceder al dashboard.</p>

      <form id="authForm">

        <label>
          Correo
          <input id="email" type="email" required autocomplete="email">
        </label>

        <label>
          Contraseña
          <input id="password" type="password"
                 minlength="6"
                 required
                 autocomplete="current-password">
        </label>

        <div id="authMsg" class="msg"></div>

        <button class="primary" type="submit">
          Entrar
        </button>

        <button class="link" id="signup" type="button">
          Crear una cuenta
        </button>

      </form>
    </div>
  </div>`;

  document.getElementById('authForm').onsubmit=async e=>{
    e.preventDefault();

    const msg=document.getElementById('authMsg');
    const email=document.getElementById('email').value;
    const password=document.getElementById('password').value;

    msg.textContent='Procesando…';

    const {data,error}=await supabase.auth.signInWithPassword({
      email,
      password
    });

    if(error){
      msg.textContent=error.message;
    }else{
      user=data.user;
      await load();
      render();
    }
  };

  document.getElementById('signup').onclick=async()=>{

    const msg=document.getElementById('authMsg');
    const email=document.getElementById('email').value;
    const password=document.getElementById('password').value;

    msg.textContent='Creando cuenta…';

    const {data,error}=await supabase.auth.signUp({
      email,
      password
    });

    msg.textContent=error
      ?error.message
      :(data.session
        ?'Cuenta creada.'
        :'Cuenta creada. Revisa tu correo si Supabase solicita confirmación.');
  };
}

/* =========================
   MENÚ
========================= */

function render(){

  dashboardStyles();

  if(!user){
    renderAuth();
    return;
  }

  const nav=[
    ['dashboard','Dashboard'],
    ['registro','Registro Diario'],
    ['resumen','Resumen Ejecutivo'],
    ['costos','Costos'],
    ['mantenimiento','Mantenimiento'],
    ['inventario','Inventario'],
    ['personal','Personal'],
    ['ssoma','SSOMA']
  ];

  app.innerHTML=`
    <header>
      <div>
        <b>QUIMFLUX</b>
        <span> · Administrador de Planta V4</span>
      </div>
      <button id="logout" class="logout">Salir</button>
    </header>

    <nav>
      ${nav.map(x=>`
        <button
          data-tab="${x[0]}"
          class="${tab===x[0]?'active':''}">
          ${x[1]}
        </button>
      `).join('')}
    </nav>

    <div id="content"></div>
  `;

  document.querySelectorAll('nav button').forEach(b=>{
    b.onclick=()=>{
      tab=b.dataset.tab;
      render();
    };
  });

  document.getElementById('logout').onclick=async()=>{
    await supabase.auth.signOut();
  };

  if(tab==='dashboard') renderDashboard();
  else if(tab==='registro') renderForm();
  else if(tab==='resumen') renderResumen();
  else if(tab==='costos') renderCostos();
  else if(tab==='mantenimiento') renderMantenimiento();
  else if(tab==='personal') renderPersonal();
  else if(tab==='ssoma') renderSSOMA();
  else renderInventario();
}

/* =========================
   CÁLCULO GENERAL
========================= */

function calculate(){

  const d=rows.map(derive);

  const sum=k=>d.reduce((s,r)=>s+n(r[k]),0);

  const programada=sum('programada');
  const producida=sum('producida');
  const mp=sum('mp');
  const merma=sum('merma');
  const horas=sum('horas_turno');
  const paradas=sum('horas_paradas');
  const pp=sum('personal_programado');
  const pa=sum('personal_presente');
  const rechazadas=sum('rechazadas');
  const pedidos=sum('pedidos_programados');
  const aTiempo=sum('pedidos_tiempo');

  const cumplimiento=programada?producida/programada:0;
  const yieldRate=mp?producida/mp:0;
  const mermaRate=mp?merma/mp:0;
  const disponibilidad=horas?Math.max(0,(horas-paradas)/horas):0;
  const asistencia=pp?pa/pp:0;
  const rechazo=producida?rechazadas/producida:0;
  const otif=pedidos?aTiempo/pedidos:0;

  const oee=disponibilidad*yieldRate*Math.max(0,1-rechazo);

  return {
    d,
    programada,
    producida,
    mp,
    merma,
    horas,
    paradas,
    pp,
    pa,
    rechazadas,
    pedidos,
    aTiempo,
    cumplimiento,
    yieldRate,
    mermaRate,
    disponibilidad,
    asistencia,
    rechazo,
    otif,
    oee,
    costo:sum('costo_produccion'),
    mantenimiento:sum('costo_mantenimiento'),
    energia:sum('energia'),
    incidentes:sum('incidentes'),
    reproceso:sum('reproceso'),
    nc:sum('no_conformidades'),
    unit:producida?sum('costo_produccion')/producida:0,
    energyUnit:producida?sum('energia')/producida:0
  };
}

function status(value,target,invert=false){

  const ok=invert
    ?value<=target
    :value>=target;

  const critical=invert
    ?value>target*1.5
    :value<target*0.85;

  return {
    label:critical?'CRÍTICO':ok?'OK':'REVISAR',
    cls:critical?'qf-critical':ok?'qf-ok':'qf-warn'
  };
}

/* =========================
   DASHBOARD GERENCIAL
========================= */

function renderDashboard(){

  const k=calculate();

  const cards=[
    ['Producción',k.producida.toLocaleString('es-PE')+' kg'],
    ['Cumplimiento',pct(k.cumplimiento),status(k.cumplimiento,metas.cumplimiento)],
    ['OEE',pct(k.oee),status(k.oee,.80)],
    ['Disponibilidad',pct(k.disponibilidad),status(k.disponibilidad,metas.disponibilidad)],
    ['Yield',pct(k.yieldRate),status(k.yieldRate,metas.yield)],
    ['Merma',pct(k.mermaRate),status(k.mermaRate,metas.merma,true)],
    ['Rechazo',pct(k.rechazo),status(k.rechazo,metas.rechazo,true)],
    ['OTIF',pct(k.otif),status(k.otif,metas.otif)],
    ['Asistencia',pct(k.asistencia),status(k.asistencia,metas.asistencia)],
    ['Horas parada',k.paradas.toFixed(1)+' h'],
    ['Costo producción',money(k.costo)],
    ['Costo unitario',money(k.unit)],
    ['Mantenimiento',money(k.mantenimiento)],
    ['Energía',k.energyUnit.toFixed(3)+' kWh/kg'],
    ['Incidentes',String(k.incidentes),status(k.incidentes,metas.incidentes,true)]
  ];

  const alertas=[];

  if(k.oee<.80) alertas.push('OEE por debajo del 80%.');
  if(k.cumplimiento<metas.cumplimiento) alertas.push('Producción por debajo de la meta.');
  if(k.mermaRate>metas.merma) alertas.push('Merma por encima de la meta.');
  if(k.disponibilidad<metas.disponibilidad) alertas.push('Disponibilidad de planta por debajo de la meta.');
  if(k.rechazo>metas.rechazo) alertas.push('Rechazo de calidad por encima de la meta.');
  if(k.incidentes>0) alertas.push('Existen incidentes SSOMA registrados.');

  document.getElementById('content').innerHTML=`

  <main>

    <div class="qf-executive">

      <h1>Dashboard Gerencial QUIMFLUX</h1>

      <p class="qf-mini">
        Visión consolidada de producción, eficiencia,
        calidad, costos, personal y SSOMA.
      </p>

      <p>
        <b>${rows.length}</b> registros analizados
      </p>

      ${
        alertas.length
        ?alertas.map(a=>`<div class="qf-alert">⚠️ ${a}</div>`).join('')
        :'<div class="qf-alert">✅ Operación sin alertas críticas registradas.</div>'
      }

    </div>

    <div class="qf-grid">

      ${cards.map(c=>`
        <div class="qf-card">
          <small>${c[0]}</small>
          <strong>${c[1]}</strong>
          ${c[2]?`
            <span class="qf-badge ${c[2].cls}">
              ${c[2].label}
            </span>
          `:''}
        </div>
      `).join('')}

    </div>

    <div class="qf-panels">

      <section class="qf-panel">
        <h2>Producción vs. programado</h2>
        ${bar('Programada',k.programada,k.programada)}
        ${bar('Producida',k.producida,k.programada)}
      </section>

      <section class="qf-panel">
        <h2>Indicadores clave</h2>
        ${bar('OEE',k.oee,1)}
        ${bar('Disponibilidad',k.disponibilidad,1)}
        ${bar('Yield',k.yieldRate,1)}
        ${bar('Cumplimiento',k.cumplimiento,1)}
      </section>

      <section class="qf-panel">
        <h2>Calidad</h2>
        ${bar('Merma',k.mermaRate,Math.max(metas.merma,.05))}
        ${bar('Rechazo',k.rechazo,Math.max(metas.rechazo,.05))}
        ${bar('Reproceso',k.reproceso,Math.max(k.producida,.01))}
        ${bar('No conformidades',k.nc,Math.max(k.producida,.01))}
      </section>

      <section class="qf-panel">
        <h2>Costos</h2>
        <p><b>Producción:</b> ${money(k.costo)}</p>
        <p><b>Mantenimiento:</b> ${money(k.mantenimiento)}</p>
        <p><b>Costo unitario:</b> ${money(k.unit)}</p>
        <p><b>Energía:</b> ${k.energyUnit.toFixed(3)} kWh/kg</p>
      </section>

    </div>

    <section class="qf-panel" style="margin-top:15px">

      <h2>Últimos registros</h2>

      ${
        k.d.length
        ?`
        <div style="overflow-x:auto">

          <table class="qf-table">

            <thead>
              <tr>
                <th>Fecha</th>
                <th>Turno</th>
                <th>Producto</th>
                <th>Programado</th>
                <th>Producido</th>
                <th>OEE</th>
              </tr>
            </thead>

            <tbody>

              ${k.d.slice(-15).reverse().map(r=>`
                <tr>
                  <td>${esc(r.fecha)}</td>
                  <td>${esc(r.turno)}</td>
                  <td>${esc(r.producto)}</td>
                  <td>${n(r.programada)}</td>
                  <td>${n(r.producida)}</td>
                  <td>${pct(r.oee)}</td>
                </tr>
              `).join('')}

            </tbody>

          </table>

        </div>
        `
        :`
        <p>
          Todavía no existen registros.
          Ve a <b>Registro Diario</b>.
        </p>
        `
      }

    </section>

  </main>`;
}

function bar(label,value,max){

  const width=max?Math.min(100,Math.max(0,value/max*100)):0;

  return `
    <div class="qf-bar-row">

      <div class="qf-bar-label">
        <span>${label}</span>
        <b>${typeof value==='number'
          ?(value<2?pct(value):value.toFixed(1))
          :value}</b>
      </div>

      <div class="qf-bar-bg">
        <div class="qf-bar" style="width:${width}%"></div>
      </div>

    </div>
  `;
}

/* =========================
   RESUMEN EJECUTIVO
========================= */

function renderResumen(){

  const k=calculate();

  document.getElementById('content').innerHTML=`

  <main>

    <h1>Resumen Ejecutivo</h1>

    <section class="qf-executive">

      <h2>Situación de la planta</h2>

      <p>
        Se han registrado <b>${rows.length}</b> jornadas/turnos.
      </p>

      <p>
        La producción acumulada es de
        <b>${k.producida.toLocaleString('es-PE')} kg</b>,
        frente a
        <b>${k.programada.toLocaleString('es-PE')} kg</b>
        programados.
      </p>

      <p>
        Cumplimiento:
        <b>${pct(k.cumplimiento)}</b>
      </p>

      <p>
        OEE:
        <b>${pct(k.oee)}</b>
      </p>

      <p>
        Disponibilidad:
        <b>${pct(k.disponibilidad)}</b>
      </p>

      <p>
        Yield:
        <b>${pct(k.yieldRate)}</b>
      </p>

    </section>

    <section class="qf-panel">

      <h2>Lectura gerencial</h2>

      <ul>

        <li>
          Producción:
          ${k.cumplimiento>=metas.cumplimiento
            ?'cumple la meta.'
            :'requiere seguimiento.'}
        </li>

        <li>
          Eficiencia:
          ${k.oee>=.80
            ?'OEE en rango objetivo.'
            :'OEE requiere intervención.'}
        </li>

        <li>
          Calidad:
          ${k.rechazo<=metas.rechazo
            ?'rechazo dentro de meta.'
            :'rechazo por encima de meta.'}
        </li>

        <li>
          Merma:
          ${k.mermaRate<=metas.merma
            ?'dentro del objetivo.'
            :'por encima del objetivo.'}
        </li>

        <li>
          Paradas:
          <b>${k.paradas.toFixed(1)} horas</b>
          acumuladas.
        </li>

      </ul>

    </section>

  </main>`;
}

/* =========================
   COSTOS
========================= */

function renderCostos(){

  const k=calculate();

  document.getElementById('content').innerHTML=`

  <main>

    <h1>Costos</h1>

    <div class="qf-grid">

      <div class="qf-card">
        <small>Costo producción</small>
        <strong>${money(k.costo)}</strong>
      </div>

      <div class="qf-card">
        <small>Costo unitario</small>
        <strong>${money(k.unit)}</strong>
      </div>

      <div class="qf-card">
        <small>Mantenimiento</small>
        <strong>${money(k.mantenimiento)}</strong>
      </div>

      <div class="qf-card">
        <small>Energía total</small>
        <strong>${k.energia.toLocaleString('es-PE')} kWh</strong>
      </div>

      <div class="qf-card">
        <small>Energía por kg</small>
        <strong>${k.energyUnit.toFixed(3)} kWh/kg</strong>
      </div>

    </div>

    <section class="qf-panel">

      <h2>Detalle económico</h2>

      <p>
        Costo de producción:
        <b>${money(k.costo)}</b>
      </p>

      <p>
        Costo mantenimiento:
        <b>${money(k.mantenimiento)}</b>
      </p>

      <p>
        Producción:
        <b>${k.producida.toLocaleString('es-PE')} kg</b>
      </p>

      <p>
        Costo promedio:
        <b>${money(k.unit)} / kg</b>
      </p>

    </section>

  </main>`;
}

/* =========================
   MANTENIMIENTO
========================= */

function renderMantenimiento(){

  const k=calculate();

  document.getElementById('content').innerHTML=`

  <main>

    <h1>Mantenimiento</h1>

    <div class="qf-grid">

      <div class="qf-card">
        <small>Costo mantenimiento</small>
        <strong>${money(k.mantenimiento)}</strong>
      </div>

      <div class="qf-card">
        <small>Horas de parada</small>
        <strong>${k.paradas.toFixed(1)} h</strong>
      </div>

      <div class="qf-card">
        <small>Disponibilidad</small>
        <strong>${pct(k.disponibilidad)}</strong>
      </div>

    </div>

    <section class="qf-panel">

      <h2>Indicador operativo</h2>

      ${bar('Disponibilidad',k.disponibilidad,1)}

      <p class="qf-mini">
        El módulo utiliza las horas de parada
        registradas en Registro Diario.
      </p>

    </section>

  </main>`;
}

/* =========================
   PERSONAL
========================= */

function renderPersonal(){

  const k=calculate();

  document.getElementById('content').innerHTML=`

  <main>

    <h1>Personal</h1>

    <div class="qf-grid">

      <div class="qf-card">
        <small>Personal programado</small>
        <strong>${k.pp}</strong>
      </div>

      <div class="qf-card">
        <small>Personal presente</small>
        <strong>${k.pa}</strong>
      </div>

      <div class="qf-card">
        <small>Asistencia</small>
        <strong>${pct(k.asistencia)}</strong>
      </div>

    </div>

    <section class="qf-panel">

      <h2>Asistencia</h2>

      ${bar('Asistencia',k.asistencia,1)}

    </section>

  </main>`;
}

/* =========================
   SSOMA
========================= */

function renderSSOMA(){

  const k=calculate();

  document.getElementById('content').innerHTML=`

  <main>

    <h1>SSOMA</h1>

    <div class="qf-grid">

      <div class="qf-card">
        <small>Incidentes</small>
        <strong>${k.incidentes}</strong>
      </div>

      <div class="qf-card">
        <small>No conformidades</small>
        <strong>${k.nc}</strong>
      </div>

      <div class="qf-card">
        <small>Reproceso</small>
        <strong>${k.reproceso}</strong>
      </div>

    </div>

    <section class="qf-panel">

      <h2>Estado SSOMA</h2>

      ${
        k.incidentes===0
        ?'<p>✅ No existen incidentes registrados.</p>'
        :`<p>⚠️ Se registran <b>${k.incidentes}</b> incidentes.</p>`
      }

    </section>

  </main>`;
}

/* =========================
   INVENTARIO
========================= */

function renderInventario(){

  document.getElementById('content').innerHTML=`

  <main>

    <h1>Inventario</h1>

    <section class="qf-panel">

      <h2>Materia prima</h2>

      <p>
        Consumo acumulado:
        <b>${calculate().mp.toLocaleString('es-PE')}</b>
      </p>

      <p class="qf-mini">
        El inventario físico requiere posteriormente
        una tabla específica de existencias, entradas,
        salidas y stock mínimo en Supabase.
      </p>

    </section>

  </main>`;
}

/* =========================
   REGISTRO DIARIO
========================= */

function renderForm(){

  const r=empty();

  document.getElementById('content').innerHTML=`

  <main>

    <h1>Registro Diario</h1>

    <p>
      Ingresa los datos del turno.
      Los KPI se calculan automáticamente.
    </p>

    <form id="daily" class="formGrid">

      <section>
        <h2>Producción</h2>
        ${fields.slice(0,7).map(f=>control(f,r)).join('')}
      </section>

      <section>
        <h2>Operación y personal</h2>
        ${fields.slice(7,12).map(f=>control(f,r)).join('')}
      </section>

      <section>
        <h2>Costos y energía</h2>
        ${fields.slice(12,15).map(f=>control(f,r)).join('')}
      </section>

      <section>
        <h2>Despacho y SSOMA</h2>
        ${fields.slice(15).map(f=>control(f,r)).join('')}
      </section>

      <div id="saveMsg" class="msg full"></div>

      <button class="primary full" type="submit">
        Guardar registro diario
      </button>

    </form>

  </main>`;

  document.getElementById('daily').onsubmit=async e=>{

    e.preventDefault();

    const msg=document.getElementById('saveMsg');

    const payload={
      user_id:user.id
    };

    fields.forEach(([key,,type])=>{

      const el=document.getElementById('f_'+key);

      payload[key]=type==='number'
        ?(el.value===''?null:n(el.value))
        :el.value;

    });

    msg.textContent='Guardando…';

    const {error}=await supabase
      .from('daily_records')
      .insert(payload);

    if(error){

      msg.textContent=error.message;

    }else{

      msg.textContent='Registro guardado correctamente.';

      await load();

      setTimeout(()=>{
        tab='dashboard';
        render();
      },500);

    }
  };
}

function control(f,r){

  const [key,label,type]=f;

  let input;

  if(type==='select'){

    input=`
      <select id="f_${key}">
        <option>Mañana</option>
        <option>Tarde</option>
        <option>Noche</option>
      </select>`;

  }else if(type==='textarea'){

    input=`<textarea id="f_${key}"></textarea>`;

  }else{

    input=`
      <input
        id="f_${key}"
        type="${type}"
        value="${esc(r[key])}"
        ${type==='number'?'step="any"':''}
      >`;

  }

  return `<label>${label}${input}</label>`;
}

/* =========================
   SUPABASE
========================= */

async function load(){

  const r=await supabase
    .from('daily_records')
    .select('*')
    .order('fecha',{ascending:true});

  if(!r.error){
    rows=r.data||[];
  }

  const s=await supabase
    .from('app_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  if(s.data){

    metas={
      ...metas,

      cumplimiento:n(s.data.meta_cumplimiento)||metas.cumplimiento,
      merma:n(s.data.meta_merma)||metas.merma,
      yield:n(s.data.meta_yield)||metas.yield,
      disponibilidad:n(s.data.meta_disponibilidad)||metas.disponibilidad,
      asistencia:n(s.data.meta_asistencia)||metas.asistencia,
      rechazo:n(s.data.meta_rechazo)||metas.rechazo,
      otif:n(s.data.meta_entregas)||metas.otif,
      incidentes:n(s.data.meta_incidentes)
    };
  }
}

/* =========================
   INICIO
========================= */

supabase.auth.getSession().then(async({data})=>{

  user=data.session?.user||null;

  if(user){
    await load();
  }

  render();

});

supabase.auth.onAuthStateChange((_event,session)=>{

  user=session?.user||null;

  render();
