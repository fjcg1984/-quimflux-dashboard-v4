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


/* =========================================================
   FECHA LOCAL
========================================================= */

function localDate() {
  const d = new Date();

  const year = d.getFullYear();
  const month = String(
    d.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    d.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

const today = localDate();


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


/* =========================================================
   ESTADO
========================================================= */

let user = null;

let rows = [];

let inventoryRows = [];

let ssomaRows = [];

let tab = 'dashboard';

let editingInventoryId = null;

let editingSsomaId = null;


/* =========================================================
   METAS
========================================================= */

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

  return Number.isFinite(x)
    ? x
    : 0;
}


function pct(v) {

  return (
    n(v) * 100
  ).toFixed(1) + '%';
}


function money(v) {

  return (
    'S/ ' +
    n(v).toLocaleString(
      'es-PE',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    )
  );
}


/* =========================================================
   KPI
========================================================= */

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
    mp
      ? n(r.merma) / mp
      : 0;

  const yieldRate =
    mp
      ? q / mp
      : 0;

  const disponibilidad =
    h
      ? Math.max(
          0,
          (h - stop) / h
        )
      : 0;

  const asistencia =
    pp
      ? pa / pp
      : 0;

  const rechazo =
    q
      ? rej / q
      : 0;

  const cumplimiento =
    p
      ? q / p
      : 0;

  const otif =
    pedidos
      ? at / pedidos
      : 0;

  const oee =
    disponibilidad *
    cumplimiento *
    Math.max(
      0,
      1 - rechazo
    );

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


/* =========================================================
   REGISTRO VACÍO
========================================================= */

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

    </div>
  `;


  const emailInput =
    document.getElementById(
      'email'
    );

  const passwordInput =
    document.getElementById(
      'password'
    );


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
              emailInput.value.trim(),

            password:
              passwordInput.value

          });


      if (error) {

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
        document.getElementById(
          'authMsg'
        );

      const email =
        emailInput.value.trim();

      const password =
        passwordInput.value;


      if (!email || !password) {

        msg.textContent =
          'Ingresa correo y contraseña.';

        return;
      }


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


      if (error) {

        msg.textContent =
          error.message;

        return;
      }


      msg.textContent =
        data.session
          ? 'Cuenta creada correctamente.'
          : 'Cuenta creada. Si Supabase solicita confirmación, revisa tu correo.';
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

        <b>QUIMFLUX</b>

        <span>
          · Administrador de Planta V4
        </span>

      </div>


      <button
        id="logout"
        class="logout">

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
    .querySelectorAll(
      'nav button'
    )
    .forEach(button => {

      button.onclick = () => {

        tab =
          button.dataset.tab;

        render();

      };

    });


  document
    .getElementById('logout')
    .onclick = async () => {

      await supabase.auth.signOut();

      user = null;

      rows = [];

      inventoryRows = [];

      ssomaRows = [];

      render();

    };


  if (tab === 'dashboard') {

    renderDashboard();

  }

  else if (tab === 'registro') {

    renderForm();

  }

  else if (tab === 'resumen') {

    renderExecutiveSummary();

  }

  else if (tab === 'inventario') {

    renderInventory();

  }

  else if (tab === 'ssoma') {

    renderSsoma();

  }

  else {

    renderPlaceholder(

      nav.find(
        x => x[0] === tab
      )?.[1]
      || 'QUIMFLUX'

    );

  }
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
      status(
        oee,
        0.80
      )
    ],

    [
      'Costo producción',
      money(costo)
    ],

    [
      'Costo unitario',
      money(costoUnitario)
    ],

    [
      'Mantenimiento',
      money(mantenimiento)
    ],

    [
      'Energía',
      energia.toFixed(3) +
      ' kWh/kg'
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
            ${rows.length} registros
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
              ${c[0]}
            </small>

            <strong>
              ${c[1]}
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

        <div class="titleRow">

          <div>

            <h2>
              Últimos registros
            </h2>

            <p>
              Desde aquí puedes eliminar registros.
            </p>

          </div>

        </div>


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

                    ${
                      d
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
                                data-delete-id="${esc(r.id)}"
                                style="
                                  background:#7f1d1d;
                                  color:#fff;
                                  border:0;
                                  border-radius:8px;
                                  padding:7px 10px;
                                  font-weight:600;
                                ">

                                Eliminar

                              </button>

                            </td>

                          </tr>

                        `)
                        .join('')
                    }

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
      `¿Eliminar ${detail}?\n\nEsta acción no se puede deshacer.`
    )
  ) {

    return;
  }


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
   FORMULARIO REGISTRO DIARIO
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
            .map(
              f => control(f, r)
            )
            .join('')}

        </section>


        <section>

          <h2>
            Operación y personal
          </h2>

          ${fields
            .slice(7, 12)
            .map(
              f => control(f, r)
            )
            .join('')}

        </section>


        <section>

          <h2>
            Costos y energía
          </h2>

          ${fields
            .slice(12, 15)
            .map(
              f => control(f, r)
            )
            .join('')}

        </section>


        <section>

          <h2>
            Despacho y SSOMA
          </h2>

          ${fields
            .slice(15)
            .map(
              f => control(f, r)
            )
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


    msg.textContent =
      'Guardando…';


    const { error } =
      await supabase
        .from('daily_records')
        .insert(payload);


    if (error) {

      msg.textContent =
        error.message;

      return;
    }


    msg.textContent =
      'Registro guardado correctamente.';


    await load();


    setTimeout(
      () => render(),
      500
    );

  };
}


/* =========================================================
   CONTROL REGISTRO
========================================================= */

function control(f, r) {

  const [
    key,
    label,
    type
  ] = f;


  let input;


  if (type === 'select') {

    input = `

      <select id="f_${key}">

        <option>Mañana</option>

        <option>Tarde</option>

        <option>Noche</option>

      </select>

    `;

  }

  else if (type === 'textarea') {

    input = `

      <textarea
        id="f_${key}">
      </textarea>

    `;

  }

  else {

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


/* =========================================================
   RESUMEN EJECUTIVO
========================================================= */

function renderExecutiveSummary() {

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

  const incidentesDiarios =
    sum('incidentes');


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


  const ssomaTotal =
    ssomaRows.length;


  const abiertos =
    ssomaRows.filter(
      r =>
        (r.estado || 'Abierto')
          .toLowerCase()
          !== 'cerrado'
    ).length;


  const severos =
    ssomaRows.filter(
      r =>
        String(r.gravedad || '')
          .toLowerCase()
          .includes('grave')
        ||
        String(r.gravedad || '')
          .toLowerCase()
          .includes('alto')
    ).length;


  function indicator(
    title,
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


    const cls =
      critical
        ? 'critical'
        : ok
          ? 'ok'
          : 'warn';


    const label =
      critical
        ? 'CRÍTICO'
        : ok
          ? 'OK'
          : 'REVISAR';


    return `

      <div class="card">

        <small>
          ${title}
        </small>

        <strong>
          ${pct(value)}
        </strong>

        <span class="badge ${cls}">
          ${label}
        </span>

      </div>

    `;
  }


  document.getElementById(
    'content'
  ).innerHTML = `

    <main>

      <div class="titleRow">

        <div>

          <h1>
            Resumen Ejecutivo
          </h1>

          <p>
            Vista consolidada de la operación de planta.
          </p>

        </div>

        <span class="online">
          ● EN LÍNEA
        </span>

      </div>


      <section class="panel">

        <h2>
          Indicadores principales
        </h2>

        <div class="cards">

          <div class="card">

            <small>
              Producción total
            </small>

            <strong>
              ${producida.toLocaleString()}
            </strong>

          </div>


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
              Materia prima
            </small>

            <strong>
              ${mp.toLocaleString()}
            </strong>

          </div>


          <div class="card">

            <small>
              Costo producción
            </small>

            <strong>
              ${money(costo)}
            </strong>

          </div>


          <div class="card">

            <small>
              Costo unitario
            </small>

            <strong>
              ${money(costoUnitario)}
            </strong>

          </div>


          <div class="card">

            <small>
              Mantenimiento
            </small>

            <strong>
              ${money(mantenimiento)}
            </strong>

          </div>

        </div>

      </section>


      <section class="panel">

        <h2>
          Semáforo de gestión
        </h2>

        <div class="cards">

          ${indicator(
            'Cumplimiento',
            cumplimiento,
            metas.cumplimiento
          )}

          ${indicator(
            'Yield',
            yieldRate,
            metas.yield
          )}

          ${indicator(
            'Merma',
            mermaRate,
            metas.merma,
            true
          )}

          ${indicator(
            'Disponibilidad',
            disponibilidad,
            metas.disponibilidad
          )}

          ${indicator(
            'Asistencia',
            asistencia,
            metas.asistencia
          )}

          ${indicator(
            'Rechazo',
            rechazo,
            metas.rechazo,
            true
          )}

          ${indicator(
            'OEE',
            oee,
            0.80
          )}

          ${indicator(
            'OTIF',
            otif,
            metas.otif
          )}

        </div>

      </section>


      <section class="panel">

        <h2>
          Costos y consumo
        </h2>

        <div class="cards">

          <div class="card">

            <small>
              Costo producción
            </small>

            <strong>
              ${money(costo)}
            </strong>

          </div>

          <div class="card">

            <small>
              Costo unitario
            </small>

            <strong>
              ${money(costoUnitario)}
            </strong>

          </div>

          <div class="card">

            <small>
              Mantenimiento
            </small>

            <strong>
              ${money(mantenimiento)}
            </strong>

          </div>

          <div class="card">

            <small>
              Energía total
            </small>

            <strong>
              ${energia.toLocaleString()}
              kWh
            </strong>

          </div>

          <div class="card">

            <small>
              Energía por unidad
            </small>

            <strong>
              ${energiaUnit.toFixed(3)}
              kWh/kg
            </strong>

          </div>

        </div>

      </section>


      <section class="panel">

        <h2>
          SSOMA
        </h2>

        <div class="cards">

          <div class="card">

            <small>
              Incidentes registrados
            </small>

            <strong>
              ${ssomaTotal}
            </strong>

          </div>

          <div class="card">

            <small>
              Incidentes del registro diario
            </small>

            <strong>
              ${incidentesDiarios}
            </strong>

          </div>

          <div class="card">

            <small>
              Incidentes abiertos
            </small>

            <strong>
              ${abiertos}
            </strong>

            <span class="badge ${
              abiertos
                ? 'warn'
                : 'ok'
            }">

              ${
                abiertos
                  ? 'REVISAR'
                  : 'OK'
              }

            </span>

          </div>

          <div class="card">

            <small>
              Graves / altos
            </small>

            <strong>
              ${severos}
            </strong>

          </div>

        </div>

      </section>


      <section class="panel">

        <h2>
          Resumen de operación
        </h2>

        ${
          rows.length

            ? `

              <div class="tableWrap">

                <table>

                  <thead>

                    <tr>

                      <th>Fecha</th>
                      <th>Turno</th>
                      <th>Producto</th>
                      <th>Producción</th>
                      <th>Cumplimiento</th>
                      <th>Merma</th>
                      <th>OEE</th>

                    </tr>

                  </thead>

                  <tbody>

                    ${
                      d
                        .slice(-15)
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
                              ${n(r.producida)}
                            </td>

                            <td>
                              ${pct(r.cumplimiento)}
                            </td>

                            <td>
                              ${pct(r.merma)}
                            </td>

                            <td>
                              ${pct(r.oee)}
                            </td>

                          </tr>

                        `)
                        .join('')
                    }

                  </tbody>

                </table>

              </div>

            `

            : `

              <div class="empty">

                Todavía no existen registros diarios.

              </div>

            `
        }

      </section>

    </main>

  `;
}


/* =========================================================
   INVENTARIO
========================================================= */

function renderInventory() {

  const totalItems =
    inventoryRows.length;


  const lowStock =
    inventoryRows.filter(
      r => {

        const stock =
          n(r.stock_inicial) +
          n(r.entradas) -
          n(r.salidas);

        const minimo =
          n(r.stock_minimo);

        return (
          minimo > 0 &&
          stock <= minimo
        );

      }
    ).length;


  document.getElementById(
    'content'
  ).innerHTML = `

    <main>

      <div class="titleRow">

        <div>

          <h1>
            Control de Inventario
          </h1>

          <p>
            Registra entradas, salidas y stock.
          </p>

        </div>

        <span class="online">
          ● EN LÍNEA
        </span>

      </div>


      <div class="cards">

        <div class="card">

          <small>
            Ítems registrados
          </small>

          <strong>
            ${totalItems}
          </strong>

        </div>


        <div class="card">

          <small>
            Stock bajo
          </small>

          <strong>
            ${lowStock}
          </strong>

          <span class="badge ${
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
                placeholder="Ej. Carbonato de calcio"
                required
              >

            </label>


            <label>

              Categoría

              <select id="inv_categoria">

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

              Unidad de medida

              <select id="inv_unidad">

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


            <div
              class="panel"
              style="margin-top:15px;">

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

              Observaciones

              <textarea
                id="inv_observaciones"
                placeholder="Detalle del movimiento o ubicación...">
              </textarea>

            </label>

          </section>


          <div
            id="inventoryMsg"
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
                    type="button"
                    class="link">

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
          Inventario registrado
        </h2>

        <p>
          Stock actual = stock inicial + entradas - salidas.
        </p>


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
                      <th>Actual</th>
                      <th>Mínimo</th>
                      <th>Estado</th>
                      <th>Acciones</th>

                    </tr>

                  </thead>


                  <tbody>

                    ${
                      inventoryRows
                        .map(r => {

                          const stock =
                            n(r.stock_inicial) +
                            n(r.entradas) -
                            n(r.salidas);

                          const minimo =
                            n(r.stock_minimo);

                          const low =
                            minimo > 0 &&
                            stock <= minimo;


                          return `

                            <tr>

                              <td>
                                ${esc(r.fecha)}
                              </td>

                              <td>
                                ${esc(r.codigo || '')}
                              </td>

                              <td>
                                ${esc(
                                  r.material ||
                                  r.producto ||
                                  ''
                                )}
                              </td>

                              <td>
                                ${esc(
                                  r.categoria || ''
                                )}
                              </td>

                              <td>
                                ${esc(
                                  r.unidad || ''
                                )}
                              </td>

                              <td>
                                ${n(
                                  r.stock_inicial
                                )}
                              </td>

                              <td>
                                ${n(
                                  r.entradas
                                )}
                              </td>

                              <td>
                                ${n(
                                  r.salidas
                                )}
                              </td>

                              <td>
                                <strong>
                                  ${stock}
                                </strong>
                              </td>

                              <td>
                                ${minimo}
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
                                  type="button"
                                  data-edit-inventory="${esc(r.id)}"
                                  style="
                                    background:#1d4ed8;
                                    color:#fff;
                                    border:0;
                                    border-radius:8px;
                                    padding:7px 10px;
                                    font-weight:600;
                                    margin-right:5px;
                                  ">

                                  Editar

                                </button>


                                <button
                                  type="button"
                                  data-delete-inventory="${esc(r.id)}"
                                  style="
                                    background:#7f1d1d;
                                    color:#fff;
                                    border:0;
                                    border-radius:8px;
                                    padding:7px 10px;
                                    font-weight:600;
                                  ">

                                  Eliminar

                                </button>

                              </td>

                            </tr>

                          `;

                        })
                        .join('')

                    }

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


  document
    .getElementById(
      'inventoryForm'
    )
    .onsubmit =
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


  const cancel =
    document.getElementById(
      'cancelInventory'
    );


  if (cancel) {

    cancel.onclick = () => {

      editingInventoryId = null;

      renderInventory();

    };

  }

}


/* =========================================================
   INVENTARIO - STOCK PREVIEW
========================================================= */

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


  const stock =
    inicial +
    entradas -
    salidas;


  const output =
    document.getElementById(
      'inv_stock_actual'
    );


  if (output) {

    output.textContent =
      stock;

  }

}


/* =========================================================
   GUARDAR INVENTARIO
========================================================= */

async function saveInventory(e) {

  e.preventDefault();


  const msg =
    document.getElementById(
      'inventoryMsg'
    );


  const material =
    document.getElementById(
      'inv_material'
    ).value.trim();


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
      ).value.trim() || null,

    material,

    /*
      La tabla inventory de tu proyecto
      también tiene producto como campo obligatorio.
      Por eso enviamos el mismo material.
    */

    producto:
      material,

    categoria:
      document.getElementById(
        'inv_categoria'
      ).value || null,

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
      ).value.trim() || null

  };


  if (!material) {

    msg.textContent =
      'Debes ingresar el material o producto.';

    return;
  }


  if (
    payload.stock_inicial < 0 ||
    payload.entradas < 0 ||
    payload.salidas < 0 ||
    payload.stock_minimo < 0
  ) {

    msg.textContent =
      'Los valores no pueden ser negativos.';

    return;
  }


  msg.textContent =
    'Guardando inventario…';


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

  }

  else {

    result =
      await supabase
        .from('inventory')
        .insert(payload);

  }


  if (result.error) {

    msg.textContent =
      'Error: ' +
      result.error.message;

    return;
  }


  editingInventoryId = null;


  await loadInventory();


  renderInventory();

}


/* =========================================================
   EDITAR INVENTARIO
========================================================= */

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
    row.material ||
    row.producto ||
    '';


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


/* =========================================================
   ELIMINAR INVENTARIO
========================================================= */

async function deleteInventory(id) {

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


  if (
    !confirm(
      `¿Eliminar "${row.material || row.producto}"?\n\nEsta acción no se puede deshacer.`
    )
  ) {

    return;
  }


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
   SSOMA
========================================================= */

function renderSsoma() {

  const total =
    ssomaRows.length;


  const abiertos =
    ssomaRows.filter(
      r =>
        (r.estado || 'Abierto')
          .toLowerCase()
          !== 'cerrado'
    ).length;


  const graves =
    ssomaRows.filter(
      r =>
        String(r.gravedad || '')
          .toLowerCase()
          .includes('grave')
        ||
        String(r.gravedad || '')
          .toLowerCase()
          .includes('alto')
    ).length;


  document.getElementById(
    'content'
  ).innerHTML = `

    <main>

      <div class="titleRow">

        <div>

          <h1>
            SSOMA
          </h1>

          <p>
            Registro y seguimiento de incidentes de seguridad,
            salud ocupacional y medio ambiente.
          </p>

        </div>

        <span class="online">
          ● EN LÍNEA
        </span>

      </div>


      <div class="cards">

        <div class="card">

          <small>
            Incidentes registrados
          </small>

          <strong>
            ${total}
          </strong>

        </div>


        <div class="card">

          <small>
            Casos abiertos
          </small>

          <strong>
            ${abiertos}
          </strong>

          <span class="badge ${
            abiertos
              ? 'warn'
              : 'ok'
          }">

            ${
              abiertos
                ? 'REVISAR'
                : 'OK'
            }

          </span>

        </div>


        <div class="card">

          <small>
            Graves / altos
          </small>

          <strong>
            ${graves}
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
                id="ssoma_fecha"
                type="date"
                value="${today}"
                required
              >

            </label>


            <label>

              Tipo de incidente

              <select
                id="ssoma_tipo"
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
                  Acto inseguro
                </option>

                <option>
                  Condición insegura
                </option>

                <option>
                  Ambiental
                </option>

                <option>
                  Derrame
                </option>

                <option>
                  Otro
                </option>

              </select>

            </label>


            <label>

              Lugar

              <input
                id="ssoma_lugar"
                type="text"
                placeholder="Ej. Área de producción"
                required
              >

            </label>


            <label>

              Gravedad

              <select id="ssoma_gravedad">

                <option value="">
                  Seleccionar
                </option>

                <option>
                  Baja
                </option>

                <option>
                  Media
                </option>

                <option>
                  Alta
                </option>

                <option>
                  Grave
                </option>

              </select>

            </label>


            <label>

              Estado

              <select id="ssoma_estado">

                <option>
                  Abierto
                </option>

                <option>
                  En investigación
                </option>

                <option>
                  Acción pendiente
                </option>

                <option>
                  Cerrado
                </option>

              </select>

            </label>

          </section>


          <section>

            <h2>
              Detalle del hecho
            </h2>


            <label>

              ¿Qué ocurrió?

              <textarea
                id="ssoma_hechos"
                required
                placeholder="Describe detalladamente qué ocurrió, cómo ocurrió y qué se observó...">
              </textarea>

            </label>


            <label>

              Personas involucradas

              <textarea
                id="ssoma_personas"
                placeholder="Nombres, cargos o cantidad de personas involucradas...">
              </textarea>

            </label>

          </section>


          <section>

            <h2>
              Acciones tomadas
            </h2>


            <label>

              Acciones tomadas inmediatamente

              <textarea
                id="ssoma_acciones"
                required
                placeholder="Describe las acciones tomadas inmediatamente después del incidente...">
              </textarea>

            </label>


            <label>

              Observaciones

              <textarea
                id="ssoma_observaciones"
                placeholder="Información adicional, seguimiento o recomendaciones...">
              </textarea>

            </label>

          </section>


          <div
            id="ssomaMsg"
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
                    type="button"
                    class="link">

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
                      <th>Acciones tomadas</th>
                      <th>Acciones</th>

                    </tr>

                  </thead>


                  <tbody>

                    ${
                      ssomaRows
                        .map(r => `

                          <tr>

                            <td>
                              ${esc(r.fecha)}
                            </td>

                            <td>
                              ${esc(r.tipo)}
                            </td>

                            <td>
                              ${esc(r.lugar)}
                            </td>

                            <td>

                              <span class="badge ${
                                String(
                                  r.gravedad || ''
                                ).toLowerCase()
                                  .includes('grave')
                                ||
                                String(
                                  r.gravedad || ''
                                ).toLowerCase()
                                  .includes('alta')
                                  ? 'critical'
                                  : 'warn'
                              }">

                                ${esc(
                                  r.gravedad ||
                                  'Sin definir'
                                )}

                              </span>

                            </td>

                            <td>

                              <span class="badge ${
                                String(
                                  r.estado || ''
                                ).toLowerCase()
                                  === 'cerrado'
                                  ? 'ok'
                                  : 'warn'
                              }">

                                ${esc(
                                  r.estado ||
                                  'Abierto'
                                )}

                              </span>

                            </td>

                            <td>

                              <div
                                style="
                                  min-width:220px;
                                  white-space:normal;
                                ">

                                ${esc(
                                  r.hechos
                                )}

                              </div>

                            </td>

                            <td>

                              <div
                                style="
                                  min-width:220px;
                                  white-space:normal;
                                ">

                                ${esc(
                                  r.acciones_tomadas
                                )}

                              </div>

                            </td>

                            <td>

                              <button
                                type="button"
                                data-edit-ssoma="${esc(r.id)}"
                                style="
                                  background:#1d4ed8;
                                  color:#fff;
                                  border:0;
                                  border-radius:8px;
                                  padding:7px 10px;
                                  font-weight:600;
                                  margin-right:5px;
                                ">

                                Editar

                              </button>


                              <button
                                type="button"
                                data-delete-ssoma="${esc(r.id)}"
                                style="
                                  background:#7f1d1d;
                                  color:#fff;
                                  border:0;
                                  border-radius:8px;
                                  padding:7px 10px;
                                  font-weight:600;
                                ">

                                Eliminar

                              </button>

                            </td>

                          </tr>

                        `)
                        .join('')
                    }

                  </tbody>

                </table>

              </div>

            `

            : `

              <div class="empty">

                Todavía no hay incidentes registrados.

                Utiliza el formulario superior
                para registrar el primero.

              </div>

            `
        }

      </section>

    </main>

  `;


  document
    .getElementById(
      'ssomaForm'
    )
    .onsubmit =
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


  const cancel =
    document.getElementById(
      'cancelSsoma'
    );


  if (cancel) {

    cancel.onclick = () => {

      editingSsomaId = null;

      renderSsoma();

    };

  }

}


/* =========================================================
   GUARDAR SSOMA
========================================================= */

async function saveSsoma(e) {

  e.preventDefault();


  const msg =
    document.getElementById(
      'ssomaMsg'
    );


  const payload = {

    user_id:
      user.id,

    fecha:
      document.getElementById(
        'ssoma_fecha'
      ).value,

    tipo:
      document.getElementById(
        'ssoma_tipo'
      ).value,

    hechos:
      document.getElementById(
        'ssoma_hechos'
      ).value.trim(),

    lugar:
      document.getElementById(
        'ssoma_lugar'
      ).value.trim(),

    acciones_tomadas:
      document.getElementById(
        'ssoma_acciones'
      ).value.trim(),

    personas_involucradas:
      document.getElementById(
        'ssoma_personas'
      ).value.trim() || null,

    gravedad:
      document.getElementById(
        'ssoma_gravedad'
      ).value || null,

    estado:
      document.getElementById(
        'ssoma_estado'
      ).value || 'Abierto',

    observaciones:
      document.getElementById(
        'ssoma_observaciones'
      ).value.trim() || null

  };


  if (
    !payload.fecha ||
    !payload.tipo ||
    !payload.hechos ||
    !payload.lugar ||
    !payload.acciones_tomadas
  ) {

    msg.textContent =
      'Completa fecha, tipo, hechos, lugar y acciones tomadas.';

    return;
  }


  msg.textContent =
    'Guardando incidente…';


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

  }

  else {

    result =
      await supabase
        .from('ssoma_incidents')
        .insert(payload);

  }


  if (result.error) {

    msg.textContent =
      'Error: ' +
      result.error.message;

    return;
  }


  editingSsomaId = null;


  await loadSsoma();


  renderSsoma();

}


/* =========================================================
   EDITAR SSOMA
========================================================= */

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
    'ssoma_fecha'
  ).value =
    row.fecha || today;


  document.getElementById(
    'ssoma_tipo'
  ).value =
    row.tipo || '';


  document.getElementById(
    'ssoma_lugar'
  ).value =
    row.lugar || '';


  document.getElementById(
    'ssoma_hechos'
  ).value =
    row.hechos || '';


  document.getElementById(
    'ssoma_acciones'
  ).value =
    row.acciones_tomadas || '';


  document.getElementById(
    'ssoma_personas'
  ).value =
    row.personas_involucradas || '';


  document.getElementById(
    'ssoma_gravedad'
  ).value =
    row.gravedad || '';


  document.getElementById(
    'ssoma_estado'
  ).value =
    row.estado || 'Abierto';


  document.getElementById(
    'ssoma_observaciones'
  ).value =
    row.observaciones || '';


  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });

}


/* =========================================================
   ELIMINAR SSOMA
========================================================= */

async function deleteSsoma(id) {

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


  if (
    !confirm(
      `¿Eliminar el incidente del ${row.fecha}?\n\nEsta acción no se puede deshacer.`
    )
  ) {

    return;
  }


  const { error } =
    await supabase
      .from('ssoma_incidents')
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


  await loadSsoma();


  renderSsoma();

}


/* =========================================================
   CARGAR SSOMA
========================================================= */

async function loadSsoma() {

  if (!user) {

    ssomaRows = [];

    return;
  }


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
      'Error cargando SSOMA:',
      result.error
    );

    ssomaRows = [];

    return;
  }


  ssomaRows =
    result.data || [];

}


/* =========================================================
   MÓDULOS AÚN PENDIENTES
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
          desarrollarse en la siguiente fase.
        </p>

        <span class="badge ok">
          Módulo preparado
        </span>

      </section>

    </main>

  `;

}


/* =========================================================
   CARGAR DATOS PRINCIPALES
========================================================= */

async function load() {

  if (!user) {

    return;

  }


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

  }

  else {

    console.error(
      'Error cargando registros:',
      r.error
    );

    rows = [];

  }


  const s =
    await supabase
      .from('app_settings')
      .select('*')
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

}


/* =========================================================
   CARGAR INVENTARIO
========================================================= */

async function loadInventory() {

  if (!user) {

    inventoryRows = [];

    return;

  }


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
      'Error cargando inventario:',
      result.error
    );

    inventoryRows = [];

    return;
  }


  inventoryRows =
    result.data || [];

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
  );


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

      }


      render();

    }
  );