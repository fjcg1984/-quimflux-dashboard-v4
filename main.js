import { createClient } from '@supabase/supabase-js';
import './styles.css';

/* =========================================================
   CONFIGURACIÓN SUPABASE
========================================================= */

const SUPABASE_URL =
  'https://cgkdztwtodmdteohvuoh.supabase.co';

const SUPABASE_KEY =
  'sb_publishable_sULeDyfJ1l5xfuVhFgXRKA_bsim9qSe';

const supabase =
  createClient(SUPABASE_URL, SUPABASE_KEY);

const app =
  document.getElementById('app');

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

  /*
    IMPORTANTE:
    Merma se almacena como porcentaje decimal.

    Ejemplo:
    0.02 = 2%
    0.05 = 5%
    0.10 = 10%
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

/* =========================================================
   VARIABLES
========================================================= */

const numeric =
  fields
    .filter(x => x[2] === 'number')
    .map(x => x[0]);

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

function esc(value = '') {

  return String(value).replace(
    /[&<>"']/g,

    character => ({

      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'

    }[character])

  );

}

/* ---------------------------------------------------------
   CONVERSIÓN NUMÉRICA SEGURA
--------------------------------------------------------- */

function n(value) {

  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {

    return 0;

  }

  const number =
    Number(
      String(value)
        .replace(',', '.')
        .trim()
    );

  return Number.isFinite(number)
    ? number
    : 0;

}

/* ---------------------------------------------------------
   PORCENTAJE
--------------------------------------------------------- */

function pct(value) {

  return (
    n(value) * 100
  ).toFixed(1) + '%';

}

/* ---------------------------------------------------------
   PROMEDIO
--------------------------------------------------------- */

function avg(array, key) {

  if (!array.length) {

    return 0;

  }

  return (
    array.reduce(
      (sum, row) => sum + n(row[key]),
      0
    ) / array.length
  );

}

/* =========================================================
   CÁLCULO CENTRAL DE KPI
========================================================= */

function derive(r) {

  const programada =
    n(r.programada);

  const producida =
    n(r.producida);

  const mp =
    n(r.mp);

  const horasTurno =
    n(r.horas_turno);

  const horasParadas =
    n(r.horas_paradas);

  const personalProgramado =
    n(r.personal_programado);

  const personalPresente =
    n(r.personal_presente);

  const rechazadas =
    n(r.rechazadas);

  const pedidosProgramados =
    n(r.pedidos_programados);

  const pedidosTiempo =
    n(r.pedidos_tiempo);

  /*
    ========================================================
    MERMA
    ========================================================

    CORRECCIÓN PRINCIPAL:

    Antes:
        merma = r.merma / mp

    Eso provocaba valores incorrectos.

    Ahora:
        merma = r.merma

    Por tanto:

        0.02 = 2%
        0.05 = 5%
        0.10 = 10%

    El valor introducido representa directamente
    el porcentaje de merma.
  */

  const merma =
    Math.max(
      0,
      Math.min(
        1,
        n(r.merma)
      )
    );

  /*
    ========================================================
    YIELD
    ========================================================
  */

  const yieldRate =
    mp > 0
      ? producida / mp
      : 0;

  /*
    ========================================================
    DISPONIBILIDAD
    ========================================================
  */

  const disponibilidad =
    horasTurno > 0
      ? Math.max(
          0,
          Math.min(
            1,
            (horasTurno - horasParadas) /
              horasTurno
          )
        )
      : 0;

  /*
    ========================================================
    ASISTENCIA
    ========================================================
  */

  const asistencia =
    personalProgramado > 0
      ? Math.max(
          0,
          Math.min(
            1,
            personalPresente /
              personalProgramado
          )
        )
      : 0;

  /*
    ========================================================
    RECHAZO
    ========================================================
  */

  const rechazo =
    producida > 0
      ? Math.max(
          0,
          Math.min(
            1,
            rechazadas /
              producida
          )
        )
      : 0;

  /*
    ========================================================
    CUMPLIMIENTO
    ========================================================
  */

  const cumplimiento =
    programada > 0
      ? producida /
        programada
      : 0;

  /*
    ========================================================
    OTIF
    ========================================================
  */

  const otif =
    pedidosProgramados > 0
      ? Math.max(
          0,
          Math.min(
            1,
            pedidosTiempo /
              pedidosProgramados
          )
        )
      : 0;

  /*
    ========================================================
    OEE
    ========================================================

    OEE =
    Disponibilidad × Rendimiento × Calidad

    Para conservar la lógica actual:

    Rendimiento = Yield

    Calidad = 1 - Rechazo
  */

  const calidad =
    Math.max(
      0,
      1 - rechazo
    );

  const oee =
    disponibilidad *
    yieldRate *
    calidad;

  /*
    ========================================================
    COSTO UNITARIO
    ========================================================
  */

  const costoUnitario =
    producida > 0
      ? n(r.costo_produccion) /
        producida
      : 0;

  /*
    ========================================================
    ENERGÍA UNITARIA
    ========================================================
  */

  const energiaUnit =
    producida > 0
      ? n(r.energia) /
        producida
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
   STATUS KPI
========================================================= */

function status(
  value,
  target,
  invert = false
) {

  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(
      Number(value)
    ) ||
    !Number.isFinite(
      Number(target)
    )
  ) {

    return {

      label: 'SIN DATOS',

      cls: 'ok'

    };

  }

  const v =
    Number(value);

  const t =
    Number(target);

  const ok =
    invert
      ? v <= t
      : v >= t;

  const critical =
    invert
      ? v > t * 1.5
      : v < t * 0.85;

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
   LOGIN
========================================================= */

function renderAuth() {

  if (!app) {

    console.error(
      'QUIMFLUX: no existe #app'
    );

    return;

  }

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
          Inicia sesión para acceder
          al dashboard.
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
    .onsubmit =
      async event => {

        event.preventDefault();

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
          await supabase.auth
            .signInWithPassword({

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
    .onclick =
      async () => {

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

        } else {

          msg.textContent =
            data.session
              ? 'Cuenta creada.'
              : 'Cuenta creada. Si Supabase pide confirmación, revisa tu correo.';

        }

      };

}

/* =========================================================
   RENDER PRINCIPAL
========================================================= */

function render() {

  if (!app) {

    console.error(
      'QUIMFLUX: #app no existe.'
    );

    return;

  }

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

      ${nav.map(
        item => `

          <button
            data-tab="${item[0]}"
            class="${
              tab === item[0]
                ? 'active'
                : ''
            }"
          >
            ${item[1]}
          </button>

        `
      ).join('')}

    </nav>

    <div id="content"></div>

  `;

  document
    .querySelectorAll(
      'nav button'
    )
    .forEach(button => {

      button.onclick =
        () => {

          tab =
            button.dataset.tab;

          render();

        };

    });

  document
    .getElementById('logout')
    .onclick =
      async () => {

        await supabase.auth
          .signOut();

        user = null;

        rows = [];

        render();

      };

  try {

    if (tab === 'dashboard') {

      renderDashboard();

    } else if (
      tab === 'registro'
    ) {

      renderForm();

    } else {

      renderPlaceholder(
        nav.find(
          x =>
            x[0] === tab
        )?.[1] ||
        'QUIMFLUX'
      );

    }

  } catch (error) {

    console.error(
      'Error renderizando QUIMFLUX:',
      error
    );

    const content =
      document.getElementById(
        'content'
      );

    if (content) {

      content.innerHTML = `

        <main>

          <section class="panel">

            <h1>
              Error al cargar el módulo
            </h1>

            <p>
              Se produjo un error
              al renderizar QUIMFLUX.
            </p>

            <pre
              style="
                white-space:pre-wrap;
              "
            >${esc(
              error?.message ||
              error
            )}</pre>

            <button
              type="button"
              onclick="location.reload()"
            >
              Recargar
            </button>

          </section>

        </main>

      `;

    }

  }

}

/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {

  const d =
    rows.map(
      derive
    );

  const sum =
    key =>
      d.reduce(
        (total, row) =>
          total + n(row[key]),
        0
      );

  const programada =
    sum('programada');

  const producida =
    sum('producida');

  const mp =
    sum('mp');

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

  const k = {

    prod:
      producida,

    programada,

    mp,

    merma:
      d.length
        ? avg(d, 'merma')
        : 0,

    cum:
      programada > 0
        ? producida /
          programada
        : 0,

    yield:
      mp > 0
        ? producida /
          mp
        : 0,

    disp:
      horas > 0
        ? Math.max(
            0,
            Math.min(
              1,
              (horas - paradas) /
                horas
            )
          )
        : 0,

    asis:
      personalProgramado > 0
        ? Math.max(
            0,
            Math.min(
              1,
              personalPresente /
                personalProgramado
            )
          )
        : 0,

    rech:
      producida > 0
        ? Math.max(
            0,
            Math.min(
              1,
              rechazadas /
                producida
            )
          )
        : 0,

    otif:
      pedidos > 0
        ? pedidosTiempo /
          pedidos
        : 0,

    costo:
      sum('costo_produccion'),

    mnt:
      sum('costo_mantenimiento'),

    unit:
      producida > 0
        ? sum(
            'costo_produccion'
          ) /
          producida
        : 0,

    energy:
      producida > 0
        ? sum('energia') /
          producida
        : 0,

    inc:
      sum('incidentes')

  };

  /*
    OEE
  */

  k.oee =
    k.disp *
    k.yield *
    Math.max(
      0,
      1 - k.rech
    );

  /*
    Último registro
  */

  const ultimo =
    d.length
      ? d[
          d.length - 1
        ]
      : null;

  /*
    Tarjetas
  */

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
      'Costo mantenimiento',
      'S/ ' +
        k.mnt.toLocaleString()
    ],

    [
      'Horas parada',
      paradas.toFixed(2) +
        ' h'
    ],

    [
      'Costo unitario',
      'S/ ' +
        k.unit.toFixed(3)
    ],

    [
      'Energía',
      k.energy.toFixed(3) +
        ' kWh/unidad'
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

  /*
    ========================================================
    ALERTAS
    ========================================================
  */

  const alertas = [];

  if (
    k.cum <
    metas.cumplimiento
  ) {

    alertas.push(
      'Cumplimiento por debajo de la meta'
    );

  }

  if (
    k.yield <
    metas.yield
  ) {

    alertas.push(
      'Yield por debajo de la meta'
    );

  }

  if (
    k.merma >
    metas.merma
  ) {

    alertas.push(
      'Merma por encima de la meta'
    );

  }

  if (
    k.disp <
    metas.disponibilidad
  ) {

    alertas.push(
      'Disponibilidad por debajo de la meta'
    );

  }

  if (
    k.otif <
    metas.otif
  ) {

    alertas.push(
      'Entregas a tiempo por debajo de la meta'
    );

  }

  /*
    ========================================================
    HTML DASHBOARD
    ========================================================
  */

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
            Datos sincronizados con Supabase
            · ${rows.length} registros
          </p>

        </div>

        <span class="online">
          ● EN LÍNEA
        </span>

      </div>

      <section class="panel">

        <h2>
          🚨 Alertas QUIMFLUX
        </h2>

        ${
          alertas.length
            ? alertas
                .map(
                  alerta => `
                    <div class="alert">
                      ${esc(alerta)}
                    </div>
                  `
                )
                .join('')
            : `
              <span class="badge ok">
                0 CRÍTICAS
              </span>
            `
        }

      </section>

      ${
        ultimo
          ? `

            <section class="panel">

              <h2>
                Último turno
              </h2>

              <p>
                ${esc(
                  ultimo.fecha
                )}
                ·
                ${esc(
                  ultimo.turno
                )}
                ·
                ${esc(
                  ultimo.producto
                )}
              </p>

              <span class="badge ok">
                REGISTRO MÁS RECIENTE
              </span>

              <div class="cards">

                <div class="card">
                  <small>
                    Cumplimiento
                  </small>
                  <strong>
                    ${pct(
                      ultimo.cumplimiento
                    )}
                  </strong>
                  <span class="badge ${
                    status(
                      ultimo.cumplimiento,
                      metas.cumplimiento
                    ).cls
                  }">
                    ${
                      status(
                        ultimo.cumplimiento,
                        metas.cumplimiento
                      ).label
                    }
                  </span>
                </div>

                <div class="card">
                  <small>
                    Yield
                  </small>
                  <strong>
                    ${pct(
                      ultimo.yieldRate
                    )}
                  </strong>
                  <span class="badge ${
                    status(
                      ultimo.yieldRate,
                      metas.yield
                    ).cls
                  }">
                    ${
                      status(
                        ultimo.yieldRate,
                        metas.yield
                      ).label
                    }
                  </span>
                </div>

                <div class="card">
                  <small>
                    Merma
                  </small>
                  <strong>
                    ${pct(
                      ultimo.merma
                    )}
                  </strong>
                  <span class="badge ${
                    status(
                      ultimo.merma,
                      metas.merma,
                      true
                    ).cls
                  }">
                    ${
                      status(
                        ultimo.merma,
                        metas.merma,
                        true
                      ).label
                    }
                  </span>
                </div>

                <div class="card">
                  <small>
                    Disponibilidad
                  </small>
                  <strong>
                    ${pct(
                      ultimo.disponibilidad
                    )}
                  </strong>
                  <span class="badge ${
                    status(
                      ultimo.disponibilidad,
                      metas.disponibilidad
                    ).cls
                  }">
                    ${
                      status(
                        ultimo.disponibilidad,
                        metas.disponibilidad
                      ).label
                    }
                  </span>
                </div>

                <div class="card">
                  <small>
                    Asistencia
                  </small>
                  <strong>
                    ${pct(
                      ultimo.asistencia
                    )}
                  </strong>
                  <span class="badge ${
                    status(
                      ultimo.asistencia,
                      metas.asistencia
                    ).cls
                  }">
                    ${
                      status(
                        ultimo.asistencia,
                        metas.asistencia
                      ).label
                    }
                  </span>
                </div>

                <div class="card">
                  <small>
                    Rechazo
                  </small>
                  <strong>
                    ${pct(
                      ultimo.rechazo
                    )}
                  </strong>
                  <span class="badge ${
                    status(
                      ultimo.rechazo,
                      metas.rechazo,
                      true
                    ).cls
                  }">
                    ${
                      status(
                        ultimo.rechazo,
                        metas.rechazo,
                        true
                      ).label
                    }
                  </span>
                </div>

                <div class="card">
                  <small>
                    OEE
                  </small>
                  <strong>
                    ${pct(
                      ultimo.oee
                    )}
                  </strong>
                  <span class="badge ${
                    status(
                      ultimo.oee,
                      0.80
                    ).cls
                  }">
                    ${
                      status(
                        ultimo.oee,
                        0.80
                      ).label
                    }
                  </span>
                </div>

                <div class="card">
                  <small>
                    OTIF
                  </small>
                  <strong>
                    ${pct(
                      ultimo.otif
                    )}
                  </strong>
                  <span class="badge ${
                    status(
                      ultimo.otif,
                      metas.otif
                    ).cls
                  }">
                    ${
                      status(
                        ultimo.otif,
                        metas.otif
                      ).label
                    }
                  </span>
                </div>

              </div>

              <div class="panel">

                Producción del último turno:

                <b>
                  ${n(
                    ultimo.producida
                  ).toLocaleString()}
                </b>

                de

                <b>
                  ${n(
                    ultimo.programada
                  ).toLocaleString()}
                </b>

                programados.

              </div>

            </section>

          `
          : ''
      }

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

          ${cards
            .map(
              card => `

                <div class="card">

                  <small>
                    ${esc(card[0])}
                  </small>

                  <strong>
                    ${esc(card[1])}
                  </strong>

                  ${
                    card[2]
                      ? `
                        <span
                          class="badge ${card[2].cls}"
                        >
                          ${card[2].label}
                        </span>
                      `
                      : ''
                  }

                </div>

              `
            )
            .join('')}

        </div>

      </section>

      <section class="panel">

        <h2>
          Comparativa: último turno vs histórico
        </h2>

        ${
          ultimo
            ? `

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

                    ${comparisonRow(
                      'Cumplimiento',
                      ultimo.cumplimiento,
                      k.cum
                    )}

                    ${comparisonRow(
                      'Yield',
                      ultimo.yieldRate,
                      k.yield
                    )}

                    ${comparisonRow(
                      'Merma',
                      ultimo.merma,
                      k.merma
                    )}

                    ${comparisonRow(
                      'Disponibilidad',
                      ultimo.disponibilidad,
                      k.disp
                    )}

                    ${comparisonRow(
                      'Asistencia',
                      ultimo.asistencia,
                      k.asis
                    )}

                    ${comparisonRow(
                      'Rechazo',
                      ultimo.rechazo,
                      k.rech
                    )}

                    ${comparisonRow(
                      'OEE',
                      ultimo.oee,
                      k.oee
                    )}

                    ${comparisonRow(
                      'OTIF',
                      ultimo.otif,
                      k.otif
                    )}

                  </tbody>

                </table>

              </div>

            `
            : `
              <div class="empty">
                No hay datos suficientes.
              </div>
            `
        }

      </section>

      <section class="panel">

        <h2>
          Tendencias de desempeño
        </h2>

        <p>
          Evolución de los principales KPI
          según los registros diarios.
        </p>

        <div class="cards">

          <div class="card">
            Tendencia cumplimiento ↑
            <b>MEJORANDO</b>
          </div>

          <div class="card">
            Tendencia Yield ↑
            <b>MEJORANDO</b>
          </div>

          <div class="card">
            Tendencia OEE ↑
            <b>MEJORANDO</b>
          </div>

        </div>

        <div
          style="
            margin-top:20px;
            padding:30px;
            text-align:center;
            opacity:.8;
          "
        >

          ${buildTrendText(d)}

        </div>

      </section>

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

                    </tr>

                  </thead>

                  <tbody>

                    ${d
                      .slice(
                        -20
                      )
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
                              ${pct(
                                r.merma
                              )}
                            </td>

                            <td>
                              ${pct(
                                r.oee
                              )}
                            </td>

                          </tr>

                        `
                      )
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

}

/* =========================================================
   FILA COMPARATIVA
========================================================= */

function comparisonRow(
  name,
  ultimo,
  historico
) {

  const diferencia =
    (n(ultimo) -
      n(historico)) *
    100;

  const signo =
    diferencia > 0
      ? '+'
      : '';

  return `

    <tr>

      <td>
        ${esc(name)}
      </td>

      <td>
        ${pct(ultimo)}
      </td>

      <td>
        ${pct(historico)}
      </td>

      <td>
        ${signo}${diferencia.toFixed(1)} pp
      </td>

    </tr>

  `;

}

/* =========================================================
   TENDENCIA
========================================================= */

function buildTrendText(data) {

  if (!data.length) {

    return `
      Sin datos suficientes para mostrar
      tendencias.
    `;

  }

  if (data.length === 1) {

    return `
      Se requiere más de un registro
      para calcular tendencia.
    `;

  }

  const first =
    data[0];

  const last =
    data[data.length - 1];

  const trend =
    (key, label) => {

      const a =
        n(first[key]);

      const b =
        n(last[key]);

      const direction =
        b > a
          ? '↑ MEJORANDO'
          : b < a
            ? '↓ DISMINUYENDO'
            : '→ ESTABLE';

      return `
        <div>
          ${label}:
          <b>
            ${direction}
          </b>
        </div>
      `;

    };

  return `

    ${trend(
      'cumplimiento',
      'Cumplimiento'
    )}

    ${trend(
      'yieldRate',
      'Yield'
    )}

    ${trend(
      'oee',
      'OEE'
    )}

  `;

}

/* =========================================================
   FORMULARIO REGISTRO DIARIO
========================================================= */

function renderForm() {

  const r =
    empty();

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

      <section class="panel">

        <p>
          <b>IMPORTANTE:</b>
          Merma se registra como porcentaje decimal.
        </p>

        <p>
          Ejemplo:
          <b>0.02 = 2%</b>,
          <b>0.05 = 5%</b>,
          <b>0.10 = 10%</b>.
        </p>

      </section>

      <form
        id="daily"
        class="formGrid"
      >

        <section>

          <h2>
            Producción
          </h2>

          ${fields
            .slice(0, 7)
            .map(
              f =>
                control(
                  f,
                  r
                )
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
                control(
                  f,
                  r
                )
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
                control(
                  f,
                  r
                )
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
                control(
                  f,
                  r
                )
            )
            .join('')}

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

  document.getElementById(
    'daily'
  ).onsubmit =
    async event => {

      event.preventDefault();

      const msg =
        document.getElementById(
          'saveMsg'
        );

      const payload = {

        user_id:
          user.id

      };

      fields.forEach(
        ([key, label, type]) => {

          const el =
            document.getElementById(
              'f_' + key
            );

          if (!el) {

            return;

          }

          if (
            type === 'number'
          ) {

            payload[key] =
              el.value === ''
                ? null
                : n(el.value);

          } else {

            payload[key] =
              el.value;

          }

        }
      );

      /*
        Validación específica
        de MERMA.
      */

      if (
        payload.merma !== null &&
        (
          payload.merma < 0 ||
          payload.merma > 1
        )
      ) {

        msg.textContent =
          'La merma debe estar entre 0 y 1. Ejemplo: 0.02 = 2%.';

        return;

      }

      /*
        Validaciones básicas.
      */

      if (
        payload.programada !== null &&
        payload.programada < 0
      ) {

        msg.textContent =
          'La cantidad programada no puede ser negativa.';

        return;

      }

      if (
        payload.producida !== null &&
        payload.producida < 0
      ) {

        msg.textContent =
          'La cantidad producida no puede ser negativa.';

        return;

      }

      if (
        payload.producida !== null &&
        payload.programada !== null &&
        payload.producida >
        payload.programada
      ) {

        msg.textContent =
          'La producción real no puede ser mayor que la producción programada para esta prueba.';

        return;

      }

      msg.textContent =
        'Guardando…';

      const {
        error
      } =
        await supabase
          .from(
            'daily_records'
          )
          .insert(
            payload
          );

      if (error) {

        console.error(
          'Error guardando registro:',
          error
        );

        msg.textContent =
          error.message;

        return;

      }

      msg.textContent =
        'Registro guardado correctamente.';

      await load();

      setTimeout(
        () => {

          render();

        },
        400
      );

    };

}

/* =========================================================
   CONTROLES DEL FORMULARIO
========================================================= */

function control(
  field,
  r
) {

  const [
    key,
    label,
    type
  ] = field;

  let input;

  if (
    type === 'select'
  ) {

    input = `

      <select
        id="f_${key}"
      >

        <option value="Mañana">
          Mañana
        </option>

        <option value="Tarde">
          Tarde
        </option>

        <option value="Noche">
          Noche
        </option>

      </select>

    `;

  } else if (
    type === 'textarea'
  ) {

    input = `

      <textarea
        id="f_${key}"
      >${esc(
        r[key]
      )}</textarea>

    `;

  } else {

    let value =
      r[key];

    /*
      Para Merma:
      mostramos el decimal directamente.

      0.02 = 2%
    */

    input = `

      <input
        id="f_${key}"
        type="${type}"
        value="${esc(
          value
        )}"
        ${
          type === 'number'
            ? 'step="any"'
            : ''
        }
        ${
          key === 'merma'
            ? 'min="0" max="1"'
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
   PLACEHOLDER
========================================================= */

function renderPlaceholder(
  title
) {

  document.getElementById(
    'content'
  ).innerHTML = `

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

        <span class="badge ok">
          Módulo preparado
        </span>

      </section>

    </main>

  `;

}

/* =========================================================
   CARGA DE DATOS
========================================================= */

async function load() {

  /*
    Cargar registros diarios.
  */

  const result =
    await supabase
      .from('daily_records')
      .select('*')
      .order(
        'fecha',
        {
          ascending: true
        }
      );

  if (result.error) {

    console.error(
      'Error cargando daily_records:',
      result.error
    );

    rows = [];

  } else {

    rows =
      result.data || [];

  }

  /*
    Cargar configuración.
  */

  const settings =
    await supabase
      .from('app_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

  if (
    settings.data
  ) {

    const s =
      settings.data;

    metas = {

      ...metas,

      cumplimiento:
        n(
          s.meta_cumplimiento
        ) ||
        metas.cumplimiento,

      merma:
        n(
          s.meta_merma
        ) ||
        metas.merma,

      yield:
        n(
          s.meta_yield
        ) ||
        metas.yield,

      disponibilidad:
        n(
          s.meta_disponibilidad
        ) ||
        metas.disponibilidad,

      asistencia:
        n(
          s.meta_asistencia
        ) ||
        metas.asistencia,

      rechazo:
        n(
          s.meta_rechazo
        ) ||
        metas.rechazo,

      otif:
        n(
          s.meta_entregas
        ) ||
        metas.otif,

      incidentes:
        Number.isFinite(
          Number(
            s.meta_incidentes
          )
        )
          ? n(
              s.meta_incidentes
            )
          : metas.incidentes

    };

  }

}

/* =========================================================
   INICIO
========================================================= */

async function init() {

  if (!app) {

    console.error(
      'QUIMFLUX: no se encontró el elemento #app.'
    );

    return;

  }

  try {

    const {
      data,
      error
    } =
      await supabase.auth
        .getSession();

    if (error) {

      console.error(
        'Error obteniendo sesión:',
        error
      );

      renderAuth();

      return;

    }

    user =
      data.session?.user ||
      null;

    if (user) {

      await load();

    }

    render();

  } catch (error) {

    console.error(
      'Error inicializando QUIMFLUX:',
      error
    );

    renderAuth();

  }

}

/* =========================================================
   CAMBIOS DE SESIÓN
========================================================= */

supabase.auth.onAuthStateChange(
  (_event, session) => {

    user =
      session?.user ||
      null;

    if (!user) {

      rows = [];

    }

    render();

  }
);

/* =========================================================
   ARRANQUE
========================================================= */

init();