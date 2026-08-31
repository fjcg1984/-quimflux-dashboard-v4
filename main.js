import { createClient } from '@supabase/supabase-js';
import './styles.css';

const SUPABASE_URL = 'https://cgkdztwtodmdteohvuoh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sULeDyfJ1l5xfuVhFgXRKA_bsim9qSe';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

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

const today = new Date()
  .toISOString()
  .slice(0,10);

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


/* ==========================================================
   FUNCIONES GENERALES
   ========================================================== */

function esc(v=''){
  return String(v).replace(
    /[&<>"']/g,
    c => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#039;'
    }[c])
  );
}


function n(v){
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}


function pct(v){
  return (n(v) * 100).toFixed(1) + '%';
}


function status(
  value,
  target,
  invert=false
){

  const ok = invert
    ? value <= target
    : value >= target;

  const critical = invert
    ? value > target * 1.5
    : value < target * 0.85;

  return {
    ok,
    critical,
    label:
      critical
        ? 'CRÍTICO'
        : ok
          ? 'OK'
          : 'REVISAR',

    cls:
      critical
        ? 'critical'
        : ok
          ? 'ok'
          : 'warn'
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


/* ==========================================================
   CÁLCULO DE KPI
   ========================================================== */

function derive(r){

  const p = n(r.programada);

  const q = n(r.producida);

  const mp = n(r.mp);

  const merma = n(r.merma);

  const h = n(r.horas_turno);

  const stop = n(r.horas_paradas);

  const pp = n(r.personal_programado);

  const pa = n(r.personal_presente);

  const rej = n(r.rechazadas);

  const pedidos = n(r.pedidos_programados);

  const at = n(r.pedidos_tiempo);


  const cumplimiento =
    p ? q / p : 0;


  /* ========================================================
     YIELD CORREGIDO
     
     Yield = (MP - Merma) / MP
     
     Mide el aprovechamiento de materia prima.
     Nunca puede superar 100%.
     ======================================================== */

  const yieldRate =
    mp
      ? Math.max(
          0,
          Math.min(
            1,
            (mp - merma) / mp
          )
        )
      : 0;


  const mermaRate =
    mp
      ? Math.max(
          0,
          merma / mp
        )
      : 0;


  const disponibilidad =
    h
      ? Math.max(
          0,
          (h - stop) / h
        )
      : 0;


  const asistencia =
    pp ? pa / pp : 0;


  const rechazo =
    q ? rej / q : 0;


  const otif =
    pedidos ? at / pedidos : 0;


  const oee =
    disponibilidad *
    yieldRate *
    Math.max(
      0,
      1-rechazo
    );


  return {

    ...r,

    cumplimiento,

    merma:mermaRate,

    yieldRate,

    disponibilidad,

    asistencia,

    rechazo,

    oee,

    otif,

    costoUnitario:
      q
        ? n(r.costo_produccion) / q
        : 0,

    energiaUnit:
      q
        ? n(r.energia) / q
        : 0
  };
}


/* ==========================================================
   AUTENTICACIÓN
   ========================================================== */

function renderAuth(){

  app.innerHTML = `

    <div class="auth">

      <div class="authCard">

        <div class="logo">
          QUIMFLUX
        </div>

        <h1>
          Administrador de Planta
        </h1>

        <p>
          Inicia sesión para acceder al dashboard.
        </p>

        <form id="authForm">

          <label>
            Correo

            <input
              id="email"
              type="email"
              required
              autocomplete="email"
            >

          </label>

          <label>
            Contraseña

            <input
              id="password"
              type="password"
              minlength="6"
              required
              autocomplete="current-password"
            >

          </label>

          <div
            id="authMsg"
            class="msg"
          ></div>

          <button
            class="primary"
            type="submit"
          >
            Entrar
          </button>

          <button
            class="link"
            id="signup"
            type="button"
          >
            Crear una cuenta
          </button>

        </form>

      </div>

    </div>
  `;


  document
    .getElementById('authForm')
    .onsubmit = async e => {

      e.preventDefault();

      const msg =
        document.getElementById('authMsg');

      msg.textContent =
        'Procesando…';


      const {
        data,
        error
      } =
        await supabase.auth.signInWithPassword({

          email:
            document.getElementById('email').value,

          password:
            document.getElementById('password').value
        });


      if(error){

        msg.textContent =
          error.message;

        return;
      }


      user = data.user;

      await load();

      render();
    };


  document
    .getElementById('signup')
    .onclick = async () => {

      const msg =
        document.getElementById('authMsg');


      const email =
        document.getElementById('email').value;

      const password =
        document.getElementById('password').value;


      msg.textContent =
        'Creando cuenta…';


      const {
        data,
        error
      } =
        await supabase.auth.signUp({
          email,
          password
        });


      msg.textContent =
        error
          ? error.message
          :
          (
            data.session
              ? 'Cuenta creada.'
              : 'Cuenta creada. Revisa tu correo si Supabase solicita confirmación.'
          );
    };
}


/* ==========================================================
   ESTRUCTURA PRINCIPAL
   ========================================================== */

function render(){

  if(!user){

    renderAuth();

    return;
  }


  const nav = [

    ['dashboard','Dashboard'],

    ['registro','Registro Diario'],

    ['resumen','Resumen Ejecutivo'],

    ['costos','Costos'],

    ['mantenimiento','Mantenimiento'],

    ['inventario','Inventario'],

    ['personal','Personal'],

    ['ssoma','SSOMA']

  ];


  app.innerHTML = `

    <header>

      <div>

        <b>
          QUIMFLUX
        </b>

        <span>
          · Administrador de Planta V5
        </span>

      </div>

      <button
        id="logout"
        class="logout"
      >
        Salir
      </button>

    </header>


    <nav>

      ${
        nav.map(x => `

          <button
            data-tab="${x[0]}"
            class="${tab===x[0]?'active':''}"
          >
            ${x[1]}
          </button>

        `).join('')
      }

    </nav>


    <div id="content"></div>
  `;


  document
    .querySelectorAll('nav button')
    .forEach(button => {

      button.onclick = () => {

        tab =
          button.dataset.tab;

        render();
      };

    });


  document
    .getElementById('logout')
    .onclick = () =>
      supabase.auth.signOut();


  if(tab === 'dashboard'){

    renderDashboard();

  }else if(tab === 'registro'){

    renderForm();

  }else{

    renderPlaceholder(
      nav.find(
        x => x[0] === tab
      )?.[1] || 'QUIMFLUX'
    );

  }
}


/* ==========================================================
   TARJETA KPI
   ========================================================== */

function indicador(
  label,
  value,
  target,
  invert=false
){

  const s =
    status(
      value,
      target,
      invert
    );


  return `

    <div class="card">

      <small>
        ${label}
      </small>

      <strong>
        ${value}
      </strong>

      <span
        class="badge ${s.cls}"
      >
        ${s.label}
      </span>

    </div>
  `;
}


/* ==========================================================
   TENDENCIA
   ========================================================== */

function tendencia(
  valores
){

  if(valores.length < 2){

    return {
      label:'SIN DATOS',
      cls:'ok'
    };
  }


  const ultimos =
    valores.slice(-3);


  const primero =
    ultimos[0];

  const ultimo =
    ultimos[ultimos.length-1];


  const diferencia =
    ultimo - primero;


  if(
    Math.abs(diferencia) < 0.01
  ){

    return {
      label:'→ ESTABLE',
      cls:'ok'
    };
  }


  return diferencia > 0

    ? {
        label:'↑ MEJORANDO',
        cls:'ok'
      }

    : {
        label:'↓ EMPEORANDO',
        cls:'warn'
      };
}


/* ==========================================================
   GRÁFICO SVG
   ========================================================== */

function graficoTendencia(
  registros
){

  if(registros.length < 2){

    return `

      <div class="empty">

        Se necesitan al menos
        2 registros para mostrar
        la tendencia.

      </div>

    `;
  }


  const data =
    registros.map(
      derive
    );


  const series = [

    {
      name:'Cumplimiento',
      key:'cumplimiento'
    },

    {
      name:'Yield',
      key:'yieldRate'
    },

    {
      name:'OEE',
      key:'oee'
    }

  ];


  const width = 900;

  const height = 360;

  const left = 55;

  const right = 25;

  const top = 30;

  const bottom = 50;


  const plotWidth =
    width-left-right;

  const plotHeight =
    height-top-bottom;


  const x = i => {

    if(data.length===1)
      return left;

    return (
      left +
      (
        i/(data.length-1)
      ) * plotWidth
    );
  };


  const y = value => {

    const v =
      Math.max(
        0,
        Math.min(
          1.6,
          value
        )
      );

    return (
      top +
      plotHeight -
      (
        v/1.6
      ) * plotHeight
    );
  };


  let svg = `

    <svg
      viewBox="0 0 ${width} ${height}"
      width="100%"
      height="360"
      preserveAspectRatio="none"
      style="display:block;overflow:visible;"
    >

  `;


  [0,.4,.8,1.2,1.6]
    .forEach(value => {

      const yy =
        y(value);


      svg += `

        <line
          x1="${left}"
          y1="${yy}"
          x2="${width-right}"
          y2="${yy}"
          stroke="rgba(255,255,255,.12)"
          stroke-width="1"
        />

        <text
          x="8"
          y="${yy+5}"
          fill="rgba(255,255,255,.65)"
          font-size="13"
        >
          ${(value*100).toFixed(0)}%
        </text>

      `;
    });


  const metaY =
    y(metas.cumplimiento);


  svg += `

    <line
      x1="${left}"
      y1="${metaY}"
      x2="${width-right}"
      y2="${metaY}"
      stroke="rgba(255,180,0,.8)"
      stroke-width="2"
      stroke-dasharray="7 5"
    />

    <text
      x="${width-right-80}"
      y="${metaY-7}"
      fill="rgba(255,190,0,.9)"
      font-size="12"
    >
      META
    </text>

  `;


  series.forEach((serie,index)=>{

    const points =
      data.map(
        (r,i) =>
          `${x(i)},${y(r[serie.key])}`
      ).join(' ');


    svg += `

      <polyline
        points="${points}"
        fill="none"
        stroke="hsl(${index*70+190},80%,60%)"
        stroke-width="4"
        stroke-linejoin="round"
        stroke-linecap="round"
      />

    `;


    data.forEach((r,i)=>{

      svg += `

        <circle
          cx="${x(i)}"
          cy="${y(r[serie.key])}"
          r="5"
          fill="hsl(${index*70+190},80%,60%)"
        />

      `;
    });

  });


  const paso =
    Math.max(
      1,
      Math.ceil(data.length/8)
    );


  data.forEach((r,i)=>{

    if(
      i % paso !== 0 &&
      i !== data.length-1
    )
      return;


    svg += `

      <text
        x="${x(i)}"
        y="${height-15}"
        text-anchor="middle"
        fill="rgba(255,255,255,.7)"
        font-size="12"
      >
        ${esc(r.fecha || '')}
      </text>

    `;
  });


  svg += `</svg>`;


  return `

    <div
      class="panel"
      style="overflow:hidden;"
    >

      <div
        style="
          display:flex;
          gap:18px;
          flex-wrap:wrap;
          margin-bottom:10px;
        "
      >

        <span>
          ● Cumplimiento
        </span>

        <span>
          ● Yield
        </span>

        <span>
          ● OEE
        </span>

        <span>
          ━ Meta ${pct(metas.cumplimiento)}
        </span>

      </div>

      ${svg}

    </div>

  `;
}


/* ==========================================================
   RENDER DASHBOARD
   ========================================================== */

function renderDashboard(){

  const d =
    rows.map(
      derive
    );


  const sums = key =>
    d.reduce(
      (s,r) =>
        s+n(r[key]),
      0
    );


  const k = {

    prod:
      sums('producida'),

    programada:
      sums('programada'),

    mp:
      sums('mp'),

    merma:
      sums('merma'),

    stop:
      sums('horas_paradas'),

    hours:
      sums('horas_turno'),

    pp:
      sums('personal_programado'),

    pa:
      sums('personal_presente'),

    rej:
      sums('rechazadas'),

    pedidos:
      sums('pedidos_programados'),

    tiempo:
      sums('pedidos_tiempo'),

    costo:
      sums('costo_produccion'),

    mnt:
      sums('costo_mantenimiento'),

    energia:
      sums('energia'),

    incidentes:
      sums('incidentes'),

    cumplimiento:
      sums('programada')
        ? sums('producida') /
          sums('programada')
        : 0,

    /*
      YIELD HISTÓRICO:
      (MP total - Merma total) / MP total
    */
    yield:
      sums('mp')
        ? Math.max(
            0,
            Math.min(
              1,
              (
                sums('mp') -
                sums('merma')
              ) /
              sums('mp')
            )
          )
        : 0,

    mermaRate:
      sums('mp')
        ? sums('merma') /
          sums('mp')
        : 0,

    disponibilidad:
      sums('horas_turno')
        ? Math.max(
            0,
            (
              sums('horas_turno') -
              sums('horas_paradas')
            ) /
            sums('horas_turno')
          )
        : 0,

    asistencia:
      sums('personal_programado')
        ? sums('personal_presente') /
          sums('personal_programado')
        : 0,

    rechazo:
      sums('producida')
        ? sums('rechazadas') /
          sums('producida')
        : 0,

    otif:
      sums('pedidos_programados')
        ? sums('pedidos_tiempo') /
          sums('pedidos_programados')
        : 0

  };


  k.oee =
    k.disponibilidad *
    k.yield *
    Math.max(
      0,
      1-k.rechazo
    );


  const last =
    d.length
      ? d[d.length-1]
      : null;


  /* ========================================================
     ALERTAS
     ======================================================== */

  const alerts=[];


  if(last){

    if(
      last.cumplimiento <
      metas.cumplimiento
    ){

      alerts.push({

        tipo:'warn',

        titulo:
          'Cumplimiento requiere revisión',

        valor:
          pct(last.cumplimiento),

        meta:
          pct(metas.cumplimiento)

      });

    }


    if(
      last.yieldRate <
      metas.yield
    ){

      alerts.push({

        tipo:'warn',

        titulo:
          'Yield requiere revisión',

        valor:
          pct(last.yieldRate),

        meta:
          pct(metas.yield)

      });

    }


    if(
      last.merma >
      metas.merma
    ){

      alerts.push({

        tipo:'critical',

        titulo:
          'Merma en nivel crítico',

        valor:
          pct(last.merma),

        meta:
          'máx. '+pct(metas.merma)

      });

    }


    if(
      last.oee < .80
    ){

      alerts.push({

        tipo:'critical',

        titulo:
          'OEE en nivel crítico',

        valor:
          pct(last.oee),

        meta:
          'mín. 80.0%'

      });

    }

  }


  const alertsHTML = `

    <section class="panel">

      <h2>
        🚨 Alertas QUIMFLUX
      </h2>

      <p>
        Desviaciones que requieren atención.
      </p>

      ${
        alerts.length
          ?

          `

            <div class="cards">

              ${
                alerts.map(a=>`

                  <div class="card">

                    <span
                      class="badge ${a.tipo}"
                    >
                      ${
                        a.tipo==='critical'
                          ? 'CRÍTICO'
                          : 'REVISAR'
                      }
                    </span>

                    <strong>
                      ${a.titulo}
                    </strong>

                    <small>
                      ${a.valor}
                      · Meta ${a.meta}
                    </small>

                  </div>

                `).join('')
              }

            </div>

          `

          :

          `

            <span class="badge ok">
              0 CRÍTICAS
            </span>

          `
      }

    </section>

  `;


  /* ========================================================
     ÚLTIMO TURNO
     ======================================================== */

  let ultimoHTML='';


  if(last){

    ultimoHTML = `

      <section class="panel">

        <h2>
          Último turno
        </h2>

        <p>
          ${esc(last.fecha)}
          ·
          ${esc(last.turno)}
          ${
            last.producto
              ? ' · '+esc(last.producto)
              : ''
          }
        </p>

        <span class="badge ok">
          REGISTRO MÁS RECIENTE
        </span>


        <div class="cards">

          ${indicador(
            'Cumplimiento',
            pct(last.cumplimiento),
            metas.cumplimiento
          )}

          ${indicador(
            'Yield',
            pct(last.yieldRate),
            metas.yield
          )}

          ${indicador(
            'Merma',
            pct(last.merma),
            metas.merma,
            true
          )}

          ${indicador(
            'Disponibilidad',
            pct(last.disponibilidad),
            metas.disponibilidad
          )}

          ${indicador(
            'Asistencia',
            pct(last.asistencia),
            metas.asistencia
          )}

          ${indicador(
            'Rechazo',
            pct(last.rechazo),
            metas.rechazo,
            true
          )}

          ${indicador(
            'OEE',
            pct(last.oee),
            .80
          )}

          ${indicador(
            'OTIF',
            pct(last.otif),
            metas.otif
          )}

        </div>


        <div class="card">

          <small>
            Producción del último turno
          </small>

          <strong>
            ${n(last.producida).toLocaleString()}
            de
            ${n(last.programada).toLocaleString()}
            programados
          </strong>

        </div>

      </section>

    `;

  }


  /* ========================================================
     HISTÓRICO
     ======================================================== */

  const historicoHTML = `

    <section class="panel">

      <h2>
        Indicadores acumulados de planta
      </h2>

      <p>
        Consolidado de todos los registros diarios.
      </p>

      <span class="badge ok">
        HISTÓRICO
      </span>


      <div class="cards">

        ${indicador(
          'Producción total',
          k.prod.toLocaleString(),
          0
        )}

        ${indicador(
          'Cumplimiento',
          pct(k.cumplimiento),
          metas.cumplimiento
        )}

        ${indicador(
          'Yield',
          pct(k.yield),
          metas.yield
        )}

        ${indicador(
          'Merma',
          pct(k.mermaRate),
          metas.merma,
          true
        )}

        ${indicador(
          'Disponibilidad',
          pct(k.disponibilidad),
          metas.disponibilidad
        )}

        ${indicador(
          'Asistencia',
          pct(k.asistencia),
          metas.asistencia
        )}

        ${indicador(
          'Rechazo calidad',
          pct(k.rechazo),
          metas.rechazo,
          true
        )}

        ${indicador(
          'OEE',
          pct(k.oee),
          .80
        )}

        <div class="card">

          <small>
            Costo producción
          </small>

          <strong>
            S/ ${k.costo.toLocaleString()}
          </strong>

        </div>

        <div class="card">

          <small>
            Costo mantenimiento
          </small>

          <strong>
            S/ ${k.mnt.toLocaleString()}
          </strong>

        </div>

        <div class="card">

          <small>
            Horas parada
          </small>

          <strong>
            ${k.stop.toFixed(2)} h
          </strong>

        </div>

        <div class="card">

          <small>
            Costo unitario
          </small>

          <strong>
            S/
            ${
              k.prod
                ? (
                    k.costo /
                    k.prod
                  ).toFixed(3)
                : '0.000'
            }
          </strong>

        </div>

        <div class="card">

          <small>
            Energía
          </small>

          <strong>
            ${
              k.prod
                ? (
                    k.energia /
                    k.prod
                  ).toFixed(3)
                : '0.000'
            }
            kWh/unidad
          </strong>

        </div>

        ${indicador(
          'Entregas a tiempo',
          pct(k.otif),
          metas.otif
        )}

        ${indicador(
          'Incidentes SSOMA',
          String(k.incidentes),
          metas.incidentes,
          true
        )}

      </div>

    </section>

  `;


  /* ========================================================
     COMPARATIVA
     ======================================================== */

  let comparativaHTML='';


  if(last){

    const diferencia =
      (
        actual,
        historico
      ) =>
        (
          (
            n(actual) -
            n(historico)
          ) * 100
        ).toFixed(1)
        + ' pp';


    comparativaHTML = `

      <section class="panel">

        <h2>
          Comparativa:
          último turno vs histórico
        </h2>


        <div class="tableWrap">

          <table>

            <thead>

              <tr>

                <th>
                  Indicador
                </th>

                <th>
                  Último turno
                </th>

                <th>
                  Histórico
                </th>

                <th>
                  Diferencia
                </th>

              </tr>

            </thead>


            <tbody>

              <tr>
                <td>Cumplimiento</td>
                <td>${pct(last.cumplimiento)}</td>
                <td>${pct(k.cumplimiento)}</td>
                <td>${diferencia(last.cumplimiento,k.cumplimiento)}</td>
              </tr>

              <tr>
                <td>Yield</td>
                <td>${pct(last.yieldRate)}</td>
                <td>${pct(k.yield)}</td>
                <td>${diferencia(last.yieldRate,k.yield)}</td>
              </tr>

              <tr>
                <td>Merma</td>
                <td>${pct(last.merma)}</td>
                <td>${pct(k.mermaRate)}</td>
                <td>${diferencia(last.merma,k.mermaRate)}</td>
              </tr>

              <tr>
                <td>Disponibilidad</td>
                <td>${pct(last.disponibilidad)}</td>
                <td>${pct(k.disponibilidad)}</td>
                <td>${diferencia(last.disponibilidad,k.disponibilidad)}</td>
              </tr>

              <tr>
                <td>Asistencia</td>
                <td>${pct(last.asistencia)}</td>
                <td>${pct(k.asistencia)}</td>
                <td>${diferencia(last.asistencia,k.asistencia)}</td>
              </tr>

              <tr>
                <td>Rechazo</td>
                <td>${pct(last.rechazo)}</td>
                <td>${pct(k.rechazo)}</td>
                <td>${diferencia(last.rechazo,k.rechazo)}</td>
              </tr>

              <tr>
                <td>OEE</td>
                <td>${pct(last.oee)}</td>
                <td>${pct(k.oee)}</td>
                <td>${diferencia(last.oee,k.oee)}</td>
              </tr>

            </tbody>

          </table>

        </div>

      </section>

    `;
  }


  /* ========================================================
     TENDENCIAS
     ======================================================== */

  const cumplimientoValores =
    d.map(
      r => r.cumplimiento
    );

  const yieldValores =
    d.map(
      r => r.yieldRate
    );

  const oeeValores =
    d.map(
      r => r.oee
    );


  const tCum =
    tendencia(
      cumplimientoValores
    );

  const tYield =
    tendencia(
      yieldValores
    );

  const tOee =
    tendencia(
      oeeValores
    );


  const tendenciasHTML = `

    <section class="panel">

      <h2>
        📈 Tendencias de desempeño
      </h2>

      <p>
        Evolución de los principales KPI
        según los registros diarios.
      </p>


      <div class="cards">

        <div class="card">

          <small>
            Tendencia cumplimiento
          </small>

          <strong>
            ${tCum.label}
          </strong>

        </div>


        <div class="card">

          <small>
            Tendencia Yield
          </small>

          <strong>
            ${tYield.label}
          </strong>

        </div>


        <div class="card">

          <small>
            Tendencia OEE
          </small>

          <strong>
            ${tOee.label}
          </strong>

        </div>

      </div>


      ${graficoTendencia(d)}

    </section>

  `;


  /* ========================================================
     INDICADORES GENERALES
     ======================================================== */

  const cards = [

    [
      'Producción total',
      k.prod.toLocaleString()
    ],

    [
      'Cumplimiento',
      pct(k.cumplimiento),
      status(
        k.cumplimiento,
        metas.cumplimiento
      )
    ],

    [
      'Yield',
      pct(k.yield),
      status(
        k.yield,
        metas.yield
      )
    ],

    [
      'Merma',
      pct(k.mermaRate),
      status(
        k.mermaRate,
        metas.merma,
        true
      )
    ],

    [
      'Disponibilidad',
      pct(k.disponibilidad),
      status(
        k.disponibilidad,
        metas.disponibilidad
      )
    ],

    [
      'Asistencia',
      pct(k.asistencia),
      status(
        k.asistencia,
        metas.asistencia
      )
    ],

    [
      'Rechazo calidad',
      pct(k.rechazo),
      status(
        k.rechazo,
        metas.rechazo,
        true
      )
    ],

    [
      'OEE',
      pct(k.oee),
      status(
        k.oee,
        .80
      )
    ],

    [
      'Costo producción',
      'S/ '+k.costo.toLocaleString()
    ],

    [
      'Costo mantenimiento',
      'S/ '+k.mnt.toLocaleString()
    ],

    [
      'Horas parada',
      k.stop.toFixed(2)+' h'
    ],

    [
      'Costo unitario',
      'S/ '+
      (
        k.prod
          ? k.costo/k.prod
          : 0
      ).toFixed(3)
    ],

    [
      'Energía',
      (
        k.prod
          ? k.energia/k.prod
          : 0
      ).toFixed(3)
      +' kWh/unidad'
    ],

    [
      'Entregas a tiempo',
      pct(k.otif),
      status(
        k.otif,
        metas.otif
      )
    ],

    [
      'Incidentes SSOMA',
      String(k.incidentes),
      status(
        k.incidentes,
        metas.incidentes,
        true
      )
    ]

  ];


  /* ========================================================
     TABLA
     ======================================================== */

  const tablaHTML = d.length

    ?

    `

      <div class="tableWrap">

        <table>

          <thead>

            <tr>

              <th>Fecha</th>

              <th>Turno</th>

              <th>Producto</th>

              <th>Programada</th>

              <th>Producida</th>

              <th>Merma</th>

              <th>OEE</th>

            </tr>

          </thead>


          <tbody>

            ${
              d
                .slice(-20)
                .reverse()
                .map(r=>`

                  <tr>

                    <td>
                      ${esc(r.fecha)}
                    </td>

                    <td>
                      ${esc(r.turno)}
                    </td>

                    <td>
                      ${esc(r.producto)}
                    </td>

                    <td>
                      ${n(r.programada)}
                    </td>

                    <td>
                      ${n(r.producida)}
                    </td>

                    <td>
                      ${n(r.merma)}
                    </td>

                    <td>
                      ${pct(r.oee)}
                    </td>

                  </tr>

                `).join('')
            }

          </tbody>

        </table>

      </div>

    `

    :

    `

      <div class="empty">

        Todavía no hay registros.

        Ve a
        <b>Registro Diario</b>
        para ingresar el primero.

      </div>

    `;


  /* ========================================================
     DASHBOARD FINAL
     ======================================================== */

  document
    .getElementById('content')
    .innerHTML = `

      <main>

        <div class="titleRow">

          <div>

            <h1>
              Dashboard de Administración de Planta
            </h1>

            <p>
              Datos sincronizados con Supabase ·
              ${rows.length}
              registros diarios ·
              0 mantenimientos
            </p>

          </div>

          <span class="online">
            ● EN LÍNEA
          </span>

        </div>


        ${alertsHTML}


        ${ultimoHTML}


        ${historicoHTML}


        ${comparativaHTML}


        ${tendenciasHTML}


        <section class="panel">

          <h2>
            Indicadores generales
          </h2>

          <div class="cards">

            ${
              cards.map(c=>`

                <div class="card">

                  <small>
                    ${c[0]}
                  </small>

                  <strong>
                    ${c[1]}
                  </strong>

                  ${
                    c.length > 2

                      ?

                      `
                        <span
                          class="badge ${c[2].cls}"
                        >
                          ${c[2].label}
                        </span>
                      `

                      :

                      ''
                  }

                </div>

              `).join('')
            }

          </div>

        </section>


        <section class="panel">

          <h2>
            Últimos registros
          </h2>

          ${tablaHTML}

        </section>

      </main>
  `;
}


/* ==========================================================
   REGISTRO DIARIO
   ========================================================== */

function renderForm(){

  const r =
    empty();


  document
    .getElementById('content')
    .innerHTML = `

      <main>

        <h1>
          Registro Diario
        </h1>

        <p>
          Ingresa los datos del turno.
          Los KPI se calculan automáticamente.
        </p>


        <form
          id="daily"
          class="formGrid"
        >

          <section>

            <h2>
              Producción
            </h2>

            ${
              fields
                .slice(0,7)
                .map(
                  f => control(f,r)
                )
                .join('')
            }

          </section>


          <section>

            <h2>
              Operación y personal
            </h2>

            ${
              fields
                .slice(7,12)
                .map(
                  f => control(f,r)
                )
                .join('')
            }

          </section>


          <section>

            <h2>
              Costos y energía
            </h2>

            ${
              fields
                .slice(12,15)
                .map(
                  f => control(f,r)
                )
                .join('')
            }

          </section>


          <section>

            <h2>
              Despacho y SSOMA
            </h2>

            ${
              fields
                .slice(15)
                .map(
                  f => control(f,r)
                )
                .join('')
            }

          </section>


          <div
            id="saveMsg"
            class="msg full"
          ></div>


          <button
            class="primary full"
            type="submit"
          >
            Guardar registro diario
          </button>

        </form>

      </main>
  `;


  document
    .getElementById('daily')
    .onsubmit = async e => {

      e.preventDefault();


      const msg =
        document.getElementById('saveMsg');


      const payload = {

        user_id:
          user.id

      };


      fields.forEach(
        ([key,,type]) => {

          const el =
            document.getElementById(
              'f_'+key
            );


          payload[key] =
            type === 'number'

              ?

              (
                el.value === ''
                  ? null
                  : n(el.value)
              )

              :

              el.value;
        }
      );


      msg.textContent =
        'Guardando…';


      const {
        error
      } =
        await supabase
          .from('daily_records')
          .insert(payload);


      if(error){

        msg.textContent =
          error.message;

        return;
      }


      msg.textContent =
        'Registro guardado correctamente.';


      await load();


      setTimeout(
        () => render(),
        400
      );

    };
}


/* ==========================================================
   CONTROLES DEL FORMULARIO
   ========================================================== */

function control(
  f,
  r
){

  const [
    key,
    label,
    type
  ] = f;


  let input;


  if(type === 'select'){

    input = `

      <select
        id="f_${key}"
      >

        <option>
          Mañana
        </option>

        <option>
          Tarde
        </option>

        <option>
          Noche
        </option>

      </select>

    `;

  }

  else if(type === 'textarea'){

    input = `

      <textarea
        id="f_${key}"
      ></textarea>

    `;

  }

  else{

    input = `

      <input
        id="f_${key}"
        type="${type}"
        value="${esc(r[key])}"
        ${
          type === 'number'
            ? 'step="any"'
            : ''
        }
      >

    `;
  }


  return `

    <label>

      ${label}

      ${input}

    </label>

  `;
}


/* ==========================================================
   MÓDULOS FUTUROS
   ========================================================== */

function renderPlaceholder(title){

  document
    .getElementById('content')
    .innerHTML = `

      <main>

        <h1>
          ${esc(title)}
        </h1>

        <section class="panel">

          <p>
            Este módulo está preparado
            para desarrollarse en la
            siguiente fase.
          </p>

          <span class="badge ok">
            MÓDULO PREPARADO
          </span>

        </section>

      </main>

    `;
}


/* ==========================================================
   CARGAR DATOS
   ========================================================== */

async function load(){

  const r =
    await supabase
      .from('daily_records')
      .select('*')
      .order(
        'fecha',
        {
          ascending:true
        }
      );


  if(!r.error){

    rows =
      r.data || [];

  }


  const s =
    await supabase
      .from('app_settings')
      .select('*')
      .limit(1)
      .maybeSingle();


  if(s.data){

    metas = {

      ...metas,

      cumplimiento:
        n(
          s.data.meta_cumplimiento
        )
        ||
        metas.cumplimiento,

      merma:
        n(
          s.data.meta_merma
        )
        ||
        metas.merma,

      yield:
        n(
          s.data.meta_yield
        )
        ||
        metas.yield,

      disponibilidad:
        n(
          s.data.meta_disponibilidad
        )
        ||
        metas.disponibilidad,

      asistencia:
        n(
          s.data.meta_asistencia
        )
        ||
        metas.asistencia,

      rechazo:
        n(
          s.data.meta_rechazo
        )
        ||
        metas.rechazo,

      otif:
        n(
          s.data.meta_entregas
        )
        ||
        metas.otif,

      incidentes:
        n(
          s.data.meta_incidentes
        )

    };

  }

}


/* ==========================================================
   INICIO
   ========================================================== */

supabase.auth
  .getSession()
  .then(
    async ({data}) => {

      user =
        data.session?.user ||
        null;


      if(user){

        await load();

      }


      render();

    }
  );


supabase.auth
  .onAuthStateChange(
    (_event,session) => {

      user =
        session?.user ||
        null;

      render();

    }
  );