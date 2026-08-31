import { createClient } from '@supabase/supabase-js';
import './styles.css';

/* ==========================================================
   SUPABASE
   ========================================================== */

const SUPABASE_URL =
  'https://cgkdztwtodmdteohvuoh.supabase.co';

const SUPABASE_KEY =
  'sb_publishable_sULeDyfJ1l5xfuVhFgXRKA_bsim9qSe';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


/* ==========================================================
   APP
   ========================================================== */

const app =
  document.getElementById('app');


/* ==========================================================
   CAMPOS DEL REGISTRO DIARIO
   ========================================================== */

const fields = [

  ['fecha', 'Fecha', 'date'],

  ['turno', 'Turno', 'select'],

  ['producto', 'Producto', 'text'],

  ['programada', 'Cantidad programada', 'number'],

  ['producida', 'Cantidad producida', 'number'],

  ['mp', 'Materia prima consumida', 'number'],

  /*
     MERMA SE INGRESA COMO PORCENTAJE.

     Ejemplo:
     2  = 2%
     5  = 5%
     10 = 10%
  */

  ['merma', 'Merma (%)', 'number'],

  ['horas_turno', 'Horas de turno', 'number'],

  ['horas_paradas', 'Horas de parada', 'number'],

  ['personal_programado', 'Personal programado', 'number'],

  ['personal_presente', 'Personal presente', 'number'],

  ['rechazadas', 'Unidades rechazadas', 'number'],

  ['costo_produccion', 'Costo producción (S/)', 'number'],

  ['energia', 'Energía (kWh)', 'number'],

  ['costo_mantenimiento', 'Costo mantenimiento (S/)', 'number'],

  ['incidentes', 'Incidentes SSOMA', 'number'],

  ['pedidos_programados', 'Pedidos programados', 'number'],

  ['pedidos_tiempo', 'Pedidos a tiempo', 'number'],

  ['reproceso', 'Reproceso', 'number'],

  ['no_conformidades', 'No conformidades', 'number'],

  ['observaciones', 'Observaciones', 'textarea']

];


const today =
  new Date()
    .toISOString()
    .slice(0, 10);


let user = null;

let rows = [];

let tab = 'dashboard';

let editingId = null;

let viewingId = null;


/* ==========================================================
   METAS
   ========================================================== */

let metas = {

  cumplimiento: 0.95,

  merma: 0.02,

  yield: 0.95,

  disponibilidad: 0.90,

  asistencia: 0.95,

  rechazo: 0.03,

  otif: 0.95,

  incidentes: 0

};


/* ==========================================================
   ESTILOS ADICIONALES
   ========================================================== */

function ensureExtraStyles() {

  if (
    document.getElementById(
      'quimfluxExtraStyles'
    )
  ) {

    return;

  }


  const style =
    document.createElement('style');


  style.id =
    'quimfluxExtraStyles';


  style.textContent = `

    .rowActions {
      display:flex;
      gap:6px;
      align-items:center;
      justify-content:center;
      white-space:nowrap;
    }

    .actionBtn {
      border:1px solid rgba(255,255,255,.18);
      background:rgba(255,255,255,.08);
      color:white;
      border-radius:7px;
      padding:6px 8px;
      cursor:pointer;
      font-size:14px;
      transition:.15s;
    }

    .actionBtn:hover {
      background:rgba(255,255,255,.18);
      transform:translateY(-1px);
    }

    .actionBtn.danger {
      border-color:rgba(255,80,80,.35);
    }

    .modalOverlay {
      position:fixed;
      inset:0;
      z-index:9999;
      background:rgba(0,0,0,.72);
      display:flex;
      align-items:center;
      justify-content:center;
      padding:20px;
      overflow:auto;
    }

    .modalCard {
      width:min(1000px,95vw);
      max-height:90vh;
      overflow:auto;
      background:#172238;
      color:white;
      border:1px solid rgba(255,255,255,.18);
      border-radius:16px;
      padding:22px;
      box-shadow:0 20px 60px rgba(0,0,0,.45);
    }

    .modalHeader {
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap:20px;
      margin-bottom:20px;
    }

    .modalHeader h2 {
      margin:0 0 5px 0;
    }

    .modalClose {
      border:0;
      background:rgba(255,255,255,.1);
      color:white;
      border-radius:8px;
      font-size:24px;
      width:40px;
      height:40px;
      cursor:pointer;
    }

    .detailGrid {
      display:grid;
      grid-template-columns:
        repeat(auto-fit,minmax(210px,1fr));
      gap:10px;
    }

    .detailItem {
      background:rgba(255,255,255,.06);
      border:1px solid rgba(255,255,255,.1);
      border-radius:10px;
      padding:12px;
    }

    .detailItem small {
      display:block;
      opacity:.7;
      margin-bottom:5px;
    }

    .detailItem strong {
      display:block;
      word-break:break-word;
    }

    .modalActions {
      display:flex;
      gap:10px;
      flex-wrap:wrap;
      margin-top:20px;
    }

    .modalActions button {
      cursor:pointer;
    }

    .danger {
      background:rgba(220,60,60,.18);
      border:1px solid rgba(255,90,90,.35);
      color:white;
      border-radius:8px;
      padding:9px 14px;
    }

    .secondary {
      background:rgba(255,255,255,.1);
      border:1px solid rgba(255,255,255,.18);
      color:white;
      border-radius:8px;
      padding:9px 14px;
    }

    .badge.na {
      background:rgba(160,160,160,.2);
      color:rgba(255,255,255,.75);
    }

    .mermaHelp {
      display:block;
      margin-top:4px;
      font-size:12px;
      opacity:.65;
    }

  `;


  document.head.appendChild(style);

}


ensureExtraStyles();


/* ==========================================================
   FUNCIONES GENERALES
   ========================================================== */

function esc(v = '') {

  return String(v).replace(

    /[&<>"']/g,

    c => ({

      '&': '&amp;',

      '<': '&lt;',

      '>': '&gt;',

      '"': '&quot;',

      "'": '&#039;'

    }[c])

  );

}


function n(v) {

  const x =
    Number(v);

  return Number.isFinite(x)
    ? x
    : 0;

}


function pct(v) {

  return (
    n(v) * 100
  ).toFixed(1) + '%';

}


/* ==========================================================
   NORMALIZAR MERMA
   ========================================================== */

/*
   IMPORTANTE

   El usuario introduce Merma como porcentaje.

   2  -> 0.02
   5  -> 0.05
   10 -> 0.10
   20 -> 0.20

   Internamente todos los KPI trabajan
   con fracción decimal.

   Así pct(0.02) = 2.0%
*/

function mermaRate(v) {

  const value =
    Number(v);


  if (
    !Number.isFinite(value)
  ) {

    return 0;

  }


  return value / 100;

}


/*
   Compatibilidad con registros antiguos.

   Si algún registro antiguo ya tenía
   la merma guardada como decimal
   (por ejemplo 0.02), se interpreta
   correctamente como 2%.

   Si tiene 2, se interpreta como 2%.
*/

function normalizeStoredMerma(v) {

  const value =
    Number(v);


  if (
    !Number.isFinite(value)
  ) {

    return 0;

  }


  if (
    Math.abs(value) <= 1
  ) {

    return value;

  }


  return value / 100;

}


/* ==========================================================
   SEMÁFORO
   ========================================================== */

function status(
  value,
  target,
  invert = false
) {

  const v = n(value);

  const t = n(target);

  const epsilon = 0.000001;


  if (
    !Number.isFinite(v) ||
    !Number.isFinite(t)
  ) {

    return {

      ok: false,

      critical: false,

      label: 'N/A',

      cls: 'na'

    };

  }


  /*
     MENOS ES MEJOR
  */

  if (invert) {

    if (
      v <= t + epsilon
    ) {

      return {

        ok: true,

        critical: false,

        label: 'OK',

        cls: 'ok'

      };

    }


    if (t === 0) {

      return {

        ok: false,

        critical: v > 0,

        label:
          v > 0
            ? 'CRÍTICO'
            : 'OK',

        cls:
          v > 0
            ? 'critical'
            : 'ok'

      };

    }


    const critical =
      v > t * 1.5;


    return {

      ok: false,

      critical,

      label:
        critical
          ? 'CRÍTICO'
          : 'REVISAR',

      cls:
        critical
          ? 'critical'
          : 'warn'

    };

  }


  /*
     MÁS ES MEJOR
  */

  if (
    v >= t - epsilon
  ) {

    return {

      ok: true,

      critical: false,

      label: 'OK',

      cls: 'ok'

    };

  }


  const critical =
    v < t * 0.85;


  return {

    ok: false,

    critical,

    label:
      critical
        ? 'CRÍTICO'
        : 'REVISAR',

    cls:
      critical
        ? 'critical'
        : 'warn'

  };

}


/* ==========================================================
   REGISTRO VACÍO
   ========================================================== */

function empty() {

  return {

    fecha: today,

    turno: 'Mañana',

    producto: '',

    programada: 0,

    producida: 0,

    mp: 0,

    /*
       AHORA SE INTRODUCE COMO:
       2 = 2%
    */

    merma: 0,

    horas_turno: 8,

    horas_paradas: 0,

    personal_programado: 0,

    personal_presente: 0,

    rechazadas: 0,

    costo_produccion: 0,

    energia: 0,

    costo_mantenimiento: 0,

    incidentes: 0,

    pedidos_programados: 0,

    pedidos_tiempo: 0,

    reproceso: 0,

    no_conformidades: 0,

    observaciones: ''

  };

}


/* ==========================================================
   CÁLCULO DE KPI
   ========================================================== */

function derive(r) {

  const p =
    n(r.programada);

  const q =
    n(r.producida);

  const mp =
    n(r.mp);

  const h =
    n(r.horas_turno);

  const stop =
    n(r.horas_paradas);

  const pp =
    n(r.personal_programado);

  const pa =
    n(r.personal_presente);

  const rej =
    n(r.rechazadas);

  const pedidos =
    n(r.pedidos_programados);

  const at =
    n(r.pedidos_tiempo);


  /*
     CUMPLIMIENTO
  */

  const cumplimiento =
    p > 0
      ? q / p
      : 0;


  /*
     MERMA

     IMPORTANTE:

     Se toma directamente del campo
     Merma (%) y se convierte a decimal.

     Ejemplo:
     2 -> 0.02 -> 2%
  */

  const merma =
    normalizeStoredMerma(
      r.merma
    );


  /*
     YIELD
  */

  const yieldRate =
    mp > 0
      ? q / mp
      : 0;


  /*
     DISPONIBILIDAD
  */

  const disponibilidad =
    h > 0

      ?

      Math.max(
        0,
        (h - stop) / h
      )

      :

      0;


  /*
     ASISTENCIA
  */

  const asistencia =
    pp > 0
      ? pa / pp
      : 0;


  /*
     RECHAZO
  */

  const rechazo =
    q > 0
      ? rej / q
      : 0;


  /*
     OTIF
  */

  const otif =
    pedidos > 0
      ? at / pedidos
      : null;


  /*
     OEE

     Disponibilidad × Yield × Calidad

     Calidad = 1 - rechazo
  */

  const oee =
    disponibilidad *
    yieldRate *
    Math.max(
      0,
      1 - rechazo
    );


  return {

    ...r,

    cumplimiento,

    merma,

    yieldRate,

    disponibilidad,

    asistencia,

    rechazo,

    oee,

    otif,

    costoUnitario:
      q > 0
        ? n(r.costo_produccion) / q
        : 0,

    energiaUnit:
      q > 0
        ? n(r.energia) / q
        : 0

  };

}


/* ==========================================================
   TARJETA KPI
   ========================================================== */

function indicador(
  label,
  rawValue,
  target,
  invert = false,
  customStatus = null
) {

  const s =
    customStatus ||
    status(
      rawValue,
      target,
      invert
    );


  let displayValue;


  if (
    rawValue === null ||
    rawValue === undefined
  ) {

    displayValue = 'N/A';

  }

  else if (
    typeof rawValue === 'number'
  ) {

    displayValue =
      pct(rawValue);

  }

  else {

    displayValue =
      esc(rawValue);

  }


  return `

    <div class="card">

      <small>
        ${esc(label)}
      </small>

      <strong>
        ${displayValue}
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
  valores,
  invert = false
) {

  if (
    valores.length < 2
  ) {

    return {

      label: 'SIN DATOS',

      cls: 'na'

    };

  }


  const ultimos =
    valores
      .slice(-3)
      .filter(
        v =>
          v !== null &&
          v !== undefined &&
          Number.isFinite(
            Number(v)
          )
      );


  if (
    ultimos.length < 2
  ) {

    return {

      label: 'SIN DATOS',

      cls: 'na'

    };

  }


  const primero =
    n(ultimos[0]);

  const ultimo =
    n(
      ultimos[
        ultimos.length - 1
      ]
    );


  const diferencia =
    ultimo - primero;


  if (
    Math.abs(diferencia) < 0.01
  ) {

    return {

      label: '→ ESTABLE',

      cls: 'ok'

    };

  }


  const mejorando =
    invert
      ? diferencia < 0
      : diferencia > 0;


  return mejorando

    ?

    {

      label: '↑ MEJORANDO',

      cls: 'ok'

    }

    :

    {

      label: '↓ EMPEORANDO',

      cls: 'warn'

    };

}


/* ==========================================================
   GRÁFICO
   ========================================================== */

function graficoTendencia(
  registros
) {

  if (
    registros.length < 2
  ) {

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
      name: 'Cumplimiento',
      key: 'cumplimiento'
    },

    {
      name: 'Yield',
      key: 'yieldRate'
    },

    {
      name: 'OEE',
      key: 'oee'
    }

  ];


  const width = 900;

  const height = 360;

  const left = 55;

  const right = 25;

  const top = 30;

  const bottom = 50;


  const plotWidth =
    width - left - right;

  const plotHeight =
    height - top - bottom;


  const x = i => {

    if (
      data.length === 1
    ) {

      return left;

    }


    return (

      left +

      (
        i /
        (data.length - 1)
      ) *

      plotWidth

    );

  };


  const y = value => {

    const v =
      Math.max(
        0,
        Math.min(
          1.6,
          n(value)
        )
      );


    return (

      top +

      plotHeight -

      (
        v / 1.6
      ) *

      plotHeight

    );

  };


  let svg = `

    <svg

      viewBox="
        0 0
        ${width}
        ${height}
      "

      width="100%"

      height="360"

      preserveAspectRatio="none"

      style="
        display:block;
        overflow:visible;
      "

    >

  `;


  /*
     LÍNEAS HORIZONTALES
  */

  [
    0,
    .4,
    .8,
    1.2,
    1.6

  ].forEach(
    value => {

      const yy =
        y(value);


      svg += `

        <line

          x1="${left}"

          y1="${yy}"

          x2="${width - right}"

          y2="${yy}"

          stroke="rgba(255,255,255,.12)"

          stroke-width="1"

        />

        <text

          x="8"

          y="${yy + 5}"

          fill="rgba(255,255,255,.65)"

          font-size="13"

        >

          ${(value * 100).toFixed(0)}%

        </text>

      `;

    }
  );


  /*
     META
  */

  const metaY =
    y(
      metas.cumplimiento
    );


  svg += `

    <line

      x1="${left}"

      y1="${metaY}"

      x2="${width - right}"

      y2="${metaY}"

      stroke="rgba(255,180,0,.8)"

      stroke-width="2"

      stroke-dasharray="7 5"

    />

    <text

      x="${width - right - 80}"

      y="${metaY - 7}"

      fill="rgba(255,190,0,.9)"

      font-size="12"

    >

      META

    </text>

  `;


  /*
     SERIES
  */

  series.forEach(
    (serie, index) => {

      const points =
        data
          .map(
            (r, i) =>
              `${x(i)},${y(r[serie.key])}`
          )
          .join(' ');


      svg += `

        <polyline

          points="${points}"

          fill="none"

          stroke="
            hsl(
              ${index * 70 + 190},
              80%,
              60%
            )
          "

          stroke-width="4"

          stroke-linejoin="round"

          stroke-linecap="round"

        />

      `;


      data.forEach(
        (r, i) => {

          svg += `

            <circle

              cx="${x(i)}"

              cy="${y(r[serie.key])}"

              r="5"

              fill="
                hsl(
                  ${index * 70 + 190},
                  80%,
                  60%
                )
              "

            />

          `;

        }
      );

    }
  );


  /*
     FECHAS
  */

  const paso =
    Math.max(
      1,
      Math.ceil(
        data.length / 8
      )
    );


  data.forEach(
    (r, i) => {

      if (
        i % paso !== 0 &&
        i !== data.length - 1
      ) {

        return;

      }


      svg += `

        <text

          x="${x(i)}"

          y="${height - 15}"

          text-anchor="middle"

          fill="rgba(255,255,255,.7)"

          font-size="12"

        >

          ${esc(r.fecha || '')}

        </text>

      `;

    }
  );


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
   AUTENTICACIÓN
   ========================================================== */

function renderAuth() {

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
        document.getElementById(
          'authMsg'
        );


      msg.textContent =
        'Procesando…';


      const {
        data,
        error
      } =
        await supabase.auth
          .signInWithPassword({

            email:
              document
                .getElementById(
                  'email'
                ).value,

            password:
              document
                .getElementById(
                  'password'
                ).value

          });


      if (error) {

        msg.textContent =
          error.message;

        return;

      }


      user =
        data.user;


      await load();

      render();

    };


  document
    .getElementById('signup')
    .onclick = async () => {

      const msg =
        document.getElementById(
          'authMsg'
        );


      const email =
        document
          .getElementById(
            'email'
          ).value;


      const password =
        document
          .getElementById(
            'password'
          ).value;


      msg.textContent =
        'Creando cuenta…';


      const {
        data,
        error
      } =
        await supabase.auth
          .signUp({

            email,

            password

          });


      msg.textContent =
        error

          ?

          error.message

          :

          (
            data.session

              ?

              'Cuenta creada.'

              :

              'Cuenta creada. Revisa tu correo si Supabase solicita confirmación.'
          );

    };

}


/* ==========================================================
   ESTRUCTURA PRINCIPAL
   ========================================================== */

function render() {

  if (!user) {

    renderAuth();

    return;

  }


  const nav = [

    ['dashboard', 'Dashboard'],

    ['registro', 'Registro Diario'],

    ['resumen', 'Resumen Ejecutivo'],

    ['costos', 'Costos'],

    ['mantenimiento', 'Mantenimiento'],

    ['inventario', 'Inventario'],

    ['personal', 'Personal'],

    ['ssoma', 'SSOMA']

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
        nav
          .map(
            x => `

              <button

                data-tab="${x[0]}"

                class="
                  ${tab === x[0]
                    ? 'active'
                    : ''
                  }
                "

              >

                ${x[1]}

              </button>

            `
          )
          .join('')
      }

    </nav>


    <div id="content"></div>

  `;


  document
    .querySelectorAll(
      'nav button'
    )
    .forEach(
      button => {

        button.onclick = () => {

          tab =
            button.dataset.tab;

          render();

        };

      }
    );


  document
    .getElementById('logout')
    .onclick = async () => {

      await supabase.auth
        .signOut();

    };


  if (
    tab === 'dashboard'
  ) {

    renderDashboard();

  }

  else if (
    tab === 'registro'
  ) {

    if (editingId) {

      const registro =
        rows.find(
          r =>
            String(r.id) ===
            String(editingId)
        );

      renderForm(
        registro || null
      );

    }

    else {

      renderForm();

    }

  }

  else if (
    tab === 'costos'
  ) {

    renderCostos();

  }

  else {

    renderPlaceholder(

      nav.find(
        x =>
          x[0] === tab
      )?.[1]
      ||
      'QUIMFLUX'

    );

  }

}


/* ==========================================================
   DASHBOARD
   ========================================================== */

function renderDashboard() {

  const d =
    rows.map(
      derive
    );


  const sums = key =>

    d.reduce(

      (s, r) =>
        s + n(r[key]),

      0

    );


  const k = {

    prod:
      sums('producida'),

    programada:
      sums('programada'),

    mp:
      sums('mp'),

    /*
       MERMA NO SE SUMA COMO PORCENTAJE.

       Para el histórico se calcula
       una media ponderada por MP.
    */

    mermaTotal:
      d.reduce(
        (s, r) =>
          s +
          (
            n(r.mp) *
            n(r.merma)
          ),
        0
      ),

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
      sums('incidentes')

  };


  /*
     CUMPLIMIENTO
  */

  k.cumplimiento =

    k.programada > 0

      ?

      k.prod /
      k.programada

      :

      0;


  /*
     YIELD
  */

  k.yield =

    k.mp > 0

      ?

      k.prod /
      k.mp

      :

      0;


  /*
     MERMA HISTÓRICA

     Promedio ponderado por materia prima.

     Cada registro:
       merma decimal × MP

     Luego:
       suma merma ponderada / suma MP
  */

  k.mermaRate =

    k.mp > 0

      ?

      k.mermaTotal /
      k.mp

      :

      0;


  /*
     DISPONIBILIDAD
  */

  k.disponibilidad =

    k.hours > 0

      ?

      Math.max(
        0,
        (
          k.hours -
          k.stop
        ) /
        k.hours
      )

      :

      0;


  /*
     ASISTENCIA
  */

  k.asistencia =

    k.pp > 0

      ?

      k.pa /
      k.pp

      :

      0;


  /*
     RECHAZO
  */

  k.rechazo =

    k.prod > 0

      ?

      k.rej /
      k.prod

      :

      0;


  /*
     OTIF
  */

  k.otif =

    k.pedidos > 0

      ?

      k.tiempo /
      k.pedidos

      :

      null;


  /*
     OEE
  */

  k.oee =

    k.disponibilidad *
    k.yield *
    Math.max(
      0,
      1 - k.rechazo
    );


  const last =

    d.length

      ?

      d[d.length - 1]

      :

      null;


  /* ========================================================
     ALERTAS
     ======================================================== */

  const alerts = [];


  if (last) {

    if (
      last.cumplimiento <
      metas.cumplimiento
    ) {

      alerts.push({

        tipo: 'warn',

        titulo:
          'Cumplimiento requiere revisión',

        valor:
          pct(
            last.cumplimiento
          ),

        meta:
          pct(
            metas.cumplimiento
          )

      });

    }


    if (
      last.yieldRate <
      metas.yield
    ) {

      alerts.push({

        tipo: 'warn',

        titulo:
          'Yield requiere revisión',

        valor:
          pct(
            last.yieldRate
          ),

        meta:
          pct(
            metas.yield
          )

      });

    }


    if (
      last.merma >
      metas.merma
    ) {

      alerts.push({

        tipo: 'critical',

        titulo:
          'Merma en nivel crítico',

        valor:
          pct(
            last.merma
          ),

        meta:
          'máx. ' +
          pct(
            metas.merma
          )

      });

    }


    if (
      last.oee <
      .80
    ) {

      alerts.push({

        tipo: 'critical',

        titulo:
          'OEE en nivel crítico',

        valor:
          pct(
            last.oee
          ),

        meta:
          'mín. 80.0%'

      });

    }


    if (
      last.otif !== null &&
      last.otif <
      metas.otif
    ) {

      alerts.push({

        tipo: 'warn',

        titulo:
          'OTIF requiere revisión',

        valor:
          pct(
            last.otif
          ),

        meta:
          pct(
            metas.otif
          )

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
                alerts
                  .map(
                    a => `

                      <div class="card">

                        <span
                          class="
                            badge
                            ${a.tipo}
                          "
                        >

                          ${
                            a.tipo ===
                            'critical'

                              ?

                              'CRÍTICO'

                              :

                              'REVISAR'

                          }

                        </span>

                        <strong>
                          ${esc(a.titulo)}
                        </strong>

                        <small>

                          ${a.valor}

                          · Meta

                          ${a.meta}

                        </small>

                      </div>

                    `
                  )
                  .join('')
              }

            </div>

          `

          :

          `

            <span
              class="badge ok"
            >

              0 CRÍTICAS

            </span>

          `

      }

    </section>

  `;


  /* ========================================================
     ÚLTIMO TURNO
     ======================================================== */

  let ultimoHTML = '';


  if (last) {

    const otifStatus =

      last.otif === null

        ?

        {
          label: 'N/A',
          cls: 'na'
        }

        :

        status(
          last.otif,
          metas.otif
        );


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

              ?

              ' · ' +
              esc(
                last.producto
              )

              :

              ''

          }

        </p>

        <span
          class="badge ok"
        >
          REGISTRO MÁS RECIENTE
        </span>


        <div class="cards">

          ${indicador(
            'Cumplimiento',
            last.cumplimiento,
            metas.cumplimiento
          )}

          ${indicador(
            'Yield',
            last.yieldRate,
            metas.yield
          )}

          ${indicador(
            'Merma',
            last.merma,
            metas.merma,
            true
          )}

          ${indicador(
            'Disponibilidad',
            last.disponibilidad,
            metas.disponibilidad
          )}

          ${indicador(
            'Asistencia',
            last.asistencia,
            metas.asistencia
          )}

          ${indicador(
            'Rechazo',
            last.rechazo,
            metas.rechazo,
            true
          )}

          ${indicador(
            'OEE',
            last.oee,
            .80
          )}

          ${indicador(
            'OTIF',
            last.otif,
            metas.otif,
            false,
            otifStatus
          )}

        </div>


        <div class="card">

          <small>
            Producción del último turno
          </small>

          <strong>

            ${n(last.producida)
              .toLocaleString()}

            de

            ${n(last.programada)
              .toLocaleString()}

            programados

          </strong>

        </div>

      </section>

    `;

  }


  /* ========================================================
     HISTÓRICO
     ======================================================== */

  const otifHistoricoStatus =

    k.otif === null

      ?

      {
        label: 'N/A',
        cls: 'na'
      }

      :

      status(
        k.otif,
        metas.otif
      );


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

        <div class="card">

          <small>
            Producción total
          </small>

          <strong>
            ${k.prod.toLocaleString()}
          </strong>

        </div>


        ${indicador(
          'Cumplimiento',
          k.cumplimiento,
          metas.cumplimiento
        )}


        ${indicador(
          'Yield',
          k.yield,
          metas.yield
        )}


        ${indicador(
          'Merma',
          k.mermaRate,
          metas.merma,
          true
        )}


        ${indicador(
          'Disponibilidad',
          k.disponibilidad,
          metas.disponibilidad
        )}


        ${indicador(
          'Asistencia',
          k.asistencia,
          metas.asistencia
        )}


        ${indicador(
          'Rechazo calidad',
          k.rechazo,
          metas.rechazo,
          true
        )}


        ${indicador(
          'OEE',
          k.oee,
          .80
        )}


        <div class="card">

          <small>
            Costo producción
          </small>

          <strong>
            S/
            ${k.costo.toLocaleString()}
          </strong>

        </div>


        <div class="card">

          <small>
            Costo mantenimiento
          </small>

          <strong>
            S/
            ${k.mnt.toLocaleString()}
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
                ?
                (
                  k.costo /
                  k.prod
                ).toFixed(3)
                :
                '0.000'
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
                ?
                (
                  k.energia /
                  k.prod
                ).toFixed(3)
                :
                '0.000'
            }

            kWh/unidad

          </strong>

        </div>


        ${indicador(
          'Entregas a tiempo',
          k.otif,
          metas.otif,
          false,
          otifHistoricoStatus
        )}


        ${indicador(
          'Incidentes SSOMA',
          k.incidentes,
          metas.incidentes,
          true
        )}

      </div>

    </section>

  `;


  /* ========================================================
     COMPARATIVA
     ======================================================== */

  let comparativaHTML = '';


  if (last) {

    const diferencia = (
      actual,
      historico
    ) => {

      if (
        actual === null ||
        historico === null
      ) {

        return 'N/A';

      }


      return (

        (
          (
            n(actual) -
            n(historico)
          ) * 100

        ).toFixed(1)

        + ' pp'

      );

    };


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

                <td>
                  Cumplimiento
                </td>

                <td>
                  ${pct(
                    last.cumplimiento
                  )}
                </td>

                <td>
                  ${pct(
                    k.cumplimiento
                  )}
                </td>

                <td>
                  ${diferencia(
                    last.cumplimiento,
                    k.cumplimiento
                  )}
                </td>

              </tr>


              <tr>

                <td>
                  Yield
                </td>

                <td>
                  ${pct(
                    last.yieldRate
                  )}
                </td>

                <td>
                  ${pct(
                    k.yield
                  )}
                </td>

                <td>
                  ${diferencia(
                    last.yieldRate,
                    k.yield
                  )}
                </td>

              </tr>


              <tr>

                <td>
                  Merma
                </td>

                <td>
                  ${pct(
                    last.merma
                  )}
                </td>

                <td>
                  ${pct(
                    k.mermaRate
                  )}
                </td>

                <td>
                  ${diferencia(
                    last.merma,
                    k.mermaRate
                  )}
                </td>

              </tr>


              <tr>

                <td>
                  Disponibilidad
                </td>

                <td>
                  ${pct(
                    last.disponibilidad
                  )}
                </td>

                <td>
                  ${pct(
                    k.disponibilidad
                  )}
                </td>

                <td>
                  ${diferencia(
                    last.disponibilidad,
                    k.disponibilidad
                  )}
                </td>

              </tr>


              <tr>

                <td>
                  Asistencia
                </td>

                <td>
                  ${pct(
                    last.asistencia
                  )}
                </td>

                <td>
                  ${pct(
                    k.asistencia
                  )}
                </td>

                <td>
                  ${diferencia(
                    last.asistencia,
                    k.asistencia
                  )}
                </td>

              </tr>


              <tr>

                <td>
                  Rechazo
                </td>

                <td>
                  ${pct(
                    last.rechazo
                  )}
                </td>

                <td>
                  ${pct(
                    k.rechazo
                  )}
                </td>

                <td>
                  ${diferencia(
                    last.rechazo,
                    k.rechazo
                  )}
                </td>

              </tr>


              <tr>

                <td>
                  OEE
                </td>

                <td>
                  ${pct(
                    last.oee
                  )}
                </td>

                <td>
                  ${pct(
                    k.oee
                  )}
                </td>

                <td>
                  ${diferencia(
                    last.oee,
                    k.oee
                  )}
                </td>

              </tr>


              <tr>

                <td>
                  OTIF
                </td>

                <td>
                  ${
                    last.otif === null
                      ? 'N/A'
                      : pct(last.otif)
                  }
                </td>

                <td>
                  ${
                    k.otif === null
                      ? 'N/A'
                      : pct(k.otif)
                  }
                </td>

                <td>
                  ${diferencia(
                    last.otif,
                    k.otif
                  )}
                </td>

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
      'S/ ' +
      k.costo.toLocaleString()
    ],

    [
      'Costo mantenimiento',
      'S/ ' +
      k.mnt.toLocaleString()
    ],

    [
      'Horas parada',
      k.stop.toFixed(2) +
      ' h'
    ],

    [
      'Costo unitario',
      'S/' +
      (
        k.prod
          ? k.costo / k.prod
          : 0
      ).toFixed(3)
    ],

    [
      'Energía',
      (
        k.prod
          ? k.energia / k.prod
          : 0
      ).toFixed(3) +
      ' kWh/unidad'
    ],

    [
      'Entregas a tiempo',

      k.otif === null
        ? 'N/A'
        : pct(k.otif),

      k.otif === null

        ?

        {
          label: 'N/A',
          cls: 'na'
        }

        :

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
     TABLA ÚLTIMOS REGISTROS
     ======================================================== */

  const tablaHTML =

    d.length

      ?

      `

        <div class="tableWrap">

          <table>

            <thead>

              <tr>

                <th>
                  Fecha
                </th>

                <th>
                  Turno
                </th>

                <th>
                  Producto
                </th>

                <th>
                  Programada
                </th>

                <th>
                  Producida
                </th>

                <th>
                  Merma
                </th>

                <th>
                  OEE
                </th>

                <th>
                  Acciones
                </th>

              </tr>

            </thead>


            <tbody>

              ${
                d
                  .slice(-20)
                  .reverse()
                  .map(
                    r => `

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
                          ${n(
                            r.programada
                          ).toLocaleString()}
                        </td>

                        <td>
                          ${n(
                            r.producida
                          ).toLocaleString()}
                        </td>

                        <td>
                          ${pct(r.merma)}
                        </td>

                        <td>
                          ${pct(r.oee)}
                        </td>

                        <td>

                          <div
                            class="rowActions"
                          >

                            <button

                              class="actionBtn"

                              data-view="
                                ${esc(r.id)}
                              "

                              title="
                                Ver registro
                              "

                            >
                              👁️
                            </button>


                            <button

                              class="actionBtn"

                              data-edit="
                                ${esc(r.id)}
                              "

                              title="
                                Editar registro
                              "

                            >
                              ✏️
                            </button>


                            <button

                              class="
                                actionBtn
                                danger
                              "

                              data-delete="
                                ${esc(r.id)}
                              "

                              title="
                                Eliminar registro
                              "

                            >
                              🗑️
                            </button>

                          </div>

                        </td>

                      </tr>

                    `
                  )
                  .join('')
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

          <b>
            Registro Diario
          </b>

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
              cards
                .map(
                  c => `

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
                              class="
                                badge
                                ${c[2].cls}
                              "
                            >

                              ${c[2].label}

                            </span>

                          `

                          :

                          ''

                      }

                    </div>

                  `
                )
                .join('')
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


  /* ========================================================
     ACTIVAR BOTONES
     ======================================================== */

  document
    .querySelectorAll(
      '[data-view]'
    )
    .forEach(
      button => {

        button.onclick = () => {

          verRegistro(
            button.dataset.view
          );

        };

      }
    );


  document
    .querySelectorAll(
      '[data-edit]'
    )
    .forEach(
      button => {

        button.onclick = () => {

          editarRegistro(
            button.dataset.edit
          );

        };

      }
    );


  document
    .querySelectorAll(
      '[data-delete]'
    )
    .forEach(
      button => {

        button.onclick = async () => {

          await eliminarRegistro(
            button.dataset.delete
          );

        };

      }
    );

}


/* ==========================================================
   VER REGISTRO
   ========================================================== */

function verRegistro(id) {

  const r =
    rows.find(
      x =>
        String(x.id) ===
        String(id)
    );


  if (!r) {

    alert(
      'No se encontró el registro.'
    );

    return;

  }


  viewingId = id;


  const d =
    derive(r);


  const contenido = {

    'Fecha':
      r.fecha,

    'Turno':
      r.turno,

    'Producto':
      r.producto || '—',

    'Cantidad programada':
      n(r.programada)
        .toLocaleString(),

    'Cantidad producida':
      n(r.producida)
        .toLocaleString(),

    'Materia prima consumida':
      n(r.mp),

    'Merma':
      pct(d.merma),

    'Horas de turno':
      n(r.horas_turno),

    'Horas de parada':
      n(r.horas_paradas),

    'Personal programado':
      n(r.personal_programado),

    'Personal presente':
      n(r.personal_presente),

    'Unidades rechazadas':
      n(r.rechazadas),

    'Costo producción':
      'S/ ' +
      n(
        r.costo_produccion
      ).toFixed(2),

    'Energía':
      n(r.energia) +
      ' kWh',

    'Costo mantenimiento':
      'S/ ' +
      n(
        r.costo_mantenimiento
      ).toFixed(2),

    'Incidentes SSOMA':
      n(r.incidentes),

    'Pedidos programados':
      n(r.pedidos_programados),

    'Pedidos a tiempo':
      n(r.pedidos_tiempo),

    'Reproceso':
      n(r.reproceso),

    'No conformidades':
      n(r.no_conformidades),

    'Observaciones':
      r.observaciones ||
      '—',

    'Cumplimiento':
      pct(d.cumplimiento),

    'Yield':
      pct(d.yieldRate),

    'Merma %':
      pct(d.merma),

    'Disponibilidad':
      pct(d.disponibilidad),

    'Asistencia':
      pct(d.asistencia),

    'Rechazo':
      pct(d.rechazo),

    'OEE':
      pct(d.oee),

    'OTIF':
      d.otif === null
        ? 'N/A'
        : pct(d.otif)

  };


  const modal =
    document.createElement(
      'div'
    );


  modal.className =
    'modalOverlay';


  modal.innerHTML = `

    <div class="modalCard">

      <div class="modalHeader">

        <div>

          <h2>
            Registro diario
          </h2>

          <small>

            ${esc(r.fecha)}

            ·

            ${esc(r.turno)}

            ${
              r.producto

                ?

                ' · ' +
                esc(
                  r.producto
                )

                :

                ''

            }

          </small>

        </div>


        <button
          class="modalClose"
          id="closeModal"
        >
          ×
        </button>

      </div>


      <div class="detailGrid">

        ${
          Object.entries(
            contenido
          )
          .map(
            ([label, value]) => `

              <div
                class="detailItem"
              >

                <small>
                  ${esc(label)}
                </small>

                <strong>
                  ${esc(value)}
                </strong>

              </div>

            `
          )
          .join('')
        }

      </div>


      <div class="modalActions">

        <button
          class="primary"
          id="modalEdit"
        >
          ✏️ Editar
        </button>


        <button
          class="danger"
          id="modalDelete"
        >
          🗑️ Eliminar
        </button>


        <button
          class="secondary"
          id="modalClose2"
        >
          Cerrar
        </button>

      </div>

    </div>

  `;


  document.body.appendChild(
    modal
  );


  const cerrar = () => {

    modal.remove();

    viewingId = null;

  };


  modal
    .querySelector(
      '#closeModal'
    )
    .onclick = cerrar;


  modal
    .querySelector(
      '#modalClose2'
    )
    .onclick = cerrar;


  modal
    .querySelector(
      '#modalEdit'
    )
    .onclick = () => {

      cerrar();

      editarRegistro(id);

    };


  modal
    .querySelector(
      '#modalDelete'
    )
    .onclick = async () => {

      cerrar();

      await eliminarRegistro(
        id
      );

    };

}


/* ==========================================================
   EDITAR REGISTRO
   ========================================================== */

function editarRegistro(id) {

  const r =
    rows.find(
      x =>
        String(x.id) ===
        String(id)
    );


  if (!r) {

    alert(
      'No se encontró el registro.'
    );

    return;

  }


  editingId = id;

  tab = 'registro';

  render();

}


/* ==========================================================
   ELIMINAR REGISTRO
   ========================================================== */

async function eliminarRegistro(id) {

  const registro =
    rows.find(
      r =>
        String(r.id) ===
        String(id)
    );


  if (!registro) {

    alert(
      'No se encontró el registro.'
    );

    return;

  }


  const confirmar =
    confirm(

      `¿Eliminar el registro?

Fecha: ${registro.fecha}
Turno: ${registro.turno}
Producto: ${
  registro.producto ||
  'Sin producto'
}

Esta acción no se puede deshacer.`

    );


  if (!confirmar) {

    return;

  }


  const {
    error
  } =
    await supabase
      .from(
        'daily_records'
      )
      .delete()
      .eq(
        'id',
        id
      );


  if (error) {

    alert(

      'No se pudo eliminar el registro:\n\n' +
      error.message

    );

    return;

  }


  await load();


  tab = 'dashboard';

  render();

}


/* ==========================================================
   REGISTRO DIARIO
   ========================================================== */

function renderForm(
  registro = null
) {

  const r =
    registro
      ? { ...registro }
      : empty();


  const editando =
    Boolean(registro);


  document
    .getElementById('content')
    .innerHTML = `

      <main>

        <div class="titleRow">

          <div>

            <h1>

              ${
                editando

                  ?

                  'Editar registro diario'

                  :

                  'Registro Diario'

              }

            </h1>

            <p>

              ${
                editando

                  ?

                  'Modifica los datos del registro seleccionado.'

                  :

                  'Ingresa todos los datos del turno. Los KPI se calculan automáticamente.'

              }

            </p>

          </div>


          ${
            editando

              ?

              `

                <button
                  class="secondary"
                  id="cancelEdit"
                >
                  Cancelar edición
                </button>

              `

              :

              ''

          }

        </div>


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
                .slice(0, 7)
                .map(
                  f =>
                    control(
                      f,
                      r
                    )
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
                .slice(7, 12)
                .map(
                  f =>
                    control(
                      f,
                      r
                    )
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
                .slice(12, 15)
                .map(
                  f =>
                    control(
                      f,
                      r
                    )
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
                  f =>
                    control(
                      f,
                      r
                    )
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

            ${
              editando
                ? 'Guardar cambios'
                : 'Guardar registro diario'
            }

          </button>

        </form>

      </main>

  `;


  /*
     AYUDA VISUAL PARA MERMA
  */

  const mermaInput =
    document.getElementById(
      'f_merma'
    );


  if (mermaInput) {

    const help =
      document.createElement(
        'small'
      );

    help.className =
      'mermaHelp';

    help.textContent =
      'Ingrese el porcentaje directamente. Ejemplo: 2 = 2%.';

    mermaInput.parentElement
      ?.appendChild(help);

  }


  if (editando) {

    document
      .getElementById(
        'cancelEdit'
      )
      .onclick = () => {

        editingId = null;

        tab = 'dashboard';

        render();

      };

  }


  document
    .getElementById('daily')
    .onsubmit = async e => {

      e.preventDefault();


      const msg =
        document.getElementById(
          'saveMsg'
        );


      const payload = {

        user_id:
          user.id

      };


      fields.forEach(
        ([key, , type]) => {

          const el =
            document.getElementById(
              'f_' + key
            );


          if (!el) {

            return;

          }


          /*
             MERMA:

             Se guarda como número tal como
             lo introduce el usuario.

             2 = 2%
             5 = 5%
             10 = 10%

             derive() se encarga de convertir
             internamente a 0.02, 0.05, 0.10.
          */

          payload[key] =

            type === 'number'

              ?

              (
                el.value === ''

                  ?

                  null

                  :

                  n(el.value)

              )

              :

              el.value;

        }
      );


      msg.textContent =

        editando

          ?

          'Guardando cambios…'

          :

          'Guardando…';


      let response;


      if (editando) {

        response =

          await supabase
            .from(
              'daily_records'
            )
            .update(
              payload
            )
            .eq(
              'id',
              editingId
            );

      }

      else {

        response =

          await supabase
            .from(
              'daily_records'
            )
            .insert(
              payload
            );

      }


      if (response.error) {

        msg.textContent =
          response.error.message;

        return;

      }


      msg.textContent =

        editando

          ?

          'Cambios guardados correctamente.'

          :

          'Registro guardado correctamente.';


      editingId = null;


      await load();


      setTimeout(
        () => {

          tab = 'dashboard';

          render();

        },
        500
      );

    };

}


/* ==========================================================
   CONTROLES FORMULARIO
   ========================================================== */

function control(
  f,
  r
) {

  const [
    key,
    label,
    type
  ] = f;


  let input;


  if (
    type === 'select'
  ) {

    input = `

      <select
        id="f_${key}"
      >

        <option
          ${
            r[key] === 'Mañana'
              ? 'selected'
              : ''
          }
        >
          Mañana
        </option>

        <option
          ${
            r[key] === 'Tarde'
              ? 'selected'
              : ''
          }
        >
          Tarde
        </option>

        <option
          ${
            r[key] === 'Noche'
              ? 'selected'
              : ''
          }
        >
          Noche
        </option>

      </select>

    `;

  }


  else if (
    type === 'textarea'
  ) {

    input = `

      <textarea
        id="f_${key}"
      >${esc(
        r[key] || ''
      )}</textarea>

    `;

  }


  else {

    input = `

      <input

        id="f_${key}"

        type="${type}"

        value="${esc(
          r[key] ?? ''
        )}"

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

      ${esc(label)}

      ${input}

    </label>

  `;

}


/* ==========================================================
   COSTOS
   ========================================================== */

function renderCostos() {

  const d =
    rows.map(
      derive
    );


  const totalProduccion =
    d.reduce(
      (s, r) =>
        s +
        n(
          r.costo_produccion
        ),
      0
    );


  const totalMantenimiento =
    d.reduce(
      (s, r) =>
        s +
        n(
          r.costo_mantenimiento
        ),
      0
    );


  const totalEnergia =
    d.reduce(
      (s, r) =>
        s +
        n(r.energia),
      0
    );


  const totalProduccionUnidades =
    d.reduce(
      (s, r) =>
        s +
        n(r.producida),
      0
    );


  const costoTotal =
    totalProduccion +
    totalMantenimiento;


  const costoUnitario =
    totalProduccionUnidades > 0

      ?

      totalProduccion /
      totalProduccionUnidades

      :

      0;


  const costoMantenimientoUnitario =
    totalProduccionUnidades > 0

      ?

      totalMantenimiento /
      totalProduccionUnidades

      :

      0;


  const costoTotalUnitario =
    totalProduccionUnidades > 0

      ?

      costoTotal /
      totalProduccionUnidades

      :

      0;


  const energiaUnit =
    totalProduccionUnidades > 0

      ?

      totalEnergia /
      totalProduccionUnidades

      :

      0;


  const last =
    d.length
      ? d[d.length - 1]
      : null;


  document
    .getElementById('content')
    .innerHTML = `

      <main>

        <h1>
          Costos
        </h1>

        <p>
          Análisis económico y energético
          a partir de los registros diarios.
        </p>


        <span class="online">
          ● EN LÍNEA
        </span>


        <section class="panel">

          <h2>
            💰 Resumen económico
          </h2>

          <p>
            Consolidado de todos los registros diarios.
          </p>


          <div class="cards">

            <div class="card">

              <small>
                Producción acumulada
              </small>

              <strong>
                ${totalProduccionUnidades
                  .toLocaleString()}
                unidades
              </strong>

            </div>


            <div class="card">

              <small>
                Costo producción
              </small>

              <strong>
                S/
                ${totalProduccion
                  .toFixed(2)}
              </strong>

            </div>


            <div class="card">

              <small>
                Costo mantenimiento
              </small>

              <strong>
                S/
                ${totalMantenimiento
                  .toFixed(2)}
              </strong>

            </div>


            <div class="card">

              <small>
                Costo total
              </small>

              <strong>
                S/
                ${costoTotal
                  .toFixed(2)}
              </strong>

            </div>


            <div class="card">

              <small>
                Costo unitario producción
              </small>

              <strong>
                S/
                ${costoUnitario
                  .toFixed(3)}
                / unidad
              </strong>

            </div>


            <div class="card">

              <small>
                Costo mantenimiento unitario
              </small>

              <strong>
                S/
                ${costoMantenimientoUnitario
                  .toFixed(3)}
                / unidad
              </strong>

            </div>


            <div class="card">

              <small>
                Costo total unitario
              </small>

              <strong>
                S/
                ${costoTotalUnitario
                  .toFixed(3)}
                / unidad
              </strong>

            </div>


            <div class="card">

              <small>
                Mantenimiento / producción
              </small>

              <strong>
                ${
                  totalProduccion > 0

                    ?

                    (
                      totalMantenimiento /
                      totalProduccion *
                      100
                    ).toFixed(1)

                    :

                    '0.0'
                }%
              </strong>

            </div>

          </div>

        </section>


        <section class="panel">

          <h2>
            Último turno
          </h2>

          ${
            last

              ?

              `

                <p>

                  ${esc(last.fecha)}
                  ·
                  ${esc(last.turno)}

                </p>


                <div class="cards">

                  <div class="card">

                    <small>
                      Costo producción
                    </small>

                    <strong>
                      S/
                      ${n(
                        last.costo_produccion
                      ).toFixed(2)}
                    </strong>

                  </div>


                  <div class="card">

                    <small>
                      Costo unitario
                    </small>

                    <strong>
                      S/
                      ${n(
                        last.costoUnitario
                      ).toFixed(3)}
                    </strong>

                  </div>


                  <div class="card">

                    <small>
                      Costo mantenimiento
                    </small>

                    <strong>
                      S/
                      ${n(
                        last.costo_mantenimiento
                      ).toFixed(2)}
                    </strong>

                  </div>


                  <div class="card">

                    <small>
                      Mantenimiento / unidad
                    </small>

                    <strong>
                      S/
                      ${
                        last.producida > 0

                          ?

                          (
                            n(
                              last.costo_mantenimiento
                            ) /
                            n(
                              last.producida
                            )
                          ).toFixed(3)

                          :

                          '0.000'
                      }
                    </strong>

                  </div>


                  <div class="card">

                    <small>
                      Energía
                    </small>

                    <strong>
                      ${n(
                        last.energia
                      ).toFixed(2)}
                      kWh
                    </strong>

                  </div>


                  <div class="card">

                    <small>
                      Energía específica
                    </small>

                    <strong>
                      ${n(
                        last.energiaUnit
                      ).toFixed(3)}
                      kWh/unidad
                    </strong>

                  </div>


                  <div class="card">

                    <small>
                      Horas parada
                    </small>

                    <strong>
                      ${n(
                        last.horas_paradas
                      ).toFixed(2)}
                      h
                    </strong>

                  </div>

                </div>

              `

              :

              `

                <div class="empty">
                  No hay registros.
                </div>

              `

          }

        </section>


        <section class="panel">

          <h2>
            Comparativa: último turno vs histórico anterior
          </h2>

          <p>
            La referencia histórica excluye el último turno.
          </p>


          ${
            d.length >= 2

              ?

              (() => {

                const anterior =
                  d[d.length - 2];

                const diff = (
                  a,
                  b
                ) =>

                  (
                    n(a) -
                    n(b)
                  ).toFixed(3);

                return `

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
                            Histórico anterior
                          </th>

                          <th>
                            Variación
                          </th>

                        </tr>

                      </thead>


                      <tbody>

                        <tr>

                          <td>
                            Costo unitario producción
                          </td>

                          <td>
                            S/
                            ${n(
                              last.costoUnitario
                            ).toFixed(3)}
                          </td>

                          <td>
                            S/
                            ${n(
                              anterior.costoUnitario
                            ).toFixed(3)}
                          </td>

                          <td>
                            ${diff(
                              last.costoUnitario,
                              anterior.costoUnitario
                            )}
                          </td>

                        </tr>


                        <tr>

                          <td>
                            Costo mantenimiento / unidad
                          </td>

                          <td>
                            S/
                            ${
                              last.producida > 0

                                ?

                                (
                                  n(
                                    last.costo_mantenimiento
                                  ) /
                                  n(
                                    last.producida
                                  )
                                ).toFixed(3)

                                :

                                '0.000'
                            }
                          </td>

                          <td>
                            S/
                            ${
                              anterior.producida > 0

                                ?

                                (
                                  n(
                                    anterior.costo_mantenimiento
                                  ) /
                                  n(
                                    anterior.producida
                                  )
                                ).toFixed(3)

                                :

                                '0.000'
                            }
                          </td>

                          <td>
                            —
                          </td>

                        </tr>


                        <tr>

                          <td>
                            Energía específica
                          </td>

                          <td>
                            ${n(
                              last.energiaUnit
                            ).toFixed(3)}
                            kWh/unidad
                          </td>

                          <td>
                            ${n(
                              anterior.energiaUnit
                            ).toFixed(3)}
                            kWh/unidad
                          </td>

                          <td>
                            ${diff(
                              last.energiaUnit,
                              anterior.energiaUnit
                            )}
                          </td>

                        </tr>

                      </tbody>

                    </table>

                  </div>

                `;

              })()

              :

              `

                <div class="empty">
                  Se necesitan al menos
                  2 registros para comparar.
                </div>

              `

          }

        </section>


        <section class="panel">

          <h2>
            📈 Tendencia de costos
          </h2>

          <p>
            Evolución del costo unitario y consumo energético.
          </p>

          <div class="cards">

            <div class="card">

              <small>
                Costo unitario actual
              </small>

              <strong>
                S/
                ${costoUnitario.toFixed(3)}
              </strong>

            </div>


            <div class="card">

              <small>
                Energía específica actual
              </small>

              <strong>
                ${energiaUnit.toFixed(3)}
                kWh/unidad
              </strong>

            </div>


            <div class="card">

              <small>
                Costo total acumulado
              </small>

              <strong>
                S/
                ${costoTotal.toFixed(2)}
              </strong>

            </div>

          </div>

        </section>


        <section class="panel">

          <h2>
            ⚡ Energía
          </h2>

          <p>
            Indicadores equivalentes de consumo energético.
          </p>

          <div class="cards">

            <div class="card">

              <small>
                Consumo total
              </small>

              <strong>
                ${totalEnergia.toFixed(2)}
                kWh
              </strong>

            </div>


            <div class="card">

              <small>
                Consumo específico
              </small>

              <strong>
                ${energiaUnit.toFixed(3)}
                kWh/unidad
              </strong>

            </div>


            <div class="card">

              <small>
                Producción asociada
              </small>

              <strong>
                ${totalProduccionUnidades
                  .toLocaleString()}
                unidades
              </strong>

            </div>

          </div>

        </section>


        <section class="panel">

          <h2>
            Detalle por registro
          </h2>


          ${
            d.length

              ?

              `

                <div class="tableWrap">

                  <table>

                    <thead>

                      <tr>

                        <th>
                          Fecha
                        </th>

                        <th>
                          Turno
                        </th>

                        <th>
                          Producto
                        </th>

                        <th>
                          Costo producción
                        </th>

                        <th>
                          Costo mantenimiento
                        </th>

                        <th>
                          Costo unitario
                        </th>

                        <th>
                          Energía/unidad
                        </th>

                        <th>
                          Costo total/unidad
                        </th>

                      </tr>

                    </thead>


                    <tbody>

                      ${
                        d
                          .slice(-20)
                          .reverse()
                          .map(
                            r => `

                              <tr>

                                <td>
                                  ${esc(
                                    r.fecha
                                  )}
                                </td>

                                <td>
                                  ${esc(
                                    r.turno
                                  )}
                                </td>

                                <td>
                                  ${esc(
                                    r.producto
                                  )}
                                </td>

                                <td>
                                  S/
                                  ${n(
                                    r.costo_produccion
                                  ).toFixed(2)}
                                </td>

                                <td>
                                  S/
                                  ${n(
                                    r.costo_mantenimiento
                                  ).toFixed(2)}
                                </td>

                                <td>
                                  S/
                                  ${n(
                                    r.costoUnitario
                                  ).toFixed(3)}
                                </td>

                                <td>
                                  ${n(
                                    r.energiaUnit
                                  ).toFixed(3)}
                                </td>

                                <td>
                                  S/
                                  ${
                                    r.producida > 0

                                      ?

                                      (
                                        (
                                          n(
                                            r.costo_produccion
                                          ) +
                                          n(
                                            r.costo_mantenimiento
                                          )
                                        ) /
                                        n(
                                          r.producida
                                        )
                                      ).toFixed(3)

                                      :

                                      '0.000'
                                  }
                                </td>

                              </tr>

                            `
                          )
                          .join('')
                      }

                    </tbody>

                  </table>

                </div>

              `

              :

              `

                <div class="empty">
                  No hay registros.
                </div>

              `

          }

        </section>


        <section class="panel">

          <h2>
            🔎 Lectura administrativa
          </h2>

          <div class="cards">

            <div class="card">

              <small>
                Costo producción
              </small>

              <strong>
                S/
                ${totalProduccion.toFixed(2)}
              </strong>

            </div>


            <div class="card">

              <small>
                Mantenimiento
              </small>

              <strong>
                S/
                ${totalMantenimiento.toFixed(2)}
              </strong>

            </div>


            <div class="card">

              <small>
                Energía específica
              </small>

              <strong>
                ${energiaUnit.toFixed(3)}
                kWh/unidad
              </strong>

            </div>

          </div>


          <p>

            La lectura administrativa permite observar
            cómo evoluciona el costo unitario,
            el mantenimiento y el consumo energético
            respecto a la producción.

          </p>

        </section>

      </main>

  `;

}


/* ==========================================================
   MÓDULOS FUTUROS
   ========================================================== */

function renderPlaceholder(
  title
) {

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

async function load() {

  const r =
    await supabase
      .from(
        'daily_records'
      )
      .select('*')
      .order(
        'fecha',
        {
          ascending: true
        }
      );


  if (!r.error) {

    rows =
      r.data || [];

  }


  const s =
    await supabase
      .from(
        'app_settings'
      )
      .select('*')
      .limit(1)
      .maybeSingle();


  if (s.data) {

    metas = {

      ...metas,

      cumplimiento:
        n(
          s.data
            .meta_cumplimiento
        ) ||
        metas.cumplimiento,

      merma:
        n(
          s.data
            .meta_merma
        ) ||
        metas.merma,

      yield:
        n(
          s.data
            .meta_yield
        ) ||
        metas.yield,

      disponibilidad:
        n(
          s.data
            .meta_disponibilidad
        ) ||
        metas.disponibilidad,

      asistencia:
        n(
          s.data
            .meta_asistencia
        ) ||
        metas.asistencia,

      rechazo:
        n(
          s.data
            .meta_rechazo
        ) ||
        metas.rechazo,

      otif:
        n(
          s.data
            .meta_entregas
        ) ||
        metas.otif,

      incidentes:
        n(
          s.data
            .meta_incidentes
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
    async ({
      data
    }) => {

      user =
        data.session?.user ||
        null;


      if (user) {

        await load();

      }


      render();

    }
  );


supabase.auth
  .onAuthStateChange(
    (
      _event,
      session
    ) => {

      user =
        session?.user ||
        null;

      render();

    }
  );