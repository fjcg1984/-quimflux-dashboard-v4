import { createClient } from '@supabase/supabase-js';
import './styles.css';

const SUPABASE_URL =
  'https://cgkdztwtodmdteohvuoh.supabase.co';

const SUPABASE_KEY =
  'sb_publishable_sULeDyfJ1l5xfuVhFgXRKA_bsim9qSe';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const app = document.getElementById('app');

const today =
  new Date().toISOString().slice(0, 10);

let user = null;

let rows = [];
let inventoryRows = [];
let ssomaRows = [];
let personalRows = [];
let maintenanceRows = [];

let tab = 'dashboard';

let editingInventoryId = null;
let editingSsomaId = null;
let editingPersonalId = null;
let editingMaintenanceId = null;

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


/* =========================================================
   UTILIDADES
========================================================= */

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
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function pct(v) {
  return (n(v) * 100).toFixed(1) + '%';
}

function msg(id, text) {
  const el =
    document.getElementById(id);

  if (el) {
    el.textContent = text;
  }
}


/* =========================================================
   REGISTRO DIARIO
========================================================= */

const fields = [
  ['fecha', 'Fecha', 'date'],
  ['turno', 'Turno', 'select'],
  ['producto', 'Producto', 'text'],
  ['programada', 'Cantidad programada', 'number'],
  ['producida', 'Cantidad producida', 'number'],
  ['mp', 'Materia prima consumida', 'number'],
  ['merma', 'Merma', 'number'],

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

function derive(r) {

  const p = n(r.programada);
  const q = n(r.producida);
  const mp = n(r.mp);

  const h = n(r.horas_turno);
  const stop = n(r.horas_paradas);

  const pp = n(r.personal_programado);
  const pa = n(r.personal_presente);

  const rej = n(r.rechazadas);

  const pedidos =
    n(r.pedidos_programados);

  const at =
    n(r.pedidos_tiempo);

  const merma =
    mp ? n(r.merma) / mp : 0;

  const yieldRate =
    mp ? q / mp : 0;

  const disponibilidad =
    h
      ? Math.max(0, (h - stop) / h)
      : 0;

  const asistencia =
    pp ? pa / pp : 0;

  const rechazo =
    q ? rej / q : 0;

  const cumplimiento =
    p ? q / p : 0;

  const otif =
    pedidos ? at / pedidos : 0;

  const oee =
    disponibilidad *
    cumplimiento *
    Math.max(0, 1 - rechazo);

  const costoUnitario =
    q
      ? n(r.costo_produccion) / q
      : 0;

  const energiaUnit =
    q
      ? n(r.energia) / q
      : 0;

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
    costoUnitario,
    energiaUnit
  };
}

function empty() {

  return {
    fecha: today,
    turno: 'Mañana',
    producto: '',
    programada: 0,
    producida: 0,
    mp: 0,
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


/* =========================================================
   LOGIN
========================================================= */

function renderAuth() {

  app.innerHTML = `

    <div class="auth">

      <h1>
        QUIMFLUX
      </h1>

      <h2>
        Administrador de Planta
      </h2>

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
          class="msg">
        </div>

        <button
          class="primary"
          type="submit">
          Entrar
        </button>

        <button
          class="link"
          id="signup"
          type="button">
          Crear una cuenta
        </button>

      </form>

    </div>
  `;

  const emailInput =
    document.getElementById('email');

  const passwordInput =
    document.getElementById('password');

  document.getElementById(
    'authForm'
  ).onsubmit = async e => {

    e.preventDefault();

    msg(
      'authMsg',
      'Iniciando sesión…'
    );

    const {
      data,
      error
    } =
      await supabase.auth.signInWithPassword({
        email:
          emailInput.value.trim(),

        password:
          passwordInput.value
      });

    if (error) {

      msg(
        'authMsg',
        error.message
      );

      return;
    }

    user = data.user;

    await load();

    render();
  };


  document.getElementById(
    'signup'
  ).onclick = async () => {

    const email =
      emailInput.value.trim();

    const password =
      passwordInput.value;

    if (!email || !password) {

      msg(
        'authMsg',
        'Ingresa correo y contraseña.'
      );

      return;
    }

    msg(
      'authMsg',
      'Creando cuenta…'
    );

    const {
      data,
      error
    } =
      await supabase.auth.signUp({
        email,
        password
      });

    if (error) {

      msg(
        'authMsg',
        error.message
      );

      return;
    }

    msg(
      'authMsg',
      data.session
        ? 'Cuenta creada correctamente.'
        : 'Cuenta creada. Revisa tu correo si Supabase solicita confirmación.'
    );
  };
}


/* =========================================================
   RENDER PRINCIPAL
========================================================= */

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
        id="logout">

        Salir

      </button>

    </header>


    <nav>

      ${nav.map(x => `

        <button
          data-tab="${x[0]}"
          class="${
            tab === x[0]
              ? 'active'
              : ''
          }">

          ${x[1]}

        </button>

      `).join('')}

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


  document.getElementById(
    'logout'
  ).onclick = async () => {

    await supabase.auth.signOut();

    user = null;

    rows = [];
    inventoryRows = [];
    ssomaRows = [];
    personalRows = [];
    maintenanceRows = [];

    editingInventoryId = null;
    editingSsomaId = null;
    editingPersonalId = null;
    editingMaintenanceId = null;

    render();
  };


  if (tab === 'dashboard') {

    renderDashboard();

  } else if (tab === 'registro') {

    renderForm();

  } else if (tab === 'resumen') {

    renderResumen();

  } else if (tab === 'costos') {

    renderPlaceholder('Costos');

  } else if (tab === 'mantenimiento') {

    renderMaintenance();

  } else if (tab === 'inventario') {

    renderInventory();

  } else if (tab === 'personal') {

    renderPersonal();

  } else if (tab === 'ssoma') {

    renderSsoma();

  } else {

    renderPlaceholder(
      nav.find(
        x => x[0] === tab
      )?.[1] || 'QUIMFLUX'
    );
  }
}


/* =========================================================
   STATUS
========================================================= */

function status(
  value,
  target,
  invert = false
) {

  const ok =
    invert
      ? value <= target
      : value >= target;

  const critical =
    invert
      ? value > target * 1.5
      : value < target * 0.85;

  return {

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


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {

  const d =
    rows.map(derive);

  const sum = key =>
    d.reduce(
      (s, r) =>
        s + n(r[key]),
      0
    );

  const programada =
    sum('programada');

  const producida =
    sum('producida');

  const mp =
    sum('mp');

  const merma =
    sum('merma');

  const horas =
    sum('horas_turno');

  const paradas =
    sum('horas_paradas');

  const personalProgramado =
    sum('personal_programado');

  const personalPresente =
    sum('personal_presente');

  const rechazadas =
    sum('rechazadas');

  const pedidos =
    sum('pedidos_programados');

  const pedidosTiempo =
    sum('pedidos_tiempo');

  const cumplimiento =
    programada
      ? producida / programada
      : 0;

  const yieldRate =
    mp
      ? producida / mp
      : 0;

  const mermaRate =
    mp
      ? merma / mp
      : 0;

  const disponibilidad =
    horas
      ? Math.max(
          0,
          (horas - paradas) /
          horas
        )
      : 0;

  const asistencia =
    personalProgramado
      ? personalPresente /
        personalProgramado
      : 0;

  const rechazo =
    producida
      ? rechazadas /
        producida
      : 0;

  const otif =
    pedidos
      ? pedidosTiempo /
        pedidos
      : 0;

  const oee =
    disponibilidad *
    cumplimiento *
    Math.max(
      0,
      1 - rechazo
    );

  const costo =
    sum('costo_produccion');

  const mantenimiento =
    sum('costo_mantenimiento');

  const costoUnitario =
    producida
      ? costo / producida
      : 0;

  const energia =
    producida
      ? sum('energia') /
        producida
      : 0;

  const incidentes =
    sum('incidentes');


  const cards = [

    [
      'Producción total',
      producida.toLocaleString()
    ],

    [
      'Cumplimiento',
      pct(cumplimiento),
      status(
        cumplimiento,
        metas.cumplimiento
      )
    ],

    [
      'Yield',
      pct(yieldRate),
      status(
        yieldRate,
        metas.yield
      )
    ],

    [
      'Merma',
      pct(mermaRate),
      status(
        mermaRate,
        metas.merma,
        true
      )
    ],

    [
      'Disponibilidad',
      pct(disponibilidad),
      status(
        disponibilidad,
        metas.disponibilidad
      )
    ],

    [
      'Asistencia',
      pct(asistencia),
      status(
        asistencia,
        metas.asistencia
      )
    ],

    [
      'Rechazo calidad',
      pct(rechazo),
      status(
        rechazo,
        metas.rechazo,
        true
      )
    ],

    [
      'OEE',
      pct(oee),
      status(oee, 0.80)
    ],

    [
      'Costo producción',
      'S/ ' +
      costo.toLocaleString()
    ],

    [
      'Costo unitario',
      'S/ ' +
      costoUnitario.toFixed(3)
    ],

    [
      'Mantenimiento',
      'S/ ' +
      mantenimiento.toLocaleString()
    ],

    [
      'Energía',
      energia.toFixed(3) +
      ' kWh/unidad'
    ],

    [
      'Entregas a tiempo',
      pct(otif),
      status(
        otif,
        metas.otif
      )
    ],

    [
      'Incidentes SSOMA',
      String(incidentes),
      status(
        incidentes,
        metas.incidentes,
        true
      )
    ],

    [
      'Mantenimientos',
      String(maintenanceRows.length)
    ]
  ];


  document.getElementById(
    'content'
  ).innerHTML = `

    <main>

      <div class="titleRow">

        <div>

          <h1>
            Dashboard de Administración de Planta
          </h1>

          <p>
            Datos sincronizados con Supabase ·
            ${rows.length}
            registros
          </p>

        </div>

        <span class="online">
          ● EN LÍNEA
        </span>

      </div>


      <div class="cards">

        ${cards.map(c => `

          <div class="card">

            <small>
              ${esc(c[0])}
            </small>

            <strong>
              ${esc(c[1])}
            </strong>

            ${
              c.length > 2
                ? `
                  <span
                    class="badge ${c[2].cls}">
                    ${c[2].label}
                  </span>
                `
                : ''
            }

          </div>

        `).join('')}

      </div>


      <section class="panel">

        <h2>
          Últimos registros
        </h2>

        ${
          d.length

            ? `

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
                      <th>Acción</th>

                    </tr>

                  </thead>

                  <tbody>

                    ${d
                      .slice(-20)
                      .reverse()
                      .map(r => `

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

                          <td>

                            <button
                              type="button"
                              data-delete-id="${esc(r.id)}">

                              Eliminar

                            </button>

                          </td>

                        </tr>

                      `)
                      .join('')}

                  </tbody>

                </table>

              </div>

            `

            : `

              <div class="empty">

                Todavía no hay registros.

                Ve a
                <b>Registro Diario</b>
                para ingresar el primero.

              </div>

            `
        }

      </section>

    </main>

  `;


  document
    .querySelectorAll(
      '[data-delete-id]'
    )
    .forEach(button => {

      button.onclick = () => {

        deleteRecord(
          button.dataset.deleteId
        );

      };

    });
}


/* =========================================================
   ELIMINAR REGISTRO DIARIO
========================================================= */

async function deleteRecord(id) {

  if (!id) {

    alert(
      'No se pudo identificar el registro.'
    );

    return;
  }

  const row =
    rows.find(
      r =>
        String(r.id) ===
        String(id)
    );

  const detail =
    row
      ? `${row.fecha} · ${row.turno} · ${row.producto || 'Sin producto'}`
      : 'este registro';


  if (
    !confirm(
      `¿Eliminar ${detail}?\n\n` +
      `Esta acción no se puede deshacer.`
    )
  ) return;


  const { error } =
    await supabase
      .from('daily_records')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);


  if (error) {

    alert(
      'No se pudo eliminar:\n' +
      error.message
    );

    return;
  }


  await load();

  render();
}


/* =========================================================
   FORMULARIO DIARIO
========================================================= */

function renderForm() {

  const r = empty();

  document.getElementById(
    'content'
  ).innerHTML = `

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
        class="formGrid">


        <section>

          <h2>
            Producción
          </h2>

          ${fields
            .slice(0, 7)
            .map(f => control(f, r))
            .join('')}

        </section>


        <section>

          <h2>
            Operación y personal
          </h2>

          ${fields
            .slice(7, 12)
            .map(f => control(f, r))
            .join('')}

        </section>


        <section>

          <h2>
            Costos y energía
          </h2>

          ${fields
            .slice(12, 15)
            .map(f => control(f, r))
            .join('')}

        </section>


        <section>

          <h2>
            Despacho y SSOMA
          </h2>

          ${fields
            .slice(15)
            .map(f => control(f, r))
            .join('')}

        </section>


        <div
          id="saveMsg"
          class="msg full">
        </div>


        <button
          class="primary full"
          type="submit">

          Guardar registro diario

        </button>

      </form>

    </main>

  `;


  document.getElementById(
    'daily'
  ).onsubmit = async e => {

    e.preventDefault();


    const payload = {
      user_id: user.id
    };


    fields.forEach(
      ([key, , type]) => {

        const el =
          document.getElementById(
            'f_' + key
          );

        payload[key] =
          type === 'number'

            ? (
                el.value === ''
                  ? null
                  : n(el.value)
              )

            : el.value;

      }
    );


    msg(
      'saveMsg',
      'Guardando…'
    );


    const { error } =
      await supabase
        .from('daily_records')
        .insert(payload);


    if (error) {

      msg(
        'saveMsg',
        error.message
      );

      return;
    }


    msg(
      'saveMsg',
      'Registro guardado correctamente.'
    );


    await load();


    setTimeout(
      () => render(),
      500
    );

  };
}


function control(f, r) {

  const [
    key,
    label,
    type
  ] = f;

  let input;


  if (type === 'select') {

    input = `

      <select
        id="f_${key}">

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

  } else if (
    type === 'textarea'
  ) {

    input = `

      <textarea
        id="f_${key}">
      </textarea>

    `;

  } else {

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

      ${esc(label)}

      ${input}

    </label>

  `;
}


/* =========================================================
   RESUMEN
========================================================= */

function renderResumen() {

  const d =
    rows.map(derive);

  const sum = key =>
    d.reduce(
      (s, r) =>
        s + n(r[key]),
      0
    );


  const programada =
    sum('programada');

  const producida =
    sum('producida');

  const mp =
    sum('mp');

  const merma =
    sum('merma');

  const horas =
    sum('horas_turno');

  const paradas =
    sum('horas_paradas');

  const personalProgramado =
    sum('personal_programado');

  const personalPresente =
    sum('personal_presente');

  const rechazadas =
    sum('rechazadas');

  const pedidos =
    sum('pedidos_programados');

  const pedidosTiempo =
    sum('pedidos_tiempo');

  const costo =
    sum('costo_produccion');

  const mantenimiento =
    sum('costo_mantenimiento');

  const energia =
    sum('energia');

  const reproceso =
    sum('reproceso');

  const noConformidades =
    sum('no_conformidades');


  const cumplimiento =
    programada
      ? producida / programada
      : 0;

  const yieldRate =
    mp
      ? producida / mp
      : 0;

  const mermaRate =
    mp
      ? merma / mp
      : 0;

  const disponibilidad =
    horas
      ? Math.max(
          0,
          (horas - paradas) /
          horas
        )
      : 0;

  const asistencia =
    personalProgramado
      ? personalPresente /
        personalProgramado
      : 0;

  const rechazo =
    producida
      ? rechazadas /
        producida
      : 0;

  const otif =
    pedidos
      ? pedidosTiempo /
        pedidos
      : 0;

  const oee =
    disponibilidad *
    cumplimiento *
    Math.max(
      0,
      1 - rechazo
    );

  const costoUnitario =
    producida
      ? costo / producida
      : 0;

  const energiaUnit =
    producida
      ? energia / producida
      : 0;


  const kpis = [

    [
      'Cumplimiento',
      pct(cumplimiento),
      status(
        cumplimiento,
        metas.cumplimiento
      )
    ],

    [
      'Yield',
      pct(yieldRate),
      status(
        yieldRate,
        metas.yield
      )
    ],

    [
      'Merma',
      pct(mermaRate),
      status(
        mermaRate,
        metas.merma,
        true
      )
    ],

    [
      'Disponibilidad',
      pct(disponibilidad),
      status(
        disponibilidad,
        metas.disponibilidad
      )
    ],

    [
      'Asistencia',
      pct(asistencia),
      status(
        asistencia,
        metas.asistencia
      )
    ],

    [
      'Rechazo',
      pct(rechazo),
      status(
        rechazo,
        metas.rechazo,
        true
      )
    ],

    [
      'OEE',
      pct(oee),
      status(oee, 0.80)
    ],

    [
      'OTIF',
      pct(otif),
      status(
        otif,
        metas.otif
      )
    ]

  ];


  document.getElementById(
    'content'
  ).innerHTML = `

    <main>

      <h1>
        Resumen Ejecutivo
      </h1>

      <p>
        Visión consolidada del desempeño
        de la planta.
      </p>


      <section class="panel">

        <h2>
          Indicadores principales
        </h2>

        <div class="cards">

          ${kpis.map(k => `

            <div class="card">

              <small>
                ${k[0]}
              </small>

              <strong>
                ${k[1]}
              </strong>

              <span
                class="badge ${k[2].cls}">

                ${k[2].label}

              </span>

            </div>

          `).join('')}

        </div>

      </section>


      <section class="panel">

        <h2>
          Producción
        </h2>

        <div class="cards">

          <div class="card">

            <small>
              Producción programada
            </small>

            <strong>
              ${programada.toLocaleString()}
            </strong>

          </div>


          <div class="card">

            <small>
              Producción real
            </small>

            <strong>
              ${producida.toLocaleString()}
            </strong>

          </div>


          <div class="card">

            <small>
              Materia prima consumida
            </small>

            <strong>
              ${mp.toLocaleString()}
            </strong>

          </div>


          <div class="card">

            <small>
              Merma
            </small>

            <strong>
              ${merma.toLocaleString()}
            </strong>

          </div>


          <div class="card">

            <small>
              Horas de turno
            </small>

            <strong>
              ${horas.toFixed(1)}
            </strong>

          </div>


          <div class="card">

            <small>
              Horas de parada
            </small>

            <strong>
              ${paradas.toFixed(1)}
            </strong>

          </div>

        </div>

      </section>


      <section class="panel">

        <h2>
          Costos y eficiencia
        </h2>

        <div class="cards">

          <div class="card">

            <small>
              Costo producción
            </small>

            <strong>
              S/ ${costo.toLocaleString()}
            </strong>

          </div>


          <div class="card">

            <small>
              Costo unitario
            </small>

            <strong>
              S/ ${costoUnitario.toFixed(3)}
            </strong>

          </div>


          <div class="card">

            <small>
              Mantenimiento
            </small>

            <strong>
              S/ ${mantenimiento.toLocaleString()}
            </strong>

          </div>


          <div class="card">

            <small>
              Energía total
            </small>

            <strong>
              ${energia.toLocaleString()} kWh
            </strong>

          </div>


          <div class="card">

            <small>
              Energía por unidad
            </small>

            <strong>
              ${energiaUnit.toFixed(3)}
              kWh/unidad
            </strong>

          </div>

        </div>

      </section>


      <section class="panel">

        <h2>
          Calidad, personal y despacho
        </h2>

        <div class="cards">

          <div class="card">
            <small>
              Personal programado
            </small>
            <strong>
              ${personalProgramado}
            </strong>
          </div>

          <div class="card">
            <small>
              Personal presente
            </small>
            <strong>
              ${personalPresente}
            </strong>
          </div>

          <div class="card">
            <small>
              Unidades rechazadas
            </small>
            <strong>
              ${rechazadas}
            </strong>
          </div>

          <div class="card">
            <small>
              Reproceso
            </small>
            <strong>
              ${reproceso}
            </strong>
          </div>

          <div class="card">
            <small>
              No conformidades
            </small>
            <strong>
              ${noConformidades}
            </strong>
          </div>

          <div class="card">
            <small>
              Pedidos programados
            </small>
            <strong>
              ${pedidos}
            </strong>
          </div>

          <div class="card">
            <small>
              Pedidos a tiempo
            </small>
            <strong>
              ${pedidosTiempo}
            </strong>
          </div>

          <div class="card">
            <small>
              Incidentes SSOMA
            </small>
            <strong>
              ${ssomaRows.length}
            </strong>
          </div>

        </div>

      </section>

    </main>

  `;
}


/* =========================================================
   INVENTARIO
========================================================= */

function renderInventory() {

  const lowStock =
    inventoryRows.filter(r => {

      const stock =
        n(r.stock_inicial) +
        n(r.entradas) -
        n(r.salidas);

      return (
        n(r.stock_minimo) > 0 &&
        stock <= n(r.stock_minimo)
      );

    }).length;


  document.getElementById(
    'content'
  ).innerHTML = `

    <main>

      <h1>
        Control de Inventario
      </h1>

      <p>
        Registra entradas, salidas y stock
        de materiales y productos.
      </p>


      <div class="cards">

        <div class="card">

          <small>
            Ítems registrados
          </small>

          <strong>
            ${inventoryRows.length}
          </strong>

        </div>


        <div class="card">

          <small>
            Stock bajo
          </small>

          <strong>
            ${lowStock}
          </strong>

          <span
            class="badge ${
              lowStock
                ? 'critical'
                : 'ok'
            }">

            ${
              lowStock
                ? 'REVISAR'
                : 'OK'
            }

          </span>

        </div>

      </div>


      <section class="panel">

        <h2>

          ${
            editingInventoryId
              ? 'Editar inventario'
              : 'Registrar inventario'
          }

        </h2>


        <form
          id="inventoryForm"
          class="formGrid">


          <section>

            <h2>
              Identificación
            </h2>


            <label>

              Fecha

              <input
                id="inv_fecha"
                type="date"
                value="${today}"
                required
              >

            </label>


            <label>

              Código

              <input
                id="inv_codigo"
                type="text"
                placeholder="Ej. MP-001"
              >

            </label>


            <label>

              Material / Producto

              <input
                id="inv_material"
                type="text"
                required
              >

            </label>


            <label>

              Categoría

              <select
                id="inv_categoria">

                <option value="">
                  Seleccionar
                </option>

                <option>
                  Materia prima
                </option>

                <option>
                  Producto terminado
                </option>

                <option>
                  Insumo
                </option>

                <option>
                  Repuesto
                </option>

                <option>
                  Envase / embalaje
                </option>

                <option>
                  Otro
                </option>

              </select>

            </label>


            <label>

              Unidad

              <select
                id="inv_unidad">

                <option>kg</option>
                <option>t</option>
                <option>g</option>
                <option>litros</option>
                <option>unidades</option>
                <option>cajas</option>
                <option>bolsas</option>
                <option>otros</option>

              </select>

            </label>

          </section>


          <section>

            <h2>
              Movimiento
            </h2>


            <label>

              Stock inicial

              <input
                id="inv_stock_inicial"
                type="number"
                step="any"
                min="0"
                value="0"
              >

            </label>


            <label>

              Entradas

              <input
                id="inv_entradas"
                type="number"
                step="any"
                min="0"
                value="0"
              >

            </label>


            <label>

              Salidas

              <input
                id="inv_salidas"
                type="number"
                step="any"
                min="0"
                value="0"
              >

            </label>


            <label>

              Stock mínimo

              <input
                id="inv_stock_minimo"
                type="number"
                step="any"
                min="0"
                value="0"
              >

            </label>


            <div class="panel">

              <small>
                STOCK ACTUAL
              </small>

              <strong
                id="inv_stock_actual"
                style="
                  display:block;
                  font-size:28px;
                  margin-top:8px;
                ">

                0

              </strong>

            </div>

          </section>


          <section>

            <h2>
              Observaciones
            </h2>

            <label>

              <textarea
                id="inv_observaciones"
                placeholder="Detalle..."
              ></textarea>

            </label>

          </section>


          <div
            id="inventoryMsg"
            class="msg full">
          </div>


          <div class="full">

            <button
              class="primary"
              type="submit">

              ${
                editingInventoryId
                  ? 'Actualizar inventario'
                  : 'Guardar inventario'
              }

            </button>


            ${
              editingInventoryId
                ? `
                  <button
                    id="cancelInventory"
                    type="button">

                    Cancelar

                  </button>
                `
                : ''
            }

          </div>

        </form>

      </section>


      <section class="panel">

        <h2>
          Inventario registrado
        </h2>


        ${
          inventoryRows.length

            ? `

              <div class="tableWrap">

                <table>

                  <thead>

                    <tr>

                      <th>Fecha</th>
                      <th>Código</th>
                      <th>Material</th>
                      <th>Categoría</th>
                      <th>Unidad</th>
                      <th>Inicial</th>
                      <th>Entradas</th>
                      <th>Salidas</th>
                      <th>Stock</th>
                      <th>Mínimo</th>
                      <th>Estado</th>
                      <th>Acciones</th>

                    </tr>

                  </thead>


                  <tbody>

                    ${inventoryRows
                      .map(r => {

                        const stock =
                          n(r.stock_inicial) +
                          n(r.entradas) -
                          n(r.salidas);

                        const low =
                          n(r.stock_minimo) > 0 &&
                          stock <=
                            n(r.stock_minimo);

                        return `

                          <tr>

                            <td>
                              ${esc(r.fecha)}
                            </td>

                            <td>
                              ${esc(r.codigo || '')}
                            </td>

                            <td>
                              ${esc(r.material)}
                            </td>

                            <td>
                              ${esc(r.categoria || '')}
                            </td>

                            <td>
                              ${esc(r.unidad)}
                            </td>

                            <td>
                              ${n(r.stock_inicial)}
                            </td>

                            <td>
                              ${n(r.entradas)}
                            </td>

                            <td>
                              ${n(r.salidas)}
                            </td>

                            <td>
                              <strong>
                                ${stock}
                              </strong>
                            </td>

                            <td>
                              ${n(r.stock_minimo)}
                            </td>

                            <td>

                              <span
                                class="badge ${
                                  low
                                    ? 'critical'
                                    : 'ok'
                                }">

                                ${
                                  low
                                    ? 'STOCK BAJO'
                                    : 'OK'
                                }

                              </span>

                            </td>

                            <td>

                              <button
                                data-edit-inventory="${esc(r.id)}">

                                Editar

                              </button>

                              <button
                                data-delete-inventory="${esc(r.id)}">

                                Eliminar

                              </button>

                            </td>

                          </tr>

                        `;

                      })
                      .join('')}

                  </tbody>

                </table>

              </div>

            `

            : `

              <div class="empty">

                Todavía no hay inventario registrado.

              </div>

            `
        }

      </section>

    </main>

  `;


  updateInventoryStockPreview();


  [
    'inv_stock_inicial',
    'inv_entradas',
    'inv_salidas'
  ].forEach(id => {

    document
      .getElementById(id)
      ?.addEventListener(
        'input',
        updateInventoryStockPreview
      );

  });


  document.getElementById(
    'inventoryForm'
  ).onsubmit =
    saveInventory;


  document
    .querySelectorAll(
      '[data-edit-inventory]'
    )
    .forEach(button => {

      button.onclick = () => {

        editInventory(
          button.dataset.editInventory
        );

      };

    });


  document
    .querySelectorAll(
      '[data-delete-inventory]'
    )
    .forEach(button => {

      button.onclick = () => {

        deleteInventory(
          button.dataset.deleteInventory
        );

      };

    });


  document.getElementById(
    'cancelInventory'
  )?.addEventListener(
    'click',
    () => {

      editingInventoryId = null;

      renderInventory();

    }
  );
}


function updateInventoryStockPreview() {

  const inicial =
    n(
      document.getElementById(
        'inv_stock_inicial'
      )?.value
    );

  const entradas =
    n(
      document.getElementById(
        'inv_entradas'
      )?.value
    );

  const salidas =
    n(
      document.getElementById(
        'inv_salidas'
      )?.value
    );

  const output =
    document.getElementById(
      'inv_stock_actual'
    );

  if (output) {

    output.textContent =
      inicial +
      entradas -
      salidas;
  }
}


async function saveInventory(e) {

  e.preventDefault();


  const payload = {

    user_id:
      user.id,

    fecha:
      document.getElementById(
        'inv_fecha'
      ).value,

    codigo:
      document.getElementById(
        'inv_codigo'
      ).value.trim() ||
      null,

    material:
      document.getElementById(
        'inv_material'
      ).value.trim(),

    categoria:
      document.getElementById(
        'inv_categoria'
      ).value ||
      null,

    unidad:
      document.getElementById(
        'inv_unidad'
      ).value,

    stock_inicial:
      n(
        document.getElementById(
          'inv_stock_inicial'
        ).value
      ),

    entradas:
      n(
        document.getElementById(
          'inv_entradas'
        ).value
      ),

    salidas:
      n(
        document.getElementById(
          'inv_salidas'
        ).value
      ),

    stock_minimo:
      n(
        document.getElementById(
          'inv_stock_minimo'
        ).value
      ),

    observaciones:
      document.getElementById(
        'inv_observaciones'
      ).value.trim() ||
      null
  };


  msg(
    'inventoryMsg',
    'Guardando inventario…'
  );


  let result;


  if (editingInventoryId) {

    result =
      await supabase
        .from('inventory')
        .update(payload)
        .eq(
          'id',
          editingInventoryId
        )
        .eq(
          'user_id',
          user.id
        );

  } else {

    result =
      await supabase
        .from('inventory')
        .insert(payload);

  }


  if (result.error) {

    msg(
      'inventoryMsg',
      'Error: ' +
      result.error.message
    );

    return;
  }


  editingInventoryId = null;

  await loadInventory();

  renderInventory();
}


function editInventory(id) {

  const row =
    inventoryRows.find(
      r =>
        String(r.id) ===
        String(id)
    );


  if (!row) {

    alert(
      'No se encontró el registro.'
    );

    return;
  }


  editingInventoryId =
    row.id;


  renderInventory();


  document.getElementById(
    'inv_fecha'
  ).value =
    row.fecha || today;

  document.getElementById(
    'inv_codigo'
  ).value =
    row.codigo || '';

  document.getElementById(
    'inv_material'
  ).value =
    row.material || '';

  document.getElementById(
    'inv_categoria'
  ).value =
    row.categoria || '';

  document.getElementById(
    'inv_unidad'
  ).value =
    row.unidad || 'kg';

  document.getElementById(
    'inv_stock_inicial'
  ).value =
    n(row.stock_inicial);

  document.getElementById(
    'inv_entradas'
  ).value =
    n(row.entradas);

  document.getElementById(
    'inv_salidas'
  ).value =
    n(row.salidas);

  document.getElementById(
    'inv_stock_minimo'
  ).value =
    n(row.stock_minimo);

  document.getElementById(
    'inv_observaciones'
  ).value =
    row.observaciones || '';


  updateInventoryStockPreview();


  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}


async function deleteInventory(id) {

  const row =
    inventoryRows.find(
      r =>
        String(r.id) ===
        String(id)
    );


  if (!row) return;


  if (
    !confirm(
      `¿Eliminar "${row.material}"?`
    )
  ) return;


  const { error } =
    await supabase
      .from('inventory')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);


  if (error) {

    alert(
      'No se pudo eliminar:\n' +
      error.message
    );

    return;
  }


  await loadInventory();

  renderInventory();
}


/* =========================================================
   PERSONAL
========================================================= */

function renderPersonal() {

  const activos =
    personalRows.filter(
      r =>
        String(r.estado || '')
          .toLowerCase() ===
        'activo'
    ).length;

  const inactivos =
    personalRows.length -
    activos;

  const areas =
    new Set(
      personalRows
        .map(r => r.area)
        .filter(Boolean)
    ).size;


  document.getElementById(
    'content'
  ).innerHTML = `

    <main>

      <div class="titleRow">

        <div>

          <h1>
            Gestión de Personal
          </h1>

          <p>
            Registro y control del personal
            de la planta.
          </p>

        </div>

        <span class="online">
          ● EN LÍNEA
        </span>

      </div>


      <div class="cards">

        <div class="card">

          <small>
            Personal registrado
          </small>

          <strong>
            ${personalRows.length}
          </strong>

        </div>


        <div class="card">

          <small>
            Personal activo
          </small>

          <strong>
            ${activos}
          </strong>

          <span class="badge ok">
            ACTIVO
          </span>

        </div>


        <div class="card">

          <small>
            Personal inactivo
          </small>

          <strong>
            ${inactivos}
          </strong>

        </div>


        <div class="card">

          <small>
            Áreas
          </small>

          <strong>
            ${areas}
          </strong>

        </div>

      </div>


      <section class="panel">

        <h2>

          ${
            editingPersonalId
              ? 'Editar trabajador'
              : 'Registrar trabajador'
          }

        </h2>


        <form
          id="personalForm"
          class="formGrid">


          <section>

            <h2>
              Identificación
            </h2>


            <label>

              DNI

              <input
                id="per_dni"
                type="text"
                inputmode="numeric"
                maxlength="20"
                placeholder="Ej. 12345678"
                required
              >

            </label>


            <label>

              Nombre completo

              <input
                id="per_nombre"
                type="text"
                placeholder="Nombre y apellidos"
                required
              >

            </label>


            <label>

              Fecha de ingreso

              <input
                id="per_fecha_ingreso"
                type="date"
                value="${today}"
                required
              >

            </label>

          </section>


          <section>

            <h2>
              Puesto
            </h2>


            <label>

              Cargo

              <input
                id="per_cargo"
                type="text"
                required
              >

            </label>


            <label>

              Área

              <input
                id="per_area"
                type="text"
                required
              >

            </label>


            <label>

              Turno

              <select id="per_turno">

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

            </label>


            <label>

              Estado

              <select id="per_estado">

                <option>
                  Activo
                </option>

                <option>
                  Inactivo
                </option>

              </select>

            </label>

          </section>


          <section>

            <h2>
              Observaciones
            </h2>


            <label>

              <textarea
                id="per_observaciones">
              </textarea>

            </label>

          </section>


          <div
            id="personalMsg"
            class="msg full">
          </div>


          <div class="full">

            <button
              class="primary"
              type="submit">

              ${
                editingPersonalId
                  ? 'Actualizar trabajador'
                  : 'Guardar trabajador'
              }

            </button>


            ${
              editingPersonalId
                ? `
                  <button
                    id="cancelPersonal"
                    type="button">

                    Cancelar edición

                  </button>
                `
                : ''
            }

          </div>

        </form>

      </section>


      <section class="panel">

        <h2>
          Personal registrado
        </h2>


        ${
          personalRows.length

            ? `

              <div class="tableWrap">

                <table>

                  <thead>

                    <tr>

                      <th>DNI</th>
                      <th>Nombre</th>
                      <th>Cargo</th>
                      <th>Área</th>
                      <th>Turno</th>
                      <th>Ingreso</th>
                      <th>Estado</th>
                      <th>Acciones</th>

                    </tr>

                  </thead>


                  <tbody>

                    ${personalRows
                      .map(r => `

                        <tr>

                          <td>
                            ${esc(r.dni)}
                          </td>

                          <td>
                            <strong>
                              ${esc(r.nombre)}
                            </strong>
                          </td>

                          <td>
                            ${esc(r.cargo)}
                          </td>

                          <td>
                            ${esc(r.area)}
                          </td>

                          <td>
                            ${esc(r.turno)}
                          </td>

                          <td>
                            ${esc(r.fecha_ingreso)}
                          </td>

                          <td>

                            <span
                              class="badge ${
                                r.estado ===
                                'Activo'
                                  ? 'ok'
                                  : 'warn'
                              }">

                              ${esc(r.estado)}

                            </span>

                          </td>

                          <td>

                            <button
                              type="button"
                              data-edit-personal="${esc(r.id)}">

                              Editar

                            </button>


                            <button
                              type="button"
                              data-delete-personal="${esc(r.id)}">

                              Eliminar

                            </button>

                          </td>

                        </tr>

                      `)
                      .join('')}

                  </tbody>

                </table>

              </div>

            `

            : `

              <div class="empty">

                Todavía no hay personal registrado.

                Utiliza el formulario superior
                para registrar al primer trabajador.

              </div>

            `
        }

      </section>

    </main>

  `;


  document.getElementById(
    'personalForm'
  ).onsubmit =
    savePersonal;


  document
    .querySelectorAll(
      '[data-edit-personal]'
    )
    .forEach(button => {

      button.onclick = () => {

        editPersonal(
          button.dataset.editPersonal
        );

      };

    });


  document
    .querySelectorAll(
      '[data-delete-personal]'
    )
    .forEach(button => {

      button.onclick = () => {

        deletePersonal(
          button.dataset.deletePersonal
        );

      };

    });


  document.getElementById(
    'cancelPersonal'
  )?.addEventListener(
    'click',
    () => {

      editingPersonalId = null;

      renderPersonal();

    }
  );
}


async function savePersonal(e) {

  e.preventDefault();


  const payload = {

    user_id:
      user.id,

    dni:
      document
        .getElementById('per_dni')
        .value
        .trim(),

    nombre:
      document
        .getElementById('per_nombre')
        .value
        .trim(),

    fecha_ingreso:
      document
        .getElementById('per_fecha_ingreso')
        .value,

    cargo:
      document
        .getElementById('per_cargo')
        .value
        .trim(),

    area:
      document
        .getElementById('per_area')
        .value
        .trim(),

    turno:
      document
        .getElementById('per_turno')
        .value,

    estado:
      document
        .getElementById('per_estado')
        .value,

    observaciones:
      document
        .getElementById('per_observaciones')
        .value
        .trim() ||
      null
  };


  if (!payload.dni) {

    msg(
      'personalMsg',
      'Debes ingresar el DNI.'
    );

    return;
  }


  if (!payload.nombre) {

    msg(
      'personalMsg',
      'Debes ingresar el nombre completo.'
    );

    return;
  }


  if (!payload.cargo) {

    msg(
      'personalMsg',
      'Debes ingresar el cargo.'
    );

    return;
  }


  if (!payload.area) {

    msg(
      'personalMsg',
      'Debes ingresar el área.'
    );

    return;
  }


  if (!payload.fecha_ingreso) {

    msg(
      'personalMsg',
      'Debes ingresar la fecha de ingreso.'
    );

    return;
  }


  msg(
    'personalMsg',
    'Guardando trabajador…'
  );


  let result;


  if (editingPersonalId) {

    result =
      await supabase
        .from('personal')
        .update(payload)
        .eq(
          'id',
          editingPersonalId
        )
        .eq(
          'user_id',
          user.id
        );

  } else {

    result =
      await supabase
        .from('personal')
        .insert(payload);

  }


  if (result.error) {

    if (
      result.error.code === '23505'
    ) {

      msg(
        'personalMsg',
        'Ya existe un trabajador con ese DNI.'
      );

    } else {

      msg(
        'personalMsg',
        'Error: ' +
        result.error.message
      );

    }

    return;
  }


  editingPersonalId = null;

  await loadPersonal();

  renderPersonal();
}


function editPersonal(id) {

  const row =
    personalRows.find(
      r =>
        String(r.id) ===
        String(id)
    );


  if (!row) {

    alert(
      'No se encontró el trabajador.'
    );

    return;
  }


  editingPersonalId =
    row.id;


  renderPersonal();


  document.getElementById(
    'per_dni'
  ).value =
    row.dni || '';

  document.getElementById(
    'per_nombre'
  ).value =
    row.nombre || '';

  document.getElementById(
    'per_fecha_ingreso'
  ).value =
    row.fecha_ingreso || today;

  document.getElementById(
    'per_cargo'
  ).value =
    row.cargo || '';

  document.getElementById(
    'per_area'
  ).value =
    row.area || '';

  document.getElementById(
    'per_turno'
  ).value =
    row.turno || 'Mañana';

  document.getElementById(
    'per_estado'
  ).value =
    row.estado || 'Activo';

  document.getElementById(
    'per_observaciones'
  ).value =
    row.observaciones || '';


  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}


async function deletePersonal(id) {

  const row =
    personalRows.find(
      r =>
        String(r.id) ===
        String(id)
    );


  if (!row) return;


  if (
    !confirm(
      `¿Eliminar a "${row.nombre}"?\n\n` +
      `DNI: ${row.dni}\n` +
      `Cargo: ${row.cargo}\n\n` +
      `Esta acción no se puede deshacer.`
    )
  ) return;


  const { error } =
    await supabase
      .from('personal')
      .delete()
      .eq(
        'id',
        id
      )
      .eq(
        'user_id',
        user.id
      );


  if (error) {

    alert(
      'No se pudo eliminar:\n' +
      error.message
    );

    return;
  }


  await loadPersonal();

  renderPersonal();
}


/* =========================================================
   MANTENIMIENTO
========================================================= */

function renderMaintenance() {

  const total =
    maintenanceRows.length;

  const programados =
    maintenanceRows.filter(
      r =>
        r.estado ===
        'Programado'
    ).length;

  const abiertos =
    maintenanceRows.filter(
      r =>
        r.estado ===
          'Abierto' ||
        r.estado ===
          'En proceso'
    ).length;

  const cerrados =
    maintenanceRows.filter(
      r =>
        r.estado ===
        'Cerrado'
    ).length;

  const horasParada =
    maintenanceRows.reduce(
      (s, r) =>
        s +
        n(r.horas_parada),
      0
    );

  const costoTotal =
    maintenanceRows.reduce(
      (s, r) =>
        s +
        n(r.costo),
      0
    );


  document.getElementById(
    'content'
  ).innerHTML = `

    <main>

      <div class="titleRow">

        <div>

          <h1>
            Gestión de Mantenimiento
          </h1>

          <p>
            Registro, seguimiento y control
            del mantenimiento de equipos
            de la planta.
          </p>

        </div>

        <span class="online">
          ● EN LÍNEA
        </span>

      </div>


      <div class="cards">

        <div class="card">

          <small>
            Mantenimientos registrados
          </small>

          <strong>
            ${total}
          </strong>

        </div>


        <div class="card">

          <small>
            Programados
          </small>

          <strong>
            ${programados}
          </strong>

          <span class="badge ok">
            PROGRAMADO
          </span>

        </div>


        <div class="card">

          <small>
            Abiertos / En proceso
          </small>

          <strong>
            ${abiertos}
          </strong>

          <span class="badge warn">
            PENDIENTE
          </span>

        </div>


        <div class="card">

          <small>
            Cerrados
          </small>

          <strong>
            ${cerrados}
          </strong>

        </div>


        <div class="card">

          <small>
            Horas de parada
          </small>

          <strong>
            ${horasParada.toFixed(2)}
          </strong>

          <span>
            horas
          </span>

        </div>


        <div class="card">

          <small>
            Costo total
          </small>

          <strong>
            S/ ${costoTotal.toLocaleString(
              'es-PE',
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }
            )}
          </strong>

        </div>

      </div>


      <section class="panel">

        <h2>

          ${
            editingMaintenanceId
              ? 'Editar mantenimiento'
              : 'Registrar mantenimiento'
          }

        </h2>


        <form
          id="maintenanceForm"
          class="formGrid">


          <section>

            <h2>
              Identificación
            </h2>


            <label>

              Fecha

              <input
                id="mnt_fecha"
                type="date"
                value="${today}"
                required
              >

            </label>


            <label>

              Equipo

              <input
                id="mnt_equipo"
                type="text"
                placeholder="Ej. Mezclador principal"
                required
              >

            </label>


            <label>

              Código de equipo

              <input
                id="mnt_codigo_equipo"
                type="text"
                placeholder="Ej. EQ-001"
              >

            </label>


            <label>

              Tipo

              <select
                id="mnt_tipo"
                required>

                <option>
                  Preventivo
                </option>

                <option>
                  Correctivo
                </option>

                <option>
                  Predictivo
                </option>

                <option>
                  Inspección
                </option>

                <option>
                  Emergencia
                </option>

                <option>
                  Otro
                </option>

              </select>

            </label>


            <label>

              Causa

              <input
                id="mnt_causa"
                type="text"
                placeholder="Ej. Desgaste de rodamiento"
              >

            </label>

          </section>


          <section>

            <h2>
              Trabajo realizado
            </h2>


            <label>

              Descripción

              <textarea
                id="mnt_descripcion"
                required
                placeholder="Describe el trabajo realizado o requerido..."
              ></textarea>

            </label>


            <label>

              Horas de parada

              <input
                id="mnt_horas_parada"
                type="number"
                step="0.01"
                min="0"
                value="0"
              >

            </label>


            <label>

              Costo (S/)

              <input
                id="mnt_costo"
                type="number"
                step="0.01"
                min="0"
                value="0"
              >

            </label>


            <label>

              Responsable

              <input
                id="mnt_responsable"
                type="text"
                placeholder="Responsable del mantenimiento"
              >

            </label>

          </section>


          <section>

            <h2>
              Seguimiento
            </h2>


            <label>

              Estado

              <select
                id="mnt_estado"
                required>

                <option>
                  Programado
                </option>

                <option>
                  Abierto
                </option>

                <option>
                  En proceso
                </option>

                <option>
                  Cerrado
                </option>

                <option>
                  Cancelado
                </option>

              </select>

            </label>


            <label>

              Fecha programada

              <input
                id="mnt_fecha_programada"
                type="date"
              >

            </label>


            <label>

              Fecha de cierre

              <input
                id="mnt_fecha_cierre"
                type="date"
              >

            </label>


            <label>

              Observaciones

              <textarea
                id="mnt_observaciones"
                placeholder="Información adicional..."
              ></textarea>

            </label>

          </section>


          <div
            id="maintenanceMsg"
            class="msg full">
          </div>


          <div
            class="full"
            style="
              display:flex;
              gap:10px;
              flex-wrap:wrap;
            ">

            <button
              class="primary"
              type="submit">

              ${
                editingMaintenanceId
                  ? 'Actualizar mantenimiento'
                  : 'Guardar mantenimiento'
              }

            </button>


            ${
              editingMaintenanceId
                ? `
                  <button
                    id="cancelMaintenance"
                    type="button">

                    Cancelar edición

                  </button>
                `
                : ''
            }

          </div>

        </form>

      </section>


      <section class="panel">

        <div class="titleRow">

          <div>

            <h2>
              Historial de mantenimiento
            </h2>

            <p>
              Registros ordenados por fecha.
            </p>

          </div>

        </div>


        ${
          maintenanceRows.length

            ? `

              <div class="tableWrap">

                <table>

                  <thead>

                    <tr>

                      <th>Fecha</th>
                      <th>Equipo</th>
                      <th>Código</th>
                      <th>Tipo</th>
                      <th>Causa</th>
                      <th>Horas parada</th>
                      <th>Costo</th>
                      <th>Responsable</th>
                      <th>Estado</th>
                      <th>Programada</th>
                      <th>Cierre</th>
                      <th>Acciones</th>

                    </tr>

                  </thead>


                  <tbody>

                    ${maintenanceRows
                      .map(r => `

                        <tr>

                          <td>
                            ${esc(r.fecha)}
                          </td>

                          <td>
                            <strong>
                              ${esc(r.equipo)}
                            </strong>
                          </td>

                          <td>
                            ${esc(
                              r.codigo_equipo ||
                              ''
                            )}
                          </td>

                          <td>
                            ${esc(r.tipo)}
                          </td>

                          <td>
                            ${esc(
                              r.causa ||
                              ''
                            )}
                          </td>

                          <td>
                            ${n(
                              r.horas_parada
                            ).toFixed(2)}
                          </td>

                          <td>
                            S/
                            ${n(
                              r.costo
                            ).toFixed(2)}
                          </td>

                          <td>
                            ${esc(
                              r.responsable ||
                              ''
                            )}
                          </td>

                          <td>

                            <span
                              class="badge ${
                                r.estado ===
                                  'Cerrado'
                                  ? 'ok'
                                  : r.estado ===
                                      'Cancelado'
                                    ? 'critical'
                                    : 'warn'
                              }">

                              ${esc(r.estado)}

                            </span>

                          </td>

                          <td>
                            ${esc(
                              r.fecha_programada ||
                              ''
                            )}
                          </td>

                          <td>
                            ${esc(
                              r.fecha_cierre ||
                              ''
                            )}
                          </td>

                          <td>

                            <button
                              type="button"
                              data-edit-maintenance="${esc(r.id)}">

                              Editar

                            </button>


                            <button
                              type="button"
                              data-delete-maintenance="${esc(r.id)}">

                              Eliminar

                            </button>

                          </td>

                        </tr>

                      `)
                      .join('')}

                  </tbody>

                </table>

              </div>

            `

            : `

              <div class="empty">

                Todavía no hay mantenimientos
                registrados.

                Utiliza el formulario superior
                para registrar el primero.

              </div>

            `
        }

      </section>


      ${
        maintenanceRows.length
          ? `

            <section class="panel">

              <h2>
                Detalle del mantenimiento seleccionado
              </h2>

              <p>
                La descripción y las observaciones
                completas pueden consultarse
                editando el registro correspondiente.
              </p>

            </section>

          `
          : ''
      }

    </main>

  `;


  document.getElementById(
    'maintenanceForm'
  ).onsubmit =
    saveMaintenance;


  document
    .querySelectorAll(
      '[data-edit-maintenance]'
    )
    .forEach(button => {

      button.onclick = () => {

        editMaintenance(
          button.dataset.editMaintenance
        );

      };

    });


  document
    .querySelectorAll(
      '[data-delete-maintenance]'
    )
    .forEach(button => {

      button.onclick = () => {

        deleteMaintenance(
          button.dataset.deleteMaintenance
        );

      };

    });


  document.getElementById(
    'cancelMaintenance'
  )?.addEventListener(
    'click',
    () => {

      editingMaintenanceId = null;

      renderMaintenance();

    }
  );
}


/* =========================================================
   GUARDAR / ACTUALIZAR MANTENIMIENTO
========================================================= */

async function saveMaintenance(e) {

  e.preventDefault();


  const payload = {

    user_id:
      user.id,

    fecha:
      document.getElementById(
        'mnt_fecha'
      ).value,

    equipo:
      document.getElementById(
        'mnt_equipo'
      ).value.trim(),

    codigo_equipo:
      document.getElementById(
        'mnt_codigo_equipo'
      ).value.trim() ||
      null,

    tipo:
      document.getElementById(
        'mnt_tipo'
      ).value,

    causa:
      document.getElementById(
        'mnt_causa'
      ).value.trim() ||
      null,

    descripcion:
      document.getElementById(
        'mnt_descripcion'
      ).value.trim(),

    horas_parada:
      n(
        document.getElementById(
          'mnt_horas_parada'
        ).value
      ),

    costo:
      n(
        document.getElementById(
          'mnt_costo'
        ).value
      ),

    responsable:
      document.getElementById(
        'mnt_responsable'
      ).value.trim() ||
      null,

    estado:
      document.getElementById(
        'mnt_estado'
      ).value,

    fecha_programada:
      document.getElementById(
        'mnt_fecha_programada'
      ).value ||
      null,

    fecha_cierre:
      document.getElementById(
        'mnt_fecha_cierre'
      ).value ||
      null,

    observaciones:
      document.getElementById(
        'mnt_observaciones'
      ).value.trim() ||
      null
  };


  if (!payload.fecha) {

    msg(
      'maintenanceMsg',
      'Debes ingresar la fecha.'
    );

    return;
  }


  if (!payload.equipo) {

    msg(
      'maintenanceMsg',
      'Debes ingresar el equipo.'
    );

    return;
  }


  if (!payload.tipo) {

    msg(
      'maintenanceMsg',
      'Debes seleccionar el tipo de mantenimiento.'
    );

    return;
  }


  if (!payload.descripcion) {

    msg(
      'maintenanceMsg',
      'Debes ingresar la descripción.'
    );

    return;
  }


  if (
    payload.horas_parada < 0
  ) {

    msg(
      'maintenanceMsg',
      'Las horas de parada no pueden ser negativas.'
    );

    return;
  }


  if (
    payload.costo < 0
  ) {

    msg(
      'maintenanceMsg',
      'El costo no puede ser negativo.'
    );

    return;
  }


  if (
    payload.estado ===
      'Cerrado' &&
    !payload.fecha_cierre
  ) {

    msg(
      'maintenanceMsg',
      'Para cerrar el mantenimiento debes ingresar la fecha de cierre.'
    );

    return;
  }


  msg(
    'maintenanceMsg',
    'Guardando mantenimiento…'
  );


  let result;


  if (editingMaintenanceId) {

    result =
      await supabase
        .from('maintenance')
        .update(payload)
        .eq(
          'id',
          editingMaintenanceId
        )
        .eq(
          'user_id',
          user.id
        );

  } else {

    result =
      await supabase
        .from('maintenance')
        .insert(payload);

  }


  if (result.error) {

    msg(
      'maintenanceMsg',
      'Error: ' +
      result.error.message
    );

    return;
  }


  editingMaintenanceId = null;


  await loadMaintenance();


  renderMaintenance();
}


/* =========================================================
   EDITAR MANTENIMIENTO
========================================================= */

function editMaintenance(id) {

  const row =
    maintenanceRows.find(
      r =>
        String(r.id) ===
        String(id)
    );


  if (!row) {

    alert(
      'No se encontró el mantenimiento.'
    );

    return;
  }


  editingMaintenanceId =
    row.id;


  renderMaintenance();


  document.getElementById(
    'mnt_fecha'
  ).value =
    row.fecha || today;


  document.getElementById(
    'mnt_equipo'
  ).value =
    row.equipo || '';


  document.getElementById(
    'mnt_codigo_equipo'
  ).value =
    row.codigo_equipo || '';


  document.getElementById(
    'mnt_tipo'
  ).value =
    row.tipo || 'Preventivo';


  document.getElementById(
    'mnt_causa'
  ).value =
    row.causa || '';


  document.getElementById(
    'mnt_descripcion'
  ).value =
    row.descripcion || '';


  document.getElementById(
    'mnt_horas_parada'
  ).value =
    n(row.horas_parada);


  document.getElementById(
    'mnt_costo'
  ).value =
    n(row.costo);


  document.getElementById(
    'mnt_responsable'
  ).value =
    row.responsable || '';


  document.getElementById(
    'mnt_estado'
  ).value =
    row.estado || 'Abierto';


  document.getElementById(
    'mnt_fecha_programada'
  ).value =
    row.fecha_programada || '';


  document.getElementById(
    'mnt_fecha_cierre'
  ).value =
    row.fecha_cierre || '';


  document.getElementById(
    'mnt_observaciones'
  ).value =
    row.observaciones || '';


  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}


/* =========================================================
   ELIMINAR MANTENIMIENTO
========================================================= */

async function deleteMaintenance(id) {

  const row =
    maintenanceRows.find(
      r =>
        String(r.id) ===
        String(id)
    );


  if (!row) return;


  if (
    !confirm(
      `¿Eliminar el mantenimiento de "${row.equipo}"?\n\n` +
      `Fecha: ${row.fecha}\n` +
      `Tipo: ${row.tipo}\n\n` +
      `Esta acción no se puede deshacer.`
    )
  ) return;


  const { error } =
    await supabase
      .from('maintenance')
      .delete()
      .eq(
        'id',
        id
      )
      .eq(
        'user_id',
        user.id
      );


  if (error) {

    alert(
      'No se pudo eliminar el mantenimiento:\n' +
      error.message
    );

    return;
  }


  await loadMaintenance();

  renderMaintenance();
}


/* =========================================================
   SSOMA
========================================================= */

function renderSsoma() {

  const abiertos =
    ssomaRows.filter(
      r =>
        String(r.estado || '')
          .toLowerCase() !==
        'cerrado'
    ).length;


  document.getElementById(
    'content'
  ).innerHTML = `

    <main>

      <h1>
        SSOMA
      </h1>

      <p>
        Registro y seguimiento de incidentes
        de Seguridad, Salud Ocupacional y
        Medio Ambiente.
      </p>


      <div class="cards">

        <div class="card">

          <small>
            Incidentes registrados
          </small>

          <strong>
            ${ssomaRows.length}
          </strong>

        </div>


        <div class="card">

          <small>
            Incidentes abiertos
          </small>

          <strong>
            ${abiertos}
          </strong>

        </div>

      </div>


      <section class="panel">

        <h2>

          ${
            editingSsomaId
              ? 'Editar incidente'
              : 'Registrar incidente'
          }

        </h2>


        <form
          id="ssomaForm"
          class="formGrid">


          <section>

            <h2>
              Identificación
            </h2>


            <label>

              Fecha

              <input
                id="ss_fecha"
                type="date"
                value="${today}"
                required
              >

            </label>


            <label>

              Tipo de incidente

              <select
                id="ss_tipo"
                required>

                <option value="">
                  Seleccionar
                </option>

                <option>
                  Accidente
                </option>

                <option>
                  Incidente
                </option>

                <option>
                  Casi accidente
                </option>

                <option>
                  Condición insegura
                </option>

                <option>
                  Acto inseguro
                </option>

                <option>
                  Ambiental
                </option>

                <option>
                  Salud ocupacional
                </option>

                <option>
                  Otro
                </option>

              </select>

            </label>


            <label>

              Lugar

              <input
                id="ss_lugar"
                type="text"
                required
              >

            </label>


            <label>

              Gravedad

              <select
                id="ss_gravedad"
                required>

                <option value="">
                  Seleccionar
                </option>

                <option>
                  Leve
                </option>

                <option>
                  Moderada
                </option>

                <option>
                  Grave
                </option>

                <option>
                  Crítica
                </option>

              </select>

            </label>


            <label>

              Estado

              <select
                id="ss_estado"
                required>

                <option>
                  Abierto
                </option>

                <option>
                  En investigación
                </option>

                <option>
                  En seguimiento
                </option>

                <option>
                  Cerrado
                </option>

              </select>

            </label>

          </section>


          <section>

            <h2>
              Detalle
            </h2>


            <label>

              Hechos

              <textarea
                id="ss_hechos"
                required>
              </textarea>

            </label>


            <label>

              Acciones tomadas

              <textarea
                id="ss_acciones"
                required>
              </textarea>

            </label>


            <label>

              Personas involucradas

              <textarea
                id="ss_personas">
              </textarea>

            </label>

          </section>


          <section>

            <h2>
              Observaciones
            </h2>


            <label>

              <textarea
                id="ss_observaciones">
              </textarea>

            </label>

          </section>


          <div
            id="ssomaMsg"
            class="msg full">
          </div>


          <div class="full">

            <button
              class="primary"
              type="submit">

              ${
                editingSsomaId
                  ? 'Actualizar incidente'
                  : 'Guardar incidente'
              }

            </button>


            ${
              editingSsomaId
                ? `
                  <button
                    id="cancelSsoma"
                    type="button">

                    Cancelar

                  </button>
                `
                : ''
            }

          </div>

        </form>

      </section>


      <section class="panel">

        <h2>
          Incidentes registrados
        </h2>


        ${
          ssomaRows.length

            ? `

              <div class="tableWrap">

                <table>

                  <thead>

                    <tr>

                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Lugar</th>
                      <th>Gravedad</th>
                      <th>Estado</th>
                      <th>Hechos</th>
                      <th>Acciones</th>

                    </tr>

                  </thead>


                  <tbody>

                    ${ssomaRows
                      .map(r => `

                        <tr>

                          <td>
                            ${esc(r.fecha)}
                          </td>

                          <td>
                            ${esc(r.tipo || '')}
                          </td>

                          <td>
                            ${esc(r.lugar || '')}
                          </td>

                          <td>
                            ${esc(
                              r.gravedad || ''
                            )}
                          </td>

                          <td>
                            ${esc(
                              r.estado || ''
                            )}
                          </td>

                          <td>
                            ${esc(
                              r.hechos || ''
                            )}
                          </td>

                          <td>

                            <button
                              data-edit-ssoma="${esc(r.id)}">

                              Editar

                            </button>


                            <button
                              data-delete-ssoma="${esc(r.id)}">

                              Eliminar

                            </button>

                          </td>

                        </tr>

                      `)
                      .join('')}

                  </tbody>

                </table>

              </div>

            `

            : `

              <div class="empty">

                Todavía no hay incidentes registrados.

              </div>

            `
        }

      </section>

    </main>

  `;


  document.getElementById(
    'ssomaForm'
  ).onsubmit =
    saveSsoma;


  document
    .querySelectorAll(
      '[data-edit-ssoma]'
    )
    .forEach(button => {

      button.onclick = () => {

        editSsoma(
          button.dataset.editSsoma
        );

      };

    });


  document
    .querySelectorAll(
      '[data-delete-ssoma]'
    )
    .forEach(button => {

      button.onclick = () => {

        deleteSsoma(
          button.dataset.deleteSsoma
        );

      };

    });


  document.getElementById(
    'cancelSsoma'
  )?.addEventListener(
    'click',
    () => {

      editingSsomaId = null;

      renderSsoma();

    }
  );
}


async function saveSsoma(e) {

  e.preventDefault();


  const payload = {

    user_id:
      user.id,

    fecha:
      document.getElementById(
        'ss_fecha'
      ).value,

    tipo:
      document.getElementById(
        'ss_tipo'
      ).value,

    hechos:
      document.getElementById(
        'ss_hechos'
      ).value.trim(),

    lugar:
      document.getElementById(
        'ss_lugar'
      ).value.trim(),

    acciones_tomadas:
      document.getElementById(
        'ss_acciones'
      ).value.trim(),

    personas_involucradas:
      document.getElementById(
        'ss_personas'
      ).value.trim() ||
      null,

    gravedad:
      document.getElementById(
        'ss_gravedad'
      ).value,

    estado:
      document.getElementById(
        'ss_estado'
      ).value,

    observaciones:
      document.getElementById(
        'ss_observaciones'
      ).value.trim() ||
      null
  };


  msg(
    'ssomaMsg',
    'Guardando incidente…'
  );


  let result;


  if (editingSsomaId) {

    result =
      await supabase
        .from('ssoma_incidents')
        .update(payload)
        .eq(
          'id',
          editingSsomaId
        )
        .eq(
          'user_id',
          user.id
        );

  } else {

    result =
      await supabase
        .from('ssoma_incidents')
        .insert(payload);

  }


  if (result.error) {

    msg(
      'ssomaMsg',
      'Error: ' +
      result.error.message
    );

    return;
  }


  editingSsomaId = null;

  await loadSsoma();

  renderSsoma();
}


function editSsoma(id) {

  const row =
    ssomaRows.find(
      r =>
        String(r.id) ===
        String(id)
    );


  if (!row) {

    alert(
      'No se encontró el incidente.'
    );

    return;
  }


  editingSsomaId =
    row.id;


  renderSsoma();


  document.getElementById(
    'ss_fecha'
  ).value =
    row.fecha || today;

  document.getElementById(
    'ss_tipo'
  ).value =
    row.tipo || '';

  document.getElementById(
    'ss_hechos'
  ).value =
    row.hechos || '';

  document.getElementById(
    'ss_lugar'
  ).value =
    row.lugar || '';

  document.getElementById(
    'ss_acciones'
  ).value =
    row.acciones_tomadas || '';

  document.getElementById(
    'ss_personas'
  ).value =
    row.personas_involucradas || '';

  document.getElementById(
    'ss_gravedad'
  ).value =
    row.gravedad || '';

  document.getElementById(
    'ss_estado'
  ).value =
    row.estado || 'Abierto';

  document.getElementById(
    'ss_observaciones'
  ).value =
    row.observaciones || '';


  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}


async function deleteSsoma(id) {

  const row =
    ssomaRows.find(
      r =>
        String(r.id) ===
        String(id)
    );


  if (!row) return;


  if (
    !confirm(
      `¿Eliminar el incidente del ${row.fecha}?`
    )
  ) return;


  const { error } =
    await supabase
      .from('ssoma_incidents')
      .delete()
      .eq(
        'id',
        id
      )
      .eq(
        'user_id',
        user.id
      );


  if (error) {

    alert(
      'No se pudo eliminar:\n' +
      error.message
    );

    return;
  }


  await loadSsoma();

  renderSsoma();
}


/* =========================================================
   CARGA DE DATOS
========================================================= */

async function load() {

  if (!user) return;


  const r =
    await supabase
      .from('daily_records')
      .select('*')
      .eq(
        'user_id',
        user.id
      )
      .order(
        'fecha',
        {
          ascending: true
        }
      );


  if (!r.error) {

    rows =
      r.data || [];

  } else {

    console.error(
      'Error daily_records:',
      r.error
    );

    rows = [];

  }


  const s =
    await supabase
      .from('app_settings')
      .select('*')
      .eq(
        'user_id',
        user.id
      )
      .limit(1)
      .maybeSingle();


  if (s.data) {

    metas = {

      ...metas,

      cumplimiento:
        n(
          s.data.meta_cumplimiento
        ) ||
        metas.cumplimiento,

      merma:
        n(
          s.data.meta_merma
        ) ||
        metas.merma,

      yield:
        n(
          s.data.meta_yield
        ) ||
        metas.yield,

      disponibilidad:
        n(
          s.data.meta_disponibilidad
        ) ||
        metas.disponibilidad,

      asistencia:
        n(
          s.data.meta_asistencia
        ) ||
        metas.asistencia,

      rechazo:
        n(
          s.data.meta_rechazo
        ) ||
        metas.rechazo,

      otif:
        n(
          s.data.meta_entregas
        ) ||
        metas.otif,

      incidentes:
        n(
          s.data.meta_incidentes
        )

    };

  }


  await loadInventory();

  await loadSsoma();

  await loadPersonal();

  await loadMaintenance();
}


/* =========================================================
   INVENTARIO - CARGA
========================================================= */

async function loadInventory() {

  if (!user) return;


  const result =
    await supabase
      .from('inventory')
      .select('*')
      .eq(
        'user_id',
        user.id
      )
      .order(
        'fecha',
        {
          ascending: false
        }
      )
      .order(
        'created_at',
        {
          ascending: false
        }
      );


  if (result.error) {

    console.error(
      'Error inventario:',
      result.error
    );

    inventoryRows = [];

    return;
  }


  inventoryRows =
    result.data || [];
}


/* =========================================================
   SSOMA - CARGA
========================================================= */

async function loadSsoma() {

  if (!user) return;


  const result =
    await supabase
      .from('ssoma_incidents')
      .select('*')
      .eq(
        'user_id',
        user.id
      )
      .order(
        'fecha',
        {
          ascending: false
        }
      )
      .order(
        'created_at',
        {
          ascending: false
        }
      );


  if (result.error) {

    console.error(
      'Error SSOMA:',
      result.error
    );

    ssomaRows = [];

    return;
  }


  ssomaRows =
    result.data || [];
}


/* =========================================================
   PERSONAL - CARGA
========================================================= */

async function loadPersonal() {

  if (!user) return;


  const result =
    await supabase
      .from('personal')
      .select('*')
      .eq(
        'user_id',
        user.id
      )
      .order(
        'estado',
        {
          ascending: true
        }
      )
      .order(
        'nombre',
        {
          ascending: true
        }
      );


  if (result.error) {

    console.error(
      'Error personal:',
      result.error
    );

    personalRows = [];

    return;
  }


  personalRows =
    result.data || [];
}


/* =========================================================
   MANTENIMIENTO - CARGA
========================================================= */

async function loadMaintenance() {

  if (!user) return;


  const result =
    await supabase
      .from('maintenance')
      .select('*')
      .eq(
        'user_id',
        user.id
      )
      .order(
        'fecha',
        {
          ascending: false
        }
      )
      .order(
        'created_at',
        {
          ascending: false
        }
      );


  if (result.error) {

    console.error(
      'Error mantenimiento:',
      result.error
    );

    maintenanceRows = [];

    return;
  }


  maintenanceRows =
    result.data || [];
}


/* =========================================================
   PLACEHOLDER
========================================================= */

function renderPlaceholder(title) {

  document.getElementById(
    'content'
  ).innerHTML = `

    <main>

      <h1>
        ${esc(title)}
      </h1>


      <section class="panel">

        <p>
          Este módulo está preparado para
          enlazarse con su tabla correspondiente.
        </p>


        <span class="badge ok">
          Módulo preparado
        </span>

      </section>

    </main>

  `;
}


/* =========================================================
   INICIO
========================================================= */

supabase.auth
  .getSession()
  .then(
    async ({ data }) => {

      user =
        data.session?.user ||
        null;


      if (user) {

        await load();

      }


      render();

    }
  )
  .catch(error => {

    console.error(
      'Error inicializando QUIMFLUX:',
      error
    );

    renderAuth();

  });


/* =========================================================
   CAMBIOS DE SESIÓN
========================================================= */

supabase.auth
  .onAuthStateChange(
    (_event, session) => {

      user =
        session?.user ||
        null;


      if (!user) {

        rows = [];
        inventoryRows = [];
        ssomaRows = [];
        personalRows = [];
        maintenanceRows = [];

        editingInventoryId = null;
        editingSsomaId = null;
        editingPersonalId = null;
        editingMaintenanceId = null;

      }


      render();

    }
  );