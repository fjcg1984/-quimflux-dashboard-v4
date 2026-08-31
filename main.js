import { createClient } from '@supabase/supabase-js';
import './styles.css';

const SUPABASE_URL = 'https://cgkdztwtodmdteohvuoh.supabase.co';

const SUPABASE_KEY =
  'sb_publishable_sULeDyfJ1l5xfvUeXRKA_bsim9qSe';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const app = document.getElementById('app');


/* =========================================================
   CAMPOS DEL REGISTRO DIARIO
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


const numeric = fields
  .filter(x => x[2] === 'number')
  .map(x => x[0]);


const today =
  new Date()
    .toISOString()
    .slice(0, 10);


/* =========================================================
   ESTADO
========================================================= */

let user = null;
let rows = [];
let tab = 'dashboard';


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


function avg(a, k) {

  return a.length
    ? a.reduce(
        (s, r) => s + n(r[k]),
        0
      ) / a.length
    : 0;

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


  return {

    ...r,

    cumplimiento:
      p
        ? q / p
        : 0,

    merma,

    yieldRate,

    disponibilidad,

    asistencia,

    rechazo,

    oee:
      disponibilidad *
      yieldRate *
      Math.max(
        0,
        1 - rechazo
      ),

    otif:
      pedidos
        ? at / pedidos
        : 0,

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
   AUTENTICACIÓN
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


  document
    .getElementById('authForm')
    .onsubmit = async e => {

      e.preventDefault();

      const msg =
        document.getElementById(
          'authMsg'
        );

      const email =
        document.getElementById(
          'email'
        ).value.trim();

      const password =
        document.getElementById(
          'password'
        ).value;


      msg.textContent =
        'Procesando…';


      const {
        data,
        error
      } =
        await supabase.auth.signInWithPassword({

          email,

          password

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
        document.getElementById(
          'email'
        ).value.trim();


      const password =
        document.getElementById(
          'password'
        ).value;


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


      if (data.session) {

        user =
          data.user;

        msg.textContent =
          'Cuenta creada correctamente.';

        await load();

        render();

      } else {

        msg.textContent =
          'Cuenta creada. Si Supabase solicita confirmación, revisa tu correo.';

      }

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
    .querySelectorAll(
      'nav button'
    )
    .forEach(b => {

      b.onclick = () => {

        tab =
          b.dataset.tab;

        render();

      };

    });


  document
    .getElementById('logout')
    .onclick = async () => {

      await supabase.auth.signOut();

      user = null;

      rows = [];

      tab = 'dashboard';

      render();

    };


  if (tab === 'dashboard') {

    renderDashboard();

  } else if (tab === 'registro') {

    renderForm();

  } else {

    renderPlaceholder(
      nav.find(
        x => x[0] === tab
      )?.[1] || 'QUIMFLUX'
    );

  }

}


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {

  const d =
    rows.map(derive);


  const sums =
    key =>
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

    mermaKg:
      sums('merma'),

    stop:
      sums('horas_paradas'),

    hours:
      sums('horas_turno'),

    pp:
      sums('personal_programado'),

    pa:
      sums('personal_presente'),

    rejKg:
      sums('rechazadas'),

    pedidos:
      sums('pedidos_programados'),

    aTiempo:
      sums('pedidos_tiempo'),

    reproceso:
      sums('reproceso'),

    nc:
      sums('no_conformidades'),

    cum:
      sums('programada')
        ? sums('producida') /
          sums('programada')
        : 0,

    yield:
      sums('mp')
        ? sums('producida') /
          sums('mp')
        : 0,

    merma:
      sums('mp')
        ? sums('merma') /
          sums('mp')
        : 0,

    disp:
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

    asis:
      sums('personal_programado')
        ? sums('personal_presente') /
          sums('personal_programado')
        : 0,

    rech:
      sums('producida')
        ? sums('rechazadas') /
          sums('producida')
        : 0,

    otif:
      sums('pedidos_programados')
        ? sums('pedidos_tiempo') /
          sums('pedidos_programados')
        : 0,

    costo:
      sums('costo_produccion'),

    mnt:
      sums('costo_mantenimiento'),

    unit:
      sums('producida')
        ? sums('costo_produccion') /
          sums('producida')
        : 0,

    energy:
      sums('producida')
        ? sums('energia') /
          sums('producida')
        : 0,

    inc:
      sums('incidentes')

  };


  k.oee =
    k.disp *
    k.cum *
    Math.max(
      0,
      1 - k.rech
    );


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


  const cards = [

    [
      'Producción total',
      k.prod.toLocaleString()
    ],

    [
      'Cumplimiento',
      pct(k.cum),
      status(
        k.cum,
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
      pct(k.merma),
      status(
        k.merma,
        metas.merma,
        true
      )
    ],

    [
      'Disponibilidad',
      pct(k.disp),
      status(
        k.disp,
        metas.disponibilidad
      )
    ],

    [
      'Asistencia',
      pct(k.asis),
      status(
        k.asis,
        metas.asistencia
      )
    ],

    [
      'Rechazo calidad',
      pct(k.rech),
      status(
        k.rech,
        metas.rechazo,
        true
      )
    ],

    [
      'OEE',
      pct(k.oee),
      status(
        k.oee,
        0.80
      )
    ],

    [
      'Costo producción',
      'S/ ' +
      k.costo.toLocaleString()
    ],

    [
      'Costo unitario',
      'S/ ' +
      k.unit.toFixed(3)
    ],

    [
      'Mantenimiento',
      'S/ ' +
      k.mnt.toLocaleString()
    ],

    [
      'Energía',
      k.energy.toFixed(3) +
      ' kWh/kg'
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
      String(k.inc),
      status(
        k.inc,
        metas.incidentes,
        true
      )
    ]

  ];


  document
    .getElementById(
      'content'
    )
    .innerHTML = `

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
                                    padding:8px 12px;
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

      .eq(
        'user_id',
        user.id
      );


  if (error) {

    alert(
      'No se pudo eliminar el registro:\n\n' +
      error.message
    );

    return;

  }


  alert(
    'Registro eliminado correctamente.'
  );


  await load();

  render();

}


/* =========================================================
   FORMULARIO REGISTRO DIARIO
========================================================= */

function renderForm() {

  const r =
    empty();


  document
    .getElementById(
      'content'
    )
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
          class="formGrid">


          <section>

            <h2>
              Producción
            </h2>

            ${fields
              .slice(0, 7)
              .map(
                f =>
                  control(f, r)
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
                f =>
                  control(f, r)
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
                f =>
                  control(f, r)
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
                f =>
                  control(f, r)
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


  document
    .getElementById(
      'daily'
    )
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

          .insert(
            payload
          );


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
   MÓDULOS FUTUROS
========================================================= */

function renderPlaceholder(title) {

  document
    .getElementById(
      'content'
    )
    .innerHTML = `

      <main>

        <h1>
          ${esc(title)}
        </h1>


        <section class="panel">

          <p>

            Este módulo está preparado
            para enlazarse con su tabla
            correspondiente de Supabase
            en la siguiente fase.

          </p>


          <span
            class="badge ok">

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

  if (!user) {

    rows = [];

    return;

  }


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


  if (r.error) {

    console.error(
      'Error cargando registros:',
      r.error
    );

  } else {

    rows =
      r.data || [];

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
   SESIÓN INICIAL
========================================================= */

async function init() {

  const {
    data
  } =
    await supabase.auth.getSession();


  user =
    data.session?.user ||
    null;


  if (user) {

    await load();

  }


  render();

}


init();


/* =========================================================
   CAMBIOS DE AUTENTICACIÓN
========================================================= */

supabase.auth
  .onAuthStateChange(
    async (_event, session) => {

      user =
        session?.user ||
        null;


      if (user) {

        await load();

      } else {

        rows = [];

      }


      render();

    }
  );