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

const today =
  new Date().toISOString().slice(0, 10);

let user = null;
let rows = [];
let tab = 'dashboard';

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


/* =========================================================
   CÁLCULO DE KPI
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

  const pedidos = n(r.pedidos_programados);
  const at = n(r.pedidos_tiempo);

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
    document.getElementById('email');

  const passwordInput =
    document.getElementById('password');

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
          email: emailInput.value.trim(),
          password: passwordInput.value
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
        document.getElementById('authMsg');

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
        await supabase.auth.signUp({
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
          class="${tab === x[0] ? 'active' : ''}">
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


  document
    .getElementById('logout')
    .onclick = async () => {

      await supabase.auth.signOut();

      user = null;
      rows = [];

      render();
    };


  if (tab === 'dashboard') {

    renderDashboard();

  } else if (tab === 'registro') {

    renderForm();

  } else {

    renderPlaceholder(
      nav.find(x => x[0] === tab)?.[1]
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
      (s, r) => s + n(r[key]),
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
          (horas - paradas) / horas
        )
      : 0;

  const asistencia =
    personalProgramado
      ? personalPresente /
        personalProgramado
      : 0;

  const rechazo =
    producida
      ? rechazadas / producida
      : 0;

  const otif =
    pedidos
      ? pedidosTiempo / pedidos
      : 0;


  const oee =
    disponibilidad *
    cumplimiento *
    Math.max(0, 1 - rechazo);


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
      ? sum('energia') / producida
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
                              ${esc(
                                r.producto
                              )}
                            </td>

                            <td>
                              ${n(
                                r.programada
                              )}
                            </td>

                            <td>
                              ${n(
                                r.producida
                              )}
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
                                  cursor:pointer;
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
    .querySelectorAll('[data-delete-id]')
    .forEach(button => {

      button.onclick = () => {

        deleteRecord(
          button.dataset.deleteId
        );

      };

    });
}


/* =========================================================
   ELIMINAR REGISTRO
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


  const confirmed =
    confirm(
      `¿Eliminar ${detail}?\n\n` +
      `Esta acción no se puede deshacer.`
    );


  if (!confirmed) {

    return;
  }


  const {
    error
  } =
    await supabase
      .from('daily_records')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);


  if (error) {

    alert(
      'No se pudo eliminar el registro:\n' +
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


    const msg =
      document.getElementById(
        'saveMsg'
      );


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


    msg.textContent =
      'Guardando…';


    const {
      error
    } =
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
      400
    );
  };
}


/* =========================================================
   CONTROLES DEL FORMULARIO
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

  } else if (type === 'textarea') {

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
        ${type === 'number'
          ? 'step="any"'
          : ''}
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
   MÓDULOS PENDIENTES
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
          enlazarse con su tabla correspondiente
          de Supabase en la siguiente fase.
        </p>


        <span class="badge ok">
          Módulo preparado
        </span>

      </section>

    </main>

  `;
}


/* =========================================================
   CARGAR DATOS
========================================================= */

async function load() {

  const r =
    await supabase
      .from('daily_records')
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

  } else {

    console.error(
      'Error cargando registros:',
      r.error
    );

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
}


/* =========================================================
   INICIO DE LA APLICACIÓN
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

      render();

    }
  );