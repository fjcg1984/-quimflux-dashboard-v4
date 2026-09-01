import { createClient } from '@supabase/supabase-js';
import './styles.css';

/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
  'https://cgkdztwtodmdteohvuoh.supabase.co';

const SUPABASE_KEY =
  'sb_publishable_sULeDyfJ1l5xfuVhFgXRKA_bsim9qSe';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

/* =========================================================
   APLICACIÓN
========================================================= */

const app = document.getElementById('app');

const today =
  new Date().toISOString().slice(0, 10);

/* =========================================================
   ESTADO
========================================================= */

let user = null;

let rows = [];
let inventoryRows = [];
let ssomaRows = [];
let personalRows = [];
let novedadesRows = [];
let maintenanceRows = [];
let shipmentRows = [];

let tab = 'dashboard';

let editingInventoryId = null;
let editingSsomaId = null;
let editingPersonalId = null;
let editingMaintenanceId = null;
let inventoryView = 'registro';
let inventorySearch = '';
let inventorySearchField = 'todos';

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
  return Number.isFinite(x) ? x : 0;
}

function pct(v) {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) {
    return '—';
  }
  return (Number(v) * 100).toFixed(1) + '%';
}

function msg(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/* =========================================================
   SSOMA - INDICADORES
   Fuente oficial: ssoma_incidents.
   Para el indicador de días se consideran Accidente e Incidente.
========================================================= */

function getSsomaStats() {
  const eventos = Array.isArray(ssomaRows) ? ssomaRows : [];

  const accidentesIncidentes = eventos.filter(r => {
    const tipo = String(r.tipo || '').trim().toLowerCase();
    return tipo === 'accidente' || tipo === 'incidente';
  });

  const fechasValidas = accidentesIncidentes
    .map(r => String(r.fecha || '').slice(0, 10))
    .filter(fecha => /^\d{4}-\d{2}-\d{2}$/.test(fecha))
    .sort();

  const ultimaFecha = fechasValidas.length
    ? fechasValidas[fechasValidas.length - 1]
    : null;

  let diasSinAccidenteIncidente = null;

  if (ultimaFecha) {
    const hoy = new Date(`${today}T00:00:00`);
    const ultimo = new Date(`${ultimaFecha}T00:00:00`);
    const diferencia = hoy.getTime() - ultimo.getTime();
    diasSinAccidenteIncidente = Math.max(0, Math.floor(diferencia / 86400000));
  }

  return {
    totalEventos: eventos.length,
    totalAccidentesIncidentes: accidentesIncidentes.length,
    ultimaFecha,
    diasSinAccidenteIncidente
  };
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
  const pedidos = n(r.pedidos_programados);
  const at = n(r.pedidos_tiempo);

  // MERMA: el campo se interpreta como cantidad de merma.
  // Porcentaje = merma / materia prima consumida.
  const mermaCantidad = n(r.merma);
  const merma = mp > 0 ? mermaCantidad / mp : null;
  const yieldRate = mp > 0 ? q / mp : null;
  const disponibilidad = h > 0 ? Math.max(0, (h - stop) / h) : null;
  const asistencia = pp > 0 ? pa / pp : null;
  const rechazo = q > 0 ? rej / q : null;
  const cumplimiento = p > 0 ? q / p : null;
  const otif = pedidos > 0 ? at / pedidos : null;

  const oee =
    disponibilidad !== null &&
    cumplimiento !== null &&
    rechazo !== null
      ? disponibilidad * cumplimiento * Math.max(0, 1 - rechazo)
      : null;

  const costoUnitario = q > 0 ? n(r.costo_produccion) / q : null;
  const energiaUnit = q > 0 ? n(r.energia) / q : null;

  return {
    ...r,
    mermaCantidad,
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
  if (!app) {
    console.error('QUIMFLUX: no existe #app en index.html');
    return;
  }

  app.innerHTML = `
    <div class="auth">
      <h1>QUIMFLUX</h1>
      <h2>Administrador de Planta</h2>
      <p>Inicia sesión para acceder al dashboard.</p>

      <form id="authForm">
        <label>
          Correo
          <input id="email" type="email" required autocomplete="email">
        </label>

        <label>
          Contraseña
          <input id="password" type="password" minlength="6" required autocomplete="current-password">
        </label>

        <div id="authMsg" class="msg"></div>

        <button class="primary" type="submit">Entrar</button>

        <button class="link" id="signup" type="button">
          Crear una cuenta
        </button>
      </form>
    </div>
  `;

  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');

  document.getElementById('authForm').onsubmit = async e => {
    e.preventDefault();

    msg('authMsg', 'Iniciando sesión…');

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: emailInput.value.trim(),
        password: passwordInput.value
      });

    if (error) {
      msg('authMsg', error.message);
      return;
    }

    user = data.user;
    await load();
    render();
  };

  document.getElementById('signup').onclick = async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      msg('authMsg', 'Ingresa correo y contraseña.');
      return;
    }

    msg('authMsg', 'Creando cuenta…');

    const { data, error } =
      await supabase.auth.signUp({
        email,
        password
      });

    if (error) {
      msg('authMsg', error.message);
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
  if (!app) {
    console.error('QUIMFLUX: #app no existe.');
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
    ['despachos', 'Despachos'],
    ['personal', 'Personal'],
    ['ssoma', 'SSOMA']
  ];

  app.innerHTML = `
    <header>
      <div class="qf-brand">
        <img
          class="qf-brand-mark"
          src="./assets/quimflux-logo.png"
          alt="QUIMFLUX"
          onerror="this.style.display='none'"
        >
        <div>
          <b>QUIMFLUX</b>
          <span> · Administrador de Planta V6</span>
        </div>
      </div>
      <button id="logout">Salir</button>
    </header>

    <nav>
      ${nav.map(x => `
        <button
          data-tab="${x[0]}"
          class="${tab === x[0] ? 'active' : ''}"
        >
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
        tab = button.dataset.tab;
        render();
      };
    });

  document.getElementById('logout').onclick = async () => {
    await supabase.auth.signOut();

    user = null;
    rows = [];
    inventoryRows = [];
    ssomaRows = [];
    personalRows = [];
    novedadesRows = [];
    maintenanceRows = [];
    shipmentRows = [];

    render();
  };

  try {
    if (tab === 'dashboard') {
      renderDashboard();
    } else if (tab === 'registro') {
      renderForm();
    } else if (tab === 'resumen') {
      renderResumen();
    } else if (tab === 'inventario') {
      renderInventory();
    } else if (tab === 'despachos') {
      renderDespachos();
    } else if (tab === 'personal') {
      renderPersonal();
    } else if (tab === 'ssoma') {
      renderSsoma();
    } else if (tab === 'mantenimiento') {
      renderMaintenance();
    } else if (tab === 'costos') {
      renderCostosEnergia();
    } else {
      renderPlaceholder(
        nav.find(x => x[0] === tab)?.[1] || 'QUIMFLUX'
      );
    }
  } catch (error) {
    console.error('Error renderizando QUIMFLUX:', error);

    const content = document.getElementById('content');

    if (content) {
      content.innerHTML = `
        <main>
          <section class="panel">
            <h1>Error al cargar el módulo</h1>
            <p>Se produjo un error al renderizar QUIMFLUX.</p>
            <pre style="white-space:pre-wrap;">${esc(error?.message || error)}</pre>
            <button type="button" onclick="location.reload()">
              Recargar
            </button>
          </section>
        </main>
      `;
    }
  }
}

/* =========================================================
   STATUS
========================================================= */

function status(value, target, invert = false) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value)) ||
    !Number.isFinite(Number(target))
  ) {
    return {
      label: 'SIN DATOS',
      cls: 'ok'
    };
  }

  const v = Number(value);
  const t = Number(target);

  const ok = invert ? v <= t : v >= t;
  const critical = invert ? v > t * 1.5 : v < t * 0.85;

  return {
    label: critical ? 'CRÍTICO' : ok ? 'OK' : 'REVISAR',
    cls: critical ? 'critical' : ok ? 'ok' : 'warn'
  };
}

/* =========================================================
   ALERTAS QUIMFLUX
   IMPORTANTE:
   NULL = SIN DATOS
   NO SE CONVIERTE EN 0%
========================================================= */

function getAlerts() {
  const alerts = [];

  if (!Array.isArray(rows)) rows = [];
  if (!Array.isArray(inventoryRows)) inventoryRows = [];
  if (!Array.isArray(ssomaRows)) ssomaRows = [];
  if (!Array.isArray(maintenanceRows)) maintenanceRows = [];

  const d = rows.map(derive);

  const sum = key =>
    d.reduce((s, r) => s + n(r[key]), 0);

  const programada = sum('programada');
  const producida = sum('producida');
  const mp = sum('mp');
  const merma = sum('merma');
  const horas = sum('horas_turno');
  const paradasDiarias = sum('horas_paradas');
  const personalProgramado = sum('personal_programado');
  const personalPresente = sum('personal_presente');
  const rechazadas = sum('rechazadas');
  const pedidos = sum('pedidos_programados');
  const pedidosTiempo = sum('pedidos_tiempo');

  /* -------------------------------------------------------
     EXISTENCIA REAL DE DATOS OPERATIVOS
  ------------------------------------------------------- */

  const existeDatoOperativo =
       programada > 0
    || producida > 0
    || mp > 0
    || merma > 0
    || horas > 0
    || paradasDiarias > 0
    || personalProgramado > 0
    || personalPresente > 0
    || rechazadas > 0
    || pedidos > 0
    || pedidosTiempo > 0;

  /*
     Si no hay ningún dato operativo:
     NO generar alertas KPI.
  */
  if (existeDatoOperativo) {
    const cumplimiento =
      programada > 0 ? producida / programada : null;

    const yieldRate =
      mp > 0 ? producida / mp : null;

    const mermaRate =
      mp > 0 ? merma / mp : null;

    const horasParadaMantenimiento =
      maintenanceRows.reduce(
        (total, r) => total + n(r.horas_parada),
        0
      );

    const paradas =
      horasParadaMantenimiento > 0
        ? horasParadaMantenimiento
        : paradasDiarias;

    const disponibilidad =
      horas > 0
        ? Math.max(0, (horas - paradas) / horas)
        : null;

    const asistencia =
      personalProgramado > 0
        ? personalPresente / personalProgramado
        : null;

    const rechazo =
      producida > 0
        ? rechazadas / producida
        : null;

    const otif =
      pedidos > 0
        ? pedidosTiempo / pedidos
        : null;

    const oee =
      disponibilidad !== null &&
      cumplimiento !== null &&
      rechazo !== null
        ? disponibilidad *
          cumplimiento *
          Math.max(0, 1 - rechazo)
        : null;

    const kpis = [
      {
        nombre: 'Cumplimiento',
        valor: cumplimiento,
        meta: metas.cumplimiento
      },
      {
        nombre: 'Yield',
        valor: yieldRate,
        meta: metas.yield
      },
      {
        nombre: 'Disponibilidad',
        valor: disponibilidad,
        meta: metas.disponibilidad
      },
      {
        nombre: 'Asistencia',
        valor: asistencia,
        meta: metas.asistencia
      },
      {
        nombre: 'OTIF',
        valor: otif,
        meta: metas.otif
      },
      {
        nombre: 'OEE',
        valor: oee,
        meta: 0.80
      }
    ];

    kpis.forEach(kpi => {
      if (
        kpi.valor !== null &&
        Number.isFinite(kpi.valor) &&
        kpi.valor < kpi.meta * 0.85
      ) {
        alerts.push({
          nivel: 'critical',
          titulo: `${kpi.nombre} en nivel crítico`,
          detalle: `${pct(kpi.valor)} · Meta ${pct(kpi.meta)}`
        });
      } else if (
        kpi.valor !== null &&
        Number.isFinite(kpi.valor) &&
        kpi.valor < kpi.meta
      ) {
        alerts.push({
          nivel: 'warn',
          titulo: `${kpi.nombre} requiere revisión`,
          detalle: `${pct(kpi.valor)} · Meta ${pct(kpi.meta)}`
        });
      }
    });

    if (
      mermaRate !== null &&
      mermaRate > metas.merma * 1.5
    ) {
      alerts.push({
        nivel: 'critical',
        titulo: 'Merma en nivel crítico',
        detalle: `${pct(mermaRate)} · Meta máxima ${pct(metas.merma)}`
      });
    } else if (
      mermaRate !== null &&
      mermaRate > metas.merma
    ) {
      alerts.push({
        nivel: 'warn',
        titulo: 'Merma por encima de la meta',
        detalle: `${pct(mermaRate)} · Meta máxima ${pct(metas.merma)}`
      });
    }

    if (
      rechazo !== null &&
      rechazo > metas.rechazo * 1.5
    ) {
      alerts.push({
        nivel: 'critical',
        titulo: 'Rechazo de calidad crítico',
        detalle: `${pct(rechazo)} · Meta máxima ${pct(metas.rechazo)}`
      });
    } else if (
      rechazo !== null &&
      rechazo > metas.rechazo
    ) {
      alerts.push({
        nivel: 'warn',
        titulo: 'Rechazo de calidad elevado',
        detalle: `${pct(rechazo)} · Meta máxima ${pct(metas.rechazo)}`
      });
    }

  }

  /* -------------------------------------------------------
     SSOMA - FUENTE OFICIAL DE INCIDENTES
     Se evalúa independientemente de los datos operativos.
  ------------------------------------------------------- */
  const ssomaStats = getSsomaStats();
  const incidentes = ssomaStats.totalEventos;

  if (incidentes > metas.incidentes) {
    alerts.push({
      nivel: incidentes >= 2 ? 'critical' : 'warn',
      titulo: 'Incidentes SSOMA registrados',
      detalle: `${incidentes} evento(s) · Meta ${metas.incidentes}`
    });
  }

  /* -------------------------------------------------------
     INVENTARIO
     Estos módulos sí pueden generar alertas aunque no haya
     registros diarios.
  ------------------------------------------------------- */

  inventoryRows.forEach(r => {
    const stock =
      n(r.stock_inicial) +
      n(r.entradas) -
      n(r.salidas);

    const minimo = n(r.stock_minimo);

    if (minimo > 0 && stock <= minimo) {
      alerts.push({
        nivel: 'critical',
        titulo: `Stock bajo: ${r.material}`,
        detalle:
          `Stock actual ${stock} ${r.unidad || ''} · Mínimo ${minimo} ${r.unidad || ''}`
      });
    }
  });

  /* -------------------------------------------------------
     MANTENIMIENTO
  ------------------------------------------------------- */

  maintenanceRows.forEach(r => {
    const estado =
      String(r.estado || '').trim().toLowerCase();

    if (
      estado === 'abierto' ||
      estado === 'en proceso'
    ) {
      alerts.push({
        nivel: 'warn',
        titulo: `Mantenimiento pendiente: ${r.equipo}`,
        detalle:
          `${r.estado} · ${r.fecha || 'Sin fecha'}`
      });
    }

    if (
      estado === 'programado' &&
      r.fecha_programada &&
      r.fecha_programada < today
    ) {
      alerts.push({
        nivel: 'critical',
        titulo: `Mantenimiento vencido: ${r.equipo}`,
        detalle:
          `Programado para ${r.fecha_programada}`
      });
    }
  });

  /* -------------------------------------------------------
     SSOMA
  ------------------------------------------------------- */

  ssomaRows.forEach(r => {
    const estado =
      String(r.estado || '').trim().toLowerCase();

    if (estado !== 'cerrado') {
      const gravedad =
        String(r.gravedad || '').trim().toLowerCase();

      const nivel =
        gravedad === 'grave' ||
        gravedad === 'crítica'
          ? 'critical'
          : 'warn';

      alerts.push({
        nivel,
        titulo: 'Incidente SSOMA abierto',
        detalle:
          `${r.tipo || 'Incidente'} · ${r.gravedad || 'Sin gravedad'} · ${r.fecha || ''}`
      });
    }
  });

  alerts.sort((a, b) => {
    const prioridad = {
      critical: 1,
      warn: 2,
      ok: 3
    };

    return prioridad[a.nivel] - prioridad[b.nivel];
  });

  return alerts;
}

/* =========================================================
   RENDER ALERTAS
========================================================= */

function renderAlerts() {
  const alerts = getAlerts();

  if (!alerts.length) {
    const hayDatosOperativos =
      rows.some(r =>
        [
          'programada',
          'producida',
          'mp',
          'merma',
          'horas_turno',
          'horas_paradas',
          'personal_programado',
          'personal_presente',
          'rechazadas',
          'pedidos_programados',
          'pedidos_tiempo'
        ].some(k => n(r[k]) > 0)
      );

    return hayDatosOperativos
      ? `
        <section class="panel">
          <div class="titleRow">
            <div>
              <h2>Alertas QUIMFLUX</h2>
              <p>
                No se detectan desviaciones que requieran atención.
              </p>
            </div>

            <span class="badge ok">
              ✓ PLANTA SIN ALERTAS
            </span>
          </div>
        </section>
      `
      : `
        <section class="panel">
          <div class="titleRow">
            <div>
              <h2>Alertas QUIMFLUX</h2>
              <p>
                Todavía no existen datos operativos suficientes
                para evaluar los KPI.
              </p>
            </div>

            <span class="badge ok">
              0 CRÍTICAS
            </span>
          </div>

          <div class="empty">
            Los KPI permanecerán como <b>SIN DATOS</b>
            hasta que ingreses datos reales.
          </div>
        </section>
      `;
  }

  const critical =
    alerts.filter(a => a.nivel === 'critical').length;

  const warnings =
    alerts.filter(a => a.nivel === 'warn').length;

  return `
    <section class="panel">
      <div class="titleRow">
        <div>
          <h2>🚨 Alertas QUIMFLUX</h2>
          <p>Desviaciones que requieren atención.</p>
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${
            critical
              ? `<span class="badge critical">
                   ${critical} CRÍTICA${critical > 1 ? 'S' : ''}
                 </span>`
              : ''
          }

          ${
            warnings
              ? `<span class="badge warn">
                   ${warnings} REVISIÓN${warnings > 1 ? 'ES' : ''}
                 </span>`
              : ''
          }
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:10px;">
        ${alerts.map(a => `
          <div style="
            display:flex;
            gap:12px;
            align-items:flex-start;
            padding:12px;
            border:1px solid #ddd;
            border-radius:10px;
          ">
            <span class="badge ${a.nivel}">
              ${a.nivel === 'critical' ? 'CRÍTICO' : 'REVISAR'}
            </span>

            <div>
              <strong>${esc(a.titulo)}</strong>
              <div>
                <small>${esc(a.detalle)}</small>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

/* =========================================================
   DASHBOARD
========================================================= */

function aggregateMetrics(data, useMaintenance = true) {
  const d = (Array.isArray(data) ? data : []).map(derive);
  const sum = key => d.reduce((total, r) => total + n(r[key]), 0);

  const programada = sum('programada');
  const producida = sum('producida');
  const mp = sum('mp');
  const mermaCantidad = sum('mermaCantidad');
  const horas = sum('horas_turno');
  const paradasDiarias = sum('horas_paradas');
  const personalProgramado = sum('personal_programado');
  const personalPresente = sum('personal_presente');
  const rechazadas = sum('rechazadas');
  const pedidos = sum('pedidos_programados');
  const pedidosTiempo = sum('pedidos_tiempo');
  const costo = sum('costo_produccion');
  const energiaTotal = sum('energia');
  // INCIDENTES SSOMA: fuente oficial ssoma_incidents.
  const incidentes = Array.isArray(ssomaRows) ? ssomaRows.length : 0;

  const cumplimiento = programada > 0 ? producida / programada : null;
  const yieldRate = mp > 0 ? producida / mp : null;
  const merma = mp > 0 ? mermaCantidad / mp : null;
  const asistencia = personalProgramado > 0 ? personalPresente / personalProgramado : null;
  const rechazo = producida > 0 ? rechazadas / producida : null;
  const otif = pedidos > 0 ? pedidosTiempo / pedidos : null;

  const horasParadaMantenimiento = useMaintenance
    ? maintenanceRows.reduce((total, r) => total + n(r.horas_parada), 0)
    : 0;

  const paradas = useMaintenance && horasParadaMantenimiento > 0
    ? horasParadaMantenimiento
    : paradasDiarias;

  const disponibilidad = horas > 0
    ? Math.max(0, (horas - paradas) / horas)
    : null;

  const oee =
    disponibilidad !== null &&
    cumplimiento !== null &&
    rechazo !== null
      ? disponibilidad * cumplimiento * Math.max(0, 1 - rechazo)
      : null;

  return {
    d,
    programada,
    producida,
    mp,
    mermaCantidad,
    merma,
    horas,
    paradas,
    personalProgramado,
    personalPresente,
    rechazadas,
    pedidos,
    pedidosTiempo,
    costo,
    energiaTotal,
    incidentes,
    cumplimiento,
    yieldRate,
    disponibilidad,
    asistencia,
    rechazo,
    otif,
    oee,
    costoUnitario: producida > 0 ? costo / producida : null,
    energia: producida > 0 ? energiaTotal / producida : null
  };
}

function metricValue(m, key) {
  return m && Number.isFinite(Number(m[key])) ? Number(m[key]) : null;
}

function trendClass(values) {
  const clean = values.filter(v => v !== null && Number.isFinite(v));
  if (clean.length < 2) return { arrow: '→', label: 'SIN DATOS', cls: 'ok' };
  const first = clean[0];
  const last = clean[clean.length - 1];
  const delta = last - first;
  if (Math.abs(delta) < 0.005) return { arrow: '→', label: 'ESTABLE', cls: 'ok' };
  return delta > 0
    ? { arrow: '↑', label: 'MEJORANDO', cls: 'ok' }
    : { arrow: '↓', label: 'EMPEORANDO', cls: 'warn' };
}

function trendData() {
  const sorted = [...rows]
    .map(derive)
    .sort((a, b) => String(a.fecha || '').localeCompare(String(b.fecha || '')));

  const byDate = new Map();
  sorted.forEach(r => {
    const key = r.fecha || 'Sin fecha';
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key).push(r);
  });

  return [...byDate.entries()].map(([fecha, items]) => {
    const m = aggregateMetrics(items, false);
    return {
      fecha,
      cumplimiento: m.cumplimiento === null ? null : m.cumplimiento * 100,
      yieldRate: m.yieldRate === null ? null : m.yieldRate * 100,
      oee: m.oee === null ? null : m.oee * 100,
      meta: metas.cumplimiento * 100
    };
  });
}

function renderTrendChart(data) {
  if (!data.length) {
    return `
      <div class="empty">
        Todavía no hay suficientes registros para mostrar la tendencia.
      </div>
    `;
  }

  const W = 1000;
  const H = 360;
  const left = 58;
  const right = 22;
  const top = 24;
  const bottom = 58;
  const plotW = W - left - right;
  const plotH = H - top - bottom;
  const maxY = 120;
  const minY = 0;

  const x = i => data.length === 1
    ? left + plotW / 2
    : left + (i * plotW) / (data.length - 1);
  const y = value => top + plotH - ((value - minY) / (maxY - minY)) * plotH;

  const grid = [0, 20, 40, 60, 80, 100, 120].map(v => `
    <line x1="${left}" y1="${y(v)}" x2="${W - right}" y2="${y(v)}" stroke="currentColor" opacity="0.14" />
    <text x="${left - 10}" y="${y(v) + 4}" text-anchor="end" font-size="12" fill="currentColor" opacity="0.72">${v}%</text>
  `).join('');

  const makePath = key => {
    const segments = [];
    let segment = [];
    data.forEach((r, i) => {
      if (r[key] === null || !Number.isFinite(r[key])) {
        if (segment.length) segments.push(segment);
        segment = [];
      } else {
        segment.push(`${x(i).toFixed(1)},${y(r[key]).toFixed(1)}`);
      }
    });
    if (segment.length) segments.push(segment);
    return segments.map(points => `<polyline points="${points.join(' ')}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />`).join('');
  };

  const colors = {
    cumplimiento: '#5eead4',
    yieldRate: '#c084fc',
    oee: '#f472b6',
    meta: '#fbbf24'
  };

  const lines = ['cumplimiento', 'yieldRate', 'oee'].map(key => `
    <g style="color:${colors[key]}">
      ${makePath(key)}
      ${data.map((r, i) => r[key] === null ? '' : `<circle cx="${x(i)}" cy="${y(r[key])}" r="4" fill="currentColor" />`).join('')}
    </g>
  `).join('');

  const metaY = y(metas.cumplimiento * 100);
  const metaLine = `
    <line x1="${left}" y1="${metaY}" x2="${W - right}" y2="${metaY}"
      stroke="${colors.meta}" stroke-width="2" stroke-dasharray="8 6" opacity="0.95" />
    <text x="${W - right - 4}" y="${metaY - 8}" text-anchor="end" font-size="12" fill="${colors.meta}">META ${pct(metas.cumplimiento)}</text>
  `;

  const labels = data.map((r, i) => {
    const show = data.length <= 8 || i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 8) === 0;
    return show ? `<text x="${x(i)}" y="${H - 20}" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.75">${esc(r.fecha)}</text>` : '';
  }).join('');

  return `
    <div class="trendLegend">
      <span><i style="background:${colors.cumplimiento}"></i>Cumplimiento</span>
      <span><i style="background:${colors.yieldRate}"></i>Yield</span>
      <span><i style="background:${colors.oee}"></i>OEE</span>
      <span><i class="dash" style="background:${colors.meta}"></i>Meta ${pct(metas.cumplimiento)}</span>
    </div>
    <div style="width:100%;overflow-x:auto;">
      <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Tendencias de cumplimiento, yield y OEE">
        ${grid}
        ${metaLine}
        ${lines}
        ${labels}
      </svg>
    </div>
  `;
}

function renderDashboard() {
  const metrics = aggregateMetrics(rows);
  const latest = metrics.d.length ? metrics.d[metrics.d.length - 1] : null;
  const latestMetrics = latest ? aggregateMetrics([latest], false) : null;
  const trend = trendData();

  const cards = [
    ['Producción total', metrics.producida.toLocaleString()],
    ['Cumplimiento', pct(metrics.cumplimiento), status(metrics.cumplimiento, metas.cumplimiento)],
    ['Yield', pct(metrics.yieldRate), status(metrics.yieldRate, metas.yield)],
    ['Merma', pct(metrics.merma), status(metrics.merma, metas.merma, true)],
    ['Disponibilidad', pct(metrics.disponibilidad), status(metrics.disponibilidad, metas.disponibilidad)],
    ['Asistencia', pct(metrics.asistencia), status(metrics.asistencia, metas.asistencia)],
    ['Rechazo calidad', pct(metrics.rechazo), status(metrics.rechazo, metas.rechazo, true)],
    ['OEE', pct(metrics.oee), status(metrics.oee, 0.80)],
    ['Costo producción', 'S/ ' + metrics.costo.toLocaleString()],
    ['Costo mantenimiento', 'S/ ' + maintenanceRows.reduce((t, r) => t + n(r.costo), 0).toLocaleString()],
    ['Horas parada', metrics.paradas.toFixed(2) + ' h'],
    ['Costo unitario', metrics.costoUnitario === null ? '—' : 'S/ ' + metrics.costoUnitario.toFixed(3)],
    ['Energía', metrics.energia === null ? '—' : metrics.energia.toFixed(3) + ' kWh/unidad'],
    ['Entregas a tiempo', pct(metrics.otif), status(metrics.otif, metas.otif)],
    ['Incidentes SSOMA', String(metrics.incidentes), status(metrics.incidentes, metas.incidentes, true)]
  ];

  const ssomaStats = getSsomaStats();
  const diasSinAccidenteIncidente = ssomaStats.diasSinAccidenteIncidente;

  const trendCum = trendClass(trend.map(x => x.cumplimiento === null ? null : x.cumplimiento / 100));
  const trendYield = trendClass(trend.map(x => x.yieldRate === null ? null : x.yieldRate / 100));
  const trendOee = trendClass(trend.map(x => x.oee === null ? null : x.oee / 100));

  const comparison = latest && latestMetrics ? [
    ['Cumplimiento', latestMetrics.cumplimiento, metrics.cumplimiento],
    ['Yield', latestMetrics.yieldRate, metrics.yieldRate],
    ['Merma', latestMetrics.merma, metrics.merma],
    ['Disponibilidad', latestMetrics.disponibilidad, metrics.disponibilidad],
    ['Asistencia', latestMetrics.asistencia, metrics.asistencia],
    ['Rechazo', latestMetrics.rechazo, metrics.rechazo],
    ['OEE', latestMetrics.oee, metrics.oee],
    ['OTIF', latestMetrics.otif, metrics.otif]
  ] : [];

  const content = document.getElementById('content');
  if (!content) return;

  content.innerHTML = `
    <main>
      <div class="titleRow">
        <div>
          <h1>Dashboard de Administración de Planta</h1>
          <p>Datos sincronizados con Supabase · ${rows.length} registros diarios · ${maintenanceRows.length} mantenimientos</p>
        </div>
        <span class="online">● EN LÍNEA</span>
      </div>

      ${renderAlerts()}

      <section class="panel">
        <h2>Seguridad: días sin accidente/incidente</h2>
        <p>Indicador calculado automáticamente a partir de los registros oficiales de SSOMA.</p>
        <div class="cards">
          <div class="card">
            <small>Días sin accidente/incidente</small>
            <strong>${diasSinAccidenteIncidente === null ? 'SIN DATOS' : diasSinAccidenteIncidente}</strong>
            <span class="badge ${diasSinAccidenteIncidente === null ? 'ok' : diasSinAccidenteIncidente === 0 ? 'critical' : 'ok'}">
              ${diasSinAccidenteIncidente === null ? 'SIN REGISTROS' : diasSinAccidenteIncidente === 0 ? 'EVENTO HOY' : 'EN CONTROL'}
            </span>
          </div>
          <div class="card">
            <small>Último accidente/incidente</small>
            <strong>${esc(ssomaStats.ultimaFecha || '—')}</strong>
          </div>
          <div class="card">
            <small>Total eventos SSOMA</small>
            <strong>${ssomaStats.totalEventos}</strong>
          </div>
        </div>
      </section>

      ${latest ? `
        <section class="panel">
          <h2>Último turno</h2>
          <p>${esc(latest.fecha)} · ${esc(latest.turno)} · ${esc(latest.producto || 'Sin producto')}</p>
          <span class="badge ok">REGISTRO MÁS RECIENTE</span>
          <div class="cards">
            <div class="card"><small>Cumplimiento</small><strong>${pct(latest.cumplimiento)}</strong><span class="badge ${status(latest.cumplimiento, metas.cumplimiento).cls}">${status(latest.cumplimiento, metas.cumplimiento).label}</span></div>
            <div class="card"><small>Yield</small><strong>${pct(latest.yieldRate)}</strong><span class="badge ${status(latest.yieldRate, metas.yield).cls}">${status(latest.yieldRate, metas.yield).label}</span></div>
            <div class="card"><small>Merma</small><strong>${pct(latest.merma)}</strong><span class="badge ${status(latest.merma, metas.merma, true).cls}">${status(latest.merma, metas.merma, true).label}</span></div>
            <div class="card"><small>Disponibilidad</small><strong>${pct(latest.disponibilidad)}</strong><span class="badge ${status(latest.disponibilidad, metas.disponibilidad).cls}">${status(latest.disponibilidad, metas.disponibilidad).label}</span></div>
            <div class="card"><small>Asistencia</small><strong>${pct(latest.asistencia)}</strong><span class="badge ${status(latest.asistencia, metas.asistencia).cls}">${status(latest.asistencia, metas.asistencia).label}</span></div>
            <div class="card"><small>Rechazo calidad</small><strong>${pct(latest.rechazo)}</strong><span class="badge ${status(latest.rechazo, metas.rechazo, true).cls}">${status(latest.rechazo, metas.rechazo, true).label}</span></div>
            <div class="card"><small>OEE</small><strong>${pct(latest.oee)}</strong><span class="badge ${status(latest.oee, 0.80).cls}">${status(latest.oee, 0.80).label}</span></div>
            <div class="card"><small>OTIF</small><strong>${pct(latest.otif)}</strong><span class="badge ${status(latest.otif, metas.otif).cls}">${status(latest.otif, metas.otif).label}</span></div>
          </div>
          <p><b>Producción del último turno:</b> ${n(latest.producida).toLocaleString()} de ${n(latest.programada).toLocaleString()} programados.</p>
        </section>
      ` : ''}

      <section class="panel">
        <h2>Indicadores acumulados de planta</h2>
        <p>Consolidado de todos los registros diarios.</p>
        <span class="badge ok">HISTÓRICO</span>
        <div class="cards">
          ${cards.map(c => `
            <div class="card">
              <small>${esc(c[0])}</small>
              <strong>${esc(c[1])}</strong>
              ${c.length > 2 ? `<span class="badge ${c[2].cls}">${c[2].label}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </section>

      ${comparison.length ? `
        <section class="panel">
          <h2>Comparativa: último turno vs histórico</h2>
          <div class="tableWrap">
            <table>
              <thead><tr><th>Indicador</th><th>Último turno</th><th>Histórico</th><th>Diferencia</th></tr></thead>
              <tbody>
                ${comparison.map(([name, last, hist]) => {
                  const diff = last === null || hist === null ? null : (last - hist) * 100;
                  return `<tr><td>${name}</td><td>${pct(last)}</td><td>${pct(hist)}</td><td>${diff === null ? '—' : (diff >= 0 ? '+' : '') + diff.toFixed(1) + ' pp'}</td></tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </section>
      ` : ''}

      <section class="panel">
        <h2>Tendencias de desempeño</h2>
        <p>Evolución de los principales KPI según los registros diarios.</p>
        <div class="cards">
          <div class="card"><small>Tendencia cumplimiento ${trendCum.arrow}</small><strong>${trendCum.label}</strong></div>
          <div class="card"><small>Tendencia Yield ${trendYield.arrow}</small><strong>${trendYield.label}</strong></div>
          <div class="card"><small>Tendencia OEE ${trendOee.arrow}</small><strong>${trendOee.label}</strong></div>
        </div>
        ${renderTrendChart(trend)}
      </section>

      <section class="panel">
        <h2>Indicadores generales</h2>
        <div class="cards">
          ${cards.slice(0, 8).map(c => `
            <div class="card"><small>${esc(c[0])}</small><strong>${esc(c[1])}</strong>${c.length > 2 ? `<span class="badge ${c[2].cls}">${c[2].label}</span>` : ''}</div>
          `).join('')}
        </div>
      </section>

      <section class="panel">
        <h2>Últimos registros</h2>
        ${metrics.d.length ? `
          <div class="tableWrap">
            <table>
              <thead><tr><th>Fecha</th><th>Turno</th><th>Producto</th><th>Programada</th><th>Producida</th><th>Merma</th><th>OEE</th><th>Acciones</th></tr></thead>
              <tbody>
                ${metrics.d.slice(-20).reverse().map(r => `
                  <tr>
                    <td>${esc(r.fecha)}</td><td>${esc(r.turno)}</td><td>${esc(r.producto)}</td>
                    <td>${n(r.programada).toLocaleString()}</td><td>${n(r.producida).toLocaleString()}</td>
                    <td>${pct(r.merma)}</td><td>${pct(r.oee)}</td>
                    <td><button type="button" data-delete-id="${esc(r.id)}">Eliminar</button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `<div class="empty">Todavía no hay registros. Ve a <b>Registro Diario</b> para ingresar el primero.</div>`}
      </section>
    </main>
  `;

  document.querySelectorAll('[data-delete-id]').forEach(button => {
    button.onclick = () => deleteRecord(button.dataset.deleteId);
  });
}
/* =========================================================
   ELIMINAR REGISTRO DIARIO
========================================================= */

async function deleteRecord(id) {
  if (!id) {
    alert('No se pudo identificar el registro.');
    return;
  }

  const row =
    rows.find(r => String(r.id) === String(id));

  const detail =
    row
      ? `${row.fecha} · ${row.turno} · ${row.producto || 'Sin producto'}`
      : 'este registro';

  if (
    !confirm(
      `¿Eliminar ${detail}?\n\nEsta acción no se puede deshacer.`
    )
  ) return;

  const { error } =
    await supabase
      .from('daily_records')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

  if (error) {
    alert('No se pudo eliminar:\n' + error.message);
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

  document.getElementById('content').innerHTML = `
    <main>
      <h1>Registro Diario</h1>
      <p>
        Ingresa los datos del turno.
        Los KPI se calculan automáticamente.
      </p>

      <form id="daily" class="formGrid">
        <section>
          <h2>Producción</h2>
          ${fields.slice(0, 7).map(f => control(f, r)).join('')}
        </section>

        <section>
          <h2>Operación y personal</h2>
          ${fields.slice(7, 12).map(f => control(f, r)).join('')}
        </section>

        <section>
          <h2>Costos y energía</h2>
          ${fields.slice(12, 15).map(f => control(f, r)).join('')}
        </section>

        <section>
          <h2>Despacho y datos complementarios</h2>
          <p><small>El indicador oficial de incidentes se obtiene del módulo SSOMA. Este campo diario se conserva como dato complementario histórico.</small></p>
          ${fields.slice(15).map(f => control(f, r)).join('')}
        </section>

        <div id="saveMsg" class="msg full"></div>

        <button class="primary full" type="submit">
          Guardar registro diario
        </button>
      </form>
    </main>
  `;

  document.getElementById('daily').onsubmit = async e => {
    e.preventDefault();

    const payload = {
      user_id: user.id
    };

    fields.forEach(([key, , type]) => {
      const el =
        document.getElementById('f_' + key);

      payload[key] =
        type === 'number'
          ? (el.value === '' ? null : n(el.value))
          : el.value;
    });

    msg('saveMsg', 'Guardando…');

    const { error } =
      await supabase
        .from('daily_records')
        .insert(payload);

    if (error) {
      msg('saveMsg', error.message);
      return;
    }

    msg(
      'saveMsg',
      'Registro guardado correctamente.'
    );

    await load();

    setTimeout(() => render(), 500);
  };
}

function control(f, r) {
  const [key, label, type] = f;

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
      <textarea id="f_${key}"></textarea>
    `;
  } else {
    input = `
      <input
        id="f_${key}"
        type="${type}"
        value="${esc(r[key])}"
        ${type === 'number' ? 'step="any"' : ''}
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
  const d = rows.map(derive);

  const sum = key =>
    d.reduce((s, r) => s + n(r[key]), 0);

  const programada = sum('programada');
  const producida = sum('producida');
  const mp = sum('mp');
  const merma = sum('merma');
  const horas = sum('horas_turno');
  const paradas = sum('horas_paradas');
  const personalProgramado = sum('personal_programado');
  const personalPresente = sum('personal_presente');
  const rechazadas = sum('rechazadas');
  const pedidos = sum('pedidos_programados');
  const pedidosTiempo = sum('pedidos_tiempo');
  const costo = sum('costo_produccion');
  const mantenimientoDiario = sum('costo_mantenimiento');

  const mantenimientoSupabase =
    maintenanceRows.reduce(
      (total, r) => total + n(r.costo),
      0
    );

  const mantenimiento =
    mantenimientoSupabase > 0
      ? mantenimientoSupabase
      : mantenimientoDiario;

  const energia = sum('energia');
  const reproceso = sum('reproceso');
  const noConformidades = sum('no_conformidades');

  const cumplimiento =
    programada > 0 ? producida / programada : null;

  const yieldRate =
    mp > 0 ? producida / mp : null;

  const mermaRate =
    mp > 0 ? merma / mp : null;

  const horasParadaMantenimiento =
    maintenanceRows.reduce(
      (total, r) => total + n(r.horas_parada),
      0
    );

  const paradasFinal =
    horasParadaMantenimiento > 0
      ? horasParadaMantenimiento
      : paradas;

  const disponibilidad =
    horas > 0
      ? Math.max(0, (horas - paradasFinal) / horas)
      : null;

  const asistencia =
    personalProgramado > 0
      ? personalPresente / personalProgramado
      : null;

  const rechazo =
    producida > 0
      ? rechazadas / producida
      : null;

  const otif =
    pedidos > 0
      ? pedidosTiempo / pedidos
      : null;

  const oee =
    disponibilidad !== null &&
    cumplimiento !== null &&
    rechazo !== null
      ? disponibilidad *
        cumplimiento *
        Math.max(0, 1 - rechazo)
      : null;

  const costoUnitario =
    producida > 0 ? costo / producida : null;

  const energiaUnit =
    producida > 0 ? energia / producida : null;

  const kpis = [
    ['Cumplimiento', pct(cumplimiento), status(cumplimiento, metas.cumplimiento)],
    ['Yield', pct(yieldRate), status(yieldRate, metas.yield)],
    ['Merma', pct(mermaRate), status(mermaRate, metas.merma, true)],
    ['Disponibilidad', pct(disponibilidad), status(disponibilidad, metas.disponibilidad)],
    ['Asistencia', pct(asistencia), status(asistencia, metas.asistencia)],
    ['Rechazo', pct(rechazo), status(rechazo, metas.rechazo, true)],
    ['OEE', pct(oee), status(oee, 0.80)],
    ['OTIF', pct(otif), status(otif, metas.otif)]
  ];

  document.getElementById('content').innerHTML = `
    <main>
      <h1>Resumen Ejecutivo</h1>
      <p>Visión consolidada del desempeño de la planta.</p>

      <section class="panel">
        <h2>Indicadores principales</h2>

        <div class="cards">
          ${kpis.map(k => `
            <div class="card">
              <small>${k[0]}</small>
              <strong>${k[1]}</strong>
              <span class="badge ${k[2].cls}">
                ${k[2].label}
              </span>
            </div>
          `).join('')}
        </div>
      </section>

      <section class="panel">
        <h2>Producción</h2>

        <div class="cards">
          <div class="card">
            <small>Producción programada</small>
            <strong>${programada.toLocaleString()}</strong>
          </div>

          <div class="card">
            <small>Producción real</small>
            <strong>${producida.toLocaleString()}</strong>
          </div>

          <div class="card">
            <small>Materia prima consumida</small>
            <strong>${mp.toLocaleString()}</strong>
          </div>

          <div class="card">
            <small>Merma</small>
            <strong>${merma.toLocaleString()}</strong>
          </div>

          <div class="card">
            <small>Horas de turno</small>
            <strong>${horas.toFixed(1)}</strong>
          </div>

          <div class="card">
            <small>Horas de parada</small>
            <strong>${paradasFinal.toFixed(2)}</strong>
          </div>
        </div>
      </section>

      <section class="panel">
        <h2>Costos y eficiencia</h2>

        <div class="cards">
          <div class="card">
            <small>Costo producción</small>
            <strong>S/ ${costo.toLocaleString()}</strong>
          </div>

          <div class="card">
            <small>Costo mantenimiento</small>
            <strong>S/ ${mantenimiento.toLocaleString()}</strong>
          </div>

          <div class="card">
            <small>Costo unitario</small>
            <strong>
              ${
                costoUnitario === null
                  ? '—'
                  : 'S/ ' + costoUnitario.toFixed(3)
              }
            </strong>
          </div>

          <div class="card">
            <small>Energía total</small>
            <strong>${energia.toLocaleString()} kWh</strong>
          </div>

          <div class="card">
            <small>Energía por unidad</small>
            <strong>
              ${
                energiaUnit === null
                  ? '—'
                  : energiaUnit.toFixed(3) + ' kWh/unidad'
              }
            </strong>
          </div>
        </div>
      </section>

      <section class="panel">
        <h2>Mantenimiento</h2>

        <div class="cards">
          <div class="card">
            <small>Mantenimientos registrados</small>
            <strong>${maintenanceRows.length}</strong>
          </div>

          <div class="card">
            <small>Programados</small>
            <strong>
              ${maintenanceRows.filter(r =>
                String(r.estado || '').toLowerCase() === 'programado'
              ).length}
            </strong>
          </div>

          <div class="card">
            <small>Abiertos / En proceso</small>
            <strong>
              ${maintenanceRows.filter(r => {
                const estado = String(r.estado || '').toLowerCase();
                return estado === 'abierto' || estado === 'en proceso';
              }).length}
            </strong>
          </div>

          <div class="card">
            <small>Cerrados</small>
            <strong>
              ${maintenanceRows.filter(r =>
                String(r.estado || '').toLowerCase() === 'cerrado'
              ).length}
            </strong>
          </div>

          <div class="card">
            <small>Horas de parada</small>
            <strong>${horasParadaMantenimiento.toFixed(2)} h</strong>
          </div>
        </div>
      </section>

      <section class="panel">
        <h2>Calidad, personal y despacho</h2>

        <div class="cards">
          <div class="card">
            <small>Personal programado</small>
            <strong>${personalProgramado}</strong>
          </div>

          <div class="card">
            <small>Personal presente</small>
            <strong>${personalPresente}</strong>
          </div>

          <div class="card">
            <small>Unidades rechazadas</small>
            <strong>${rechazadas}</strong>
          </div>

          <div class="card">
            <small>Reproceso</small>
            <strong>${reproceso}</strong>
          </div>

          <div class="card">
            <small>No conformidades</small>
            <strong>${noConformidades}</strong>
          </div>

          <div class="card">
            <small>Pedidos programados</small>
            <strong>${pedidos}</strong>
          </div>

          <div class="card">
            <small>Pedidos a tiempo</small>
            <strong>${pedidosTiempo}</strong>
          </div>

          <div class="card">
            <small>Incidentes SSOMA</small>
            <strong>${ssomaRows.length}</strong>
          </div>
        </div>
      </section>
    </main>
  `;
}


/* =========================================================
   COSTOS Y ENERGÍA V1
   No requiere SQL nuevo.
   Usa daily_records y maintenance existentes.
========================================================= */

function costEnergyMetrics(data = rows) {
  const d = (Array.isArray(data) ? data : []).map(derive);
  const sum = key => d.reduce((t, r) => t + n(r[key]), 0);

  const produccion = sum('producida');
  const costoProduccion = sum('costo_produccion');
  const costoMantenimientoDiario = sum('costo_mantenimiento');
  const energia = sum('energia');

  const costoMantenimientoTabla = Array.isArray(maintenanceRows)
    ? maintenanceRows.reduce((t, r) => t + n(r.costo), 0)
    : 0;

  const costoMantenimiento = costoMantenimientoTabla > 0
    ? costoMantenimientoTabla
    : costoMantenimientoDiario;

  const costoTotal = costoProduccion + costoMantenimiento;

  return {
    produccion,
    costoProduccion,
    costoMantenimiento,
    costoTotal,
    energia,
    costoUnitario: produccion > 0 ? costoProduccion / produccion : null,
    costoTotalUnitario: produccion > 0 ? costoTotal / produccion : null,
    mantenimientoUnitario: produccion > 0 ? costoMantenimiento / produccion : null,
    energiaUnit: produccion > 0 ? energia / produccion : null
  };
}

function costEnergyByDate() {
  const grouped = {};
  const useMaintenanceTable = maintenanceRows.some(r => n(r.costo) > 0);

  rows.forEach(r => {
    const fecha = r.fecha || 'Sin fecha';
    if (!grouped[fecha]) {
      grouped[fecha] = {
        fecha,
        producida: 0,
        costoProduccion: 0,
        costoMantenimiento: 0,
        energia: 0
      };
    }
    grouped[fecha].producida += n(r.producida);
    grouped[fecha].costoProduccion += n(r.costo_produccion);
    grouped[fecha].energia += n(r.energia);
    if (!useMaintenanceTable) {
      grouped[fecha].costoMantenimiento += n(r.costo_mantenimiento);
    }
  });

  if (useMaintenanceTable) {
    maintenanceRows.forEach(r => {
      const fecha = r.fecha || 'Sin fecha';
      if (!grouped[fecha]) {
        grouped[fecha] = {
          fecha,
          producida: 0,
          costoProduccion: 0,
          costoMantenimiento: 0,
          energia: 0
        };
      }
      grouped[fecha].costoMantenimiento += n(r.costo);
    });
  }

  return Object.values(grouped)
    .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))
    .map(r => ({
      ...r,
      costoTotal: r.costoProduccion + r.costoMantenimiento,
      costoUnitario: r.producida > 0 ? r.costoProduccion / r.producida : null,
      costoTotalUnitario: r.producida > 0
        ? (r.costoProduccion + r.costoMantenimiento) / r.producida
        : null,
      energiaUnit: r.producida > 0 ? r.energia / r.producida : null
    }));
}

function costEnergyTrendClass(values, lowerIsBetter = false) {
  const clean = values.filter(v => v !== null && Number.isFinite(v));
  if (clean.length < 2) return { arrow: '→', label: 'SIN DATOS', cls: 'ok' };
  const delta = clean[clean.length - 1] - clean[0];
  if (Math.abs(delta) < 0.005) return { arrow: '→', label: 'ESTABLE', cls: 'ok' };
  const better = lowerIsBetter ? delta < 0 : delta > 0;
  return better
    ? { arrow: '↑', label: 'MEJORANDO', cls: 'ok' }
    : { arrow: '↓', label: 'EMPEORANDO', cls: 'warn' };
}

function renderCostEnergyTable(data) {
  if (!data.length) {
    return `<div class="empty">Todavía no hay datos de costos o energía.</div>`;
  }

  return `
    <div class="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Producción</th>
            <th>Costo producción</th>
            <th>Mantenimiento</th>
            <th>Costo total</th>
            <th>Costo/unidad</th>
            <th>Energía</th>
            <th>kWh/unidad</th>
          </tr>
        </thead>
        <tbody>
          ${data.slice().reverse().map(r => `
            <tr>
              <td>${esc(r.fecha)}</td>
              <td>${n(r.producida).toLocaleString()}</td>
              <td>S/ ${n(r.costoProduccion).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
              <td>S/ ${n(r.costoMantenimiento).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
              <td><strong>S/ ${n(r.costoTotal).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></td>
              <td>${r.costoTotalUnitario === null ? '—' : 'S/ ' + r.costoTotalUnitario.toFixed(3)}</td>
              <td>${n(r.energia).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} kWh</td>
              <td>${r.energiaUnit === null ? '—' : r.energiaUnit.toFixed(3) + ' kWh/unidad'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderCostEnergyChart(data) {
  if (!data.length) {
    return `<div class="empty">Ingresa registros diarios para visualizar la evolución.</div>`;
  }

  const W = 1000, H = 340, left = 70, right = 25, top = 25, bottom = 55;
  const plotW = W - left - right, plotH = H - top - bottom;
  const max = Math.max(...data.flatMap(r => [n(r.costoTotal), n(r.energia)]), 1);
  const x = i => data.length === 1 ? left + plotW / 2 : left + i * plotW / (data.length - 1);
  const y = v => top + plotH - (n(v) / max) * plotH;

  const grid = [0, .25, .5, .75, 1].map(p => {
    const yy = y(max * p);
    return `<line x1="${left}" y1="${yy}" x2="${W-right}" y2="${yy}" stroke="currentColor" opacity=".12"/><text x="${left-8}" y="${yy+4}" text-anchor="end" font-size="11" fill="currentColor" opacity=".7">${(max*p).toFixed(0)}</text>`;
  }).join('');

  const path = key => data.map((r,i) => `${x(i).toFixed(1)},${y(r[key]).toFixed(1)}`).join(' ');
  const points = key => data.map((r,i) => `<circle cx="${x(i)}" cy="${y(r[key])}" r="4" fill="currentColor"/>`).join('');
  const labels = data.map((r,i) => {
    const show = data.length <= 8 || i === 0 || i === data.length-1 || i % Math.ceil(data.length/8) === 0;
    return show ? `<text x="${x(i)}" y="${H-18}" text-anchor="middle" font-size="10" fill="currentColor" opacity=".7">${esc(r.fecha)}</text>` : '';
  }).join('');

  return `
    <div class="trendLegend">
      <span><i style="background:#5eead4"></i>Costo total</span>
      <span><i style="background:#c084fc"></i>Energía</span>
    </div>
    <div style="width:100%;overflow-x:auto;">
      <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Evolución de costos y energía">
        ${grid}
        <g style="color:#5eead4"><polyline points="${path('costoTotal')}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${points('costoTotal')}</g>
        <g style="color:#c084fc"><polyline points="${path('energia')}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${points('energia')}</g>
        ${labels}
      </svg>
    </div>
  `;
}

function renderCostosEnergia() {
  const m = costEnergyMetrics();
  const data = costEnergyByDate();
  const last = data.length ? data[data.length - 1] : null;
  const previous = data.length > 1 ? data[data.length - 2] : null;

  const variation = (a,b) => a !== null && b !== null && b > 0 ? (a-b)/b : null;
  const costoVar = last && previous ? variation(last.costoTotal, previous.costoTotal) : null;
  const costoUnitVar = last && previous ? variation(last.costoTotalUnitario, previous.costoTotalUnitario) : null;
  const energiaVar = last && previous ? variation(last.energia, previous.energia) : null;
  const energiaUnitVar = last && previous ? variation(last.energiaUnit, previous.energiaUnit) : null;

  const alerts = [];
  if (costoVar !== null && costoVar > .15) alerts.push(['warn','Costo total','Aumentó más de 15% respecto al período anterior.']);
  if (costoUnitVar !== null && costoUnitVar > .15) alerts.push(['critical','Costo por unidad','Aumentó más de 15% respecto al período anterior.']);
  if (energiaVar !== null && energiaVar > .15) alerts.push(['warn','Energía total','Aumentó más de 15% respecto al período anterior.']);
  if (energiaUnitVar !== null && energiaUnitVar > .15) alerts.push(['warn','kWh por unidad','Aumentó más de 15% respecto al período anterior.']);

  document.getElementById('content').innerHTML = `
    <main>
      <div class="titleRow">
        <div>
          <h1>Costos y Energía</h1>
          <p>Control económico y energético de la planta · V1</p>
        </div>
        <span class="online">● EN LÍNEA</span>
      </div>

      ${alerts.length ? `
        <section class="panel">
          <div class="titleRow"><div><h2>⚠️ Alertas de Costos y Energía</h2><p>Comparación automática contra el período anterior.</p></div><span class="badge warn">${alerts.length} REVISIÓN${alerts.length>1?'ES':''}</span></div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${alerts.map(a => `<div style="padding:12px;border:1px solid #ddd;border-radius:10px;"><span class="badge ${a[0]}">${a[0]==='critical'?'PRIORIDAD':'REVISAR'}</span> <strong>${esc(a[1])}</strong><div><small>${esc(a[2])}</small></div></div>`).join('')}
          </div>
        </section>
      ` : `
        <section class="panel">
          <div class="titleRow"><div><h2>Control económico y energético</h2><p>No se detectan aumentos superiores al 15% frente al período anterior.</p></div><span class="badge ok">OK</span></div>
        </section>
      `}

      <section class="panel">
        <h2>Resumen económico</h2>
        <div class="cards">
          <div class="card"><small>Producción acumulada</small><strong>${m.produccion.toLocaleString()}</strong><span>unidades</span></div>
          <div class="card"><small>Costo producción</small><strong>S/ ${m.costoProduccion.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></div>
          <div class="card"><small>Costo mantenimiento</small><strong>S/ ${m.costoMantenimiento.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></div>
          <div class="card"><small>Costo total</small><strong>S/ ${m.costoTotal.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></div>
          <div class="card"><small>Costo producción / unidad</small><strong>${m.costoUnitario === null ? '—' : 'S/ '+m.costoUnitario.toFixed(3)}</strong></div>
          <div class="card"><small>Costo total / unidad</small><strong>${m.costoTotalUnitario === null ? '—' : 'S/ '+m.costoTotalUnitario.toFixed(3)}</strong></div>
          <div class="card"><small>Mantenimiento / unidad</small><strong>${m.mantenimientoUnitario === null ? '—' : 'S/ '+m.mantenimientoUnitario.toFixed(3)}</strong></div>
        </div>
      </section>

      <section class="panel">
        <h2>Consumo energético</h2>
        <div class="cards">
          <div class="card"><small>Energía total</small><strong>${m.energia.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</strong><span>kWh</span></div>
          <div class="card"><small>Energía por unidad</small><strong>${m.energiaUnit === null ? '—' : m.energiaUnit.toFixed(3)}</strong><span>kWh/unidad</span></div>
          <div class="card"><small>Mantenimientos registrados</small><strong>${maintenanceRows.length}</strong></div>
          <div class="card"><small>Horas de parada</small><strong>${maintenanceRows.reduce((t,r)=>t+n(r.horas_parada),0).toFixed(2)}</strong><span>horas</span></div>
        </div>
      </section>

      <section class="panel">
        <h2>Evolución de costos y energía</h2>
        <p>Comparación por fecha de los registros existentes.</p>
        ${renderCostEnergyChart(data)}
      </section>

      ${last ? `
        <section class="panel">
          <h2>Último período registrado</h2>
          <div class="cards">
            <div class="card"><small>Fecha</small><strong>${esc(last.fecha)}</strong></div>
            <div class="card"><small>Producción</small><strong>${n(last.producida).toLocaleString()}</strong></div>
            <div class="card"><small>Costo total</small><strong>S/ ${n(last.costoTotal).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></div>
            <div class="card"><small>Costo total / unidad</small><strong>${last.costoTotalUnitario===null?'—':'S/ '+last.costoTotalUnitario.toFixed(3)}</strong></div>
            <div class="card"><small>Energía</small><strong>${n(last.energia).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} kWh</strong></div>
            <div class="card"><small>kWh / unidad</small><strong>${last.energiaUnit===null?'—':last.energiaUnit.toFixed(3)+' kWh/unidad'}</strong></div>
          </div>
        </section>
      ` : ''}

      <section class="panel">
        <h2>Detalle histórico</h2>
        <p>Consolidado de costos y energía por fecha.</p>
        ${renderCostEnergyTable(data)}
      </section>

      <section class="panel">
        <h2>Interpretación QUIMFLUX V1</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;">
          <div style="border:1px solid #ddd;border-radius:10px;padding:14px;"><strong>Costo total / unidad</strong><p>Combina costo de producción y mantenimiento para conocer el costo económico acumulado por unidad producida.</p></div>
          <div style="border:1px solid #ddd;border-radius:10px;padding:14px;"><strong>kWh / unidad</strong><p>Permite comparar el consumo energético independientemente del volumen producido.</p></div>
          <div style="border:1px solid #ddd;border-radius:10px;padding:14px;"><strong>Variación &gt; 15%</strong><p>Genera una alerta de revisión frente al período inmediatamente anterior.</p></div>
          <div style="border:1px solid #ddd;border-radius:10px;padding:14px;"><strong>Sin SQL nuevo</strong><p>Esta versión utiliza exclusivamente las columnas que ya maneja QUIMFLUX.</p></div>
        </div>
      </section>
    </main>
  `;
}

/* =========================================================
   MANTENIMIENTO
========================================================= */

function renderMaintenance() {
  const total = maintenanceRows.length;

  const programados =
    maintenanceRows.filter(
      r => String(r.estado || '').toLowerCase() === 'programado'
    ).length;

  const pendientes =
    maintenanceRows.filter(r => {
      const estado =
        String(r.estado || '').toLowerCase();

      return estado === 'abierto' || estado === 'en proceso';
    }).length;

  const cerrados =
    maintenanceRows.filter(
      r => String(r.estado || '').toLowerCase() === 'cerrado'
    ).length;

  const horasParada =
    maintenanceRows.reduce(
      (total, r) => total + n(r.horas_parada),
      0
    );

  const costoTotal =
    maintenanceRows.reduce(
      (total, r) => total + n(r.costo),
      0
    );

  document.getElementById('content').innerHTML = `
    <main>
      <div class="titleRow">
        <div>
          <h1>Gestión de Mantenimiento</h1>
          <p>
            Registro, seguimiento y control del mantenimiento
            de equipos de la planta.
          </p>
        </div>

        <span class="online">● EN LÍNEA</span>
      </div>

      <div class="cards">
        <div class="card">
          <small>Mantenimientos registrados</small>
          <strong>${total}</strong>
        </div>

        <div class="card">
          <small>Programados</small>
          <strong>${programados}</strong>
          <span class="badge ok">PROGRAMADO</span>
        </div>

        <div class="card">
          <small>Abiertos / En proceso</small>
          <strong>${pendientes}</strong>
          <span class="badge ${pendientes ? 'warn' : 'ok'}">
            ${pendientes ? 'PENDIENTE' : 'OK'}
          </span>
        </div>

        <div class="card">
          <small>Cerrados</small>
          <strong>${cerrados}</strong>
        </div>

        <div class="card">
          <small>Horas de parada</small>
          <strong>${horasParada.toFixed(2)} horas</strong>
        </div>

        <div class="card">
          <small>Costo total</small>
          <strong>S/ ${costoTotal.toFixed(2)}</strong>
        </div>
      </div>

      <section class="panel">
        <h2>
          ${editingMaintenanceId ? 'Editar mantenimiento' : 'Registrar mantenimiento'}
        </h2>

        <form id="maintenanceForm" class="formGrid">
          <section>
            <h2>Identificación</h2>

            <label>
              Fecha
              <input id="mt_fecha" type="date" value="${today}" required>
            </label>

            <label>
              Equipo
              <input id="mt_equipo" type="text"
                placeholder="Ej. Mezclador principal" required>
            </label>

            <label>
              Código de equipo
              <input id="mt_codigo_equipo" type="text"
                placeholder="Ej. EQ-001">
            </label>

            <label>
              Tipo
              <select id="mt_tipo" required>
                <option>Preventivo</option>
                <option>Correctivo</option>
                <option>Predictivo</option>
                <option>Inspección</option>
                <option>Emergencia</option>
                <option>Otro</option>
              </select>
            </label>

            <label>
              Causa
              <input id="mt_causa" type="text"
                placeholder="Ej. Desgaste de rodamiento">
            </label>
          </section>

          <section>
            <h2>Intervención</h2>

            <label>
              Descripción
              <textarea id="mt_descripcion"
                placeholder="Describe el mantenimiento realizado o requerido."
                required></textarea>
            </label>

            <label>
              Horas de parada
              <input id="mt_horas_parada" type="number"
                step="0.01" min="0" value="0">
            </label>

            <label>
              Costo (S/)
              <input id="mt_costo" type="number"
                step="0.01" min="0" value="0">
            </label>

            <label>
              Responsable
              <input id="mt_responsable" type="text"
                placeholder="Técnico responsable">
            </label>
          </section>

          <section>
            <h2>Programación y estado</h2>

            <label>
              Estado
              <select id="mt_estado" required>
                <option>Programado</option>
                <option>Abierto</option>
                <option>En proceso</option>
                <option>Cerrado</option>
                <option>Cancelado</option>
              </select>
            </label>

            <label>
              Fecha programada
              <input id="mt_fecha_programada" type="date">
            </label>

            <label>
              Fecha de cierre
              <input id="mt_fecha_cierre" type="date">
            </label>

            <label>
              Observaciones
              <textarea id="mt_observaciones"
                placeholder="Información adicional..."></textarea>
            </label>
          </section>

          <div id="maintenanceMsg" class="msg full"></div>

          <div class="full" style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="primary" type="submit">
              ${editingMaintenanceId ? 'Actualizar mantenimiento' : 'Guardar mantenimiento'}
            </button>

            ${
              editingMaintenanceId
                ? `<button id="cancelMaintenance" type="button">
                     Cancelar edición
                   </button>`
                : ''
            }
          </div>
        </form>
      </section>

      <section class="panel">
        <h2>Mantenimientos registrados</h2>

        ${
          maintenanceRows.length
            ? `
              <div class="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Equipo</th>
                      <th>Tipo</th>
                      <th>Horas parada</th>
                      <th>Causa</th>
                      <th>Costo</th>
                      <th>Responsable</th>
                      <th>Estado</th>
                      <th>Próximo</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    ${maintenanceRows.map(r => `
                      <tr>
                        <td>${esc(r.fecha)}</td>

                        <td>
                          <strong>${esc(r.equipo)}</strong>
                          ${
                            r.codigo_equipo
                              ? `<br><small>${esc(r.codigo_equipo)}</small>`
                              : ''
                          }
                        </td>

                        <td>${esc(r.tipo)}</td>
                        <td>${n(r.horas_parada).toFixed(2)}</td>
                        <td>${esc(r.causa || '')}</td>
                        <td>S/ ${n(r.costo).toFixed(2)}</td>
                        <td>${esc(r.responsable || '')}</td>

                        <td>
                          <span class="badge ${
                            String(r.estado || '').toLowerCase() === 'cerrado'
                              ? 'ok'
                              : String(r.estado || '').toLowerCase() === 'cancelado'
                                ? 'critical'
                                : String(r.estado || '').toLowerCase() === 'programado'
                                  ? 'ok'
                                  : 'warn'
                          }">
                            ${esc(r.estado)}
                          </span>
                        </td>

                        <td>${esc(r.fecha_programada || '')}</td>

                        <td>
                          <button type="button"
                            data-edit-maintenance="${esc(r.id)}">
                            Editar
                          </button>

                          <button type="button"
                            data-delete-maintenance="${esc(r.id)}">
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `
            : `
              <div class="empty">
                Todavía no hay mantenimientos registrados.
              </div>
            `
        }
      </section>
    </main>
  `;

  document.getElementById('maintenanceForm').onsubmit =
    saveMaintenance;

  document
    .querySelectorAll('[data-edit-maintenance]')
    .forEach(button => {
      button.onclick = () =>
        editMaintenance(button.dataset.editMaintenance);
    });

  document
    .querySelectorAll('[data-delete-maintenance]')
    .forEach(button => {
      button.onclick = () =>
        deleteMaintenance(button.dataset.deleteMaintenance);
    });

  document.getElementById('cancelMaintenance')
    ?.addEventListener('click', () => {
      editingMaintenanceId = null;
      renderMaintenance();
    });
}

async function saveMaintenance(e) {
  e.preventDefault();

  const payload = {
    user_id: user.id,
    fecha: document.getElementById('mt_fecha').value,
    equipo: document.getElementById('mt_equipo').value.trim(),
    codigo_equipo:
      document.getElementById('mt_codigo_equipo').value.trim() || null,
    tipo: document.getElementById('mt_tipo').value,
    causa:
      document.getElementById('mt_causa').value.trim() || null,
    descripcion:
      document.getElementById('mt_descripcion').value.trim(),
    horas_parada:
      n(document.getElementById('mt_horas_parada').value),
    costo:
      n(document.getElementById('mt_costo').value),
    responsable:
      document.getElementById('mt_responsable').value.trim() || null,
    estado:
      document.getElementById('mt_estado').value,
    fecha_programada:
      document.getElementById('mt_fecha_programada').value || null,
    fecha_cierre:
      document.getElementById('mt_fecha_cierre').value || null,
    observaciones:
      document.getElementById('mt_observaciones').value.trim() || null
  };

  if (!payload.fecha) {
    msg('maintenanceMsg', 'Debes ingresar la fecha.');
    return;
  }

  if (!payload.equipo) {
    msg('maintenanceMsg', 'Debes ingresar el equipo.');
    return;
  }

  if (!payload.descripcion) {
    msg('maintenanceMsg', 'Debes ingresar la descripción.');
    return;
  }

  if (payload.horas_parada < 0) {
    msg(
      'maintenanceMsg',
      'Las horas de parada no pueden ser negativas.'
    );
    return;
  }

  if (payload.costo < 0) {
    msg(
      'maintenanceMsg',
      'El costo no puede ser negativo.'
    );
    return;
  }

  msg('maintenanceMsg', 'Guardando mantenimiento…');

  let result;

  if (editingMaintenanceId) {
    result =
      await supabase
        .from('maintenance')
        .update(payload)
        .eq('id', editingMaintenanceId)
        .eq('user_id', user.id);
  } else {
    result =
      await supabase
        .from('maintenance')
        .insert(payload);
  }

  if (result.error) {
    msg(
      'maintenanceMsg',
      'Error: ' + result.error.message
    );
    return;
  }

  editingMaintenanceId = null;

  await loadMaintenance();
  renderMaintenance();
}

function editMaintenance(id) {
  const row =
    maintenanceRows.find(
      r => String(r.id) === String(id)
    );

  if (!row) {
    alert('No se encontró el mantenimiento.');
    return;
  }

  editingMaintenanceId = row.id;
  renderMaintenance();

  document.getElementById('mt_fecha').value =
    row.fecha || today;

  document.getElementById('mt_equipo').value =
    row.equipo || '';

  document.getElementById('mt_codigo_equipo').value =
    row.codigo_equipo || '';

  document.getElementById('mt_tipo').value =
    row.tipo || 'Preventivo';

  document.getElementById('mt_causa').value =
    row.causa || '';

  document.getElementById('mt_descripcion').value =
    row.descripcion || '';

  document.getElementById('mt_horas_parada').value =
    n(row.horas_parada);

  document.getElementById('mt_costo').value =
    n(row.costo);

  document.getElementById('mt_responsable').value =
    row.responsable || '';

  document.getElementById('mt_estado').value =
    row.estado || 'Abierto';

  document.getElementById('mt_fecha_programada').value =
    row.fecha_programada || '';

  document.getElementById('mt_fecha_cierre').value =
    row.fecha_cierre || '';

  document.getElementById('mt_observaciones').value =
    row.observaciones || '';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteMaintenance(id) {
  const row =
    maintenanceRows.find(
      r => String(r.id) === String(id)
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
      .eq('id', id)
      .eq('user_id', user.id);

  if (error) {
    alert('No se pudo eliminar:\n' + error.message);
    return;
  }

  await loadMaintenance();
  renderMaintenance();
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

  if (inventoryView === 'consulta') {
    renderInventoryConsulta();
    return;
  }

  document.getElementById('content').innerHTML = `
    <main>
      <div class="titleRow">
        <div>
          <h1>Control de Inventario</h1>
          <p>
            Registra entradas, salidas y stock
            de materiales y productos.
          </p>
        </div>

        <button id="openInventoryConsulta" type="button">
          🔎 Consultar inventario
        </button>
      </div>

      <div class="cards">
        <div class="card">
          <small>Ítems registrados</small>
          <strong>${inventoryRows.length}</strong>
        </div>

        <div class="card">
          <small>Stock bajo</small>
          <strong>${lowStock}</strong>
          <span class="badge ${lowStock ? 'critical' : 'ok'}">
            ${lowStock ? 'REVISAR' : 'OK'}
          </span>
        </div>
      </div>

      <section class="panel">
        <h2>
          ${editingInventoryId ? 'Editar inventario' : 'Registrar inventario'}
        </h2>

        <form id="inventoryForm" class="formGrid">
          <section>
            <h2>Identificación</h2>

            <label>
              Fecha
              <input id="inv_fecha" type="date"
                value="${today}" required>
            </label>

            <label>
              Código
              <input id="inv_codigo" type="text"
                placeholder="Ej. MP-001">
            </label>

            <label>
              Material / Producto
              <input id="inv_material" type="text" required>
            </label>

            <label>
              Categoría
              <select id="inv_categoria">
                <option value="">Seleccionar</option>
                <option>Materia prima</option>
                <option>Producto terminado</option>
                <option>Insumo</option>
                <option>Repuesto</option>
                <option>Envase / embalaje</option>
                <option>Otro</option>
              </select>
            </label>

            <label>
              Unidad
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
            <h2>Movimiento</h2>

            <label>
              Stock inicial
              <input id="inv_stock_inicial" type="number"
                step="any" min="0" value="0">
            </label>

            <label>
              Entradas
              <input id="inv_entradas" type="number"
                step="any" min="0" value="0">
            </label>

            <label>
              Salidas
              <input id="inv_salidas" type="number"
                step="any" min="0" value="0">
            </label>

            <label>
              Stock mínimo
              <input id="inv_stock_minimo" type="number"
                step="any" min="0" value="0">
            </label>

            <div class="panel">
              <small>STOCK ACTUAL</small>
              <strong id="inv_stock_actual"
                style="display:block;font-size:28px;margin-top:8px;">
                0
              </strong>
            </div>
          </section>

          <section>
            <h2>Observaciones</h2>

            <label>
              <textarea id="inv_observaciones"
                placeholder="Detalle..."></textarea>
            </label>
          </section>

          <div id="inventoryMsg" class="msg full"></div>

          <div class="full">
            <button class="primary" type="submit">
              ${editingInventoryId ? 'Actualizar inventario' : 'Guardar inventario'}
            </button>

            ${
              editingInventoryId
                ? `<button id="cancelInventory" type="button">
                     Cancelar
                   </button>`
                : ''
            }
          </div>
        </form>
      </section>

      <section class="panel">
        <div class="titleRow">
          <div>
            <h2>Inventario registrado</h2>
            <p>Vista rápida de los registros más recientes.</p>
          </div>

          <button id="openInventoryConsulta2" type="button">
            Ver todo / Buscar
          </button>
        </div>

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
                    ${inventoryRows.slice(0, 20).map(r => {
                      const stock =
                        n(r.stock_inicial) +
                        n(r.entradas) -
                        n(r.salidas);

                      const low =
                        n(r.stock_minimo) > 0 &&
                        stock <= n(r.stock_minimo);

                      return `
                        <tr>
                          <td>${esc(r.fecha)}</td>
                          <td>${esc(r.codigo || '')}</td>
                          <td>${esc(r.material)}</td>
                          <td>${esc(r.categoria || '')}</td>
                          <td>${esc(r.unidad)}</td>
                          <td>${n(r.stock_inicial)}</td>
                          <td>${n(r.entradas)}</td>
                          <td>${n(r.salidas)}</td>
                          <td><strong>${stock}</strong></td>
                          <td>${n(r.stock_minimo)}</td>

                          <td>
                            <span class="badge ${low ? 'critical' : 'ok'}">
                              ${low ? 'STOCK BAJO' : 'OK'}
                            </span>
                          </td>

                          <td style="white-space:nowrap;">
                            <button type="button" data-edit-inventory="${esc(r.id)}">
                              Editar
                            </button>

                            <button type="button" data-delete-inventory="${esc(r.id)}">
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      `;
                    }).join('')}
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

  document.getElementById('inventoryForm').onsubmit =
    saveInventory;

  document.getElementById('openInventoryConsulta')?.addEventListener(
    'click',
    () => {
      inventoryView = 'consulta';
      renderInventory();
    }
  );

  document.getElementById('openInventoryConsulta2')?.addEventListener(
    'click',
    () => {
      inventoryView = 'consulta';
      renderInventory();
    }
  );

  document
    .querySelectorAll('[data-edit-inventory]')
    .forEach(button => {
      button.onclick = () =>
        editInventory(button.dataset.editInventory);
    });

  document
    .querySelectorAll('[data-delete-inventory]')
    .forEach(button => {
      button.onclick = () =>
        deleteInventory(button.dataset.deleteInventory);
    });

  document.getElementById('cancelInventory')
    ?.addEventListener('click', () => {
      editingInventoryId = null;
      renderInventory();
    });
}

function renderInventoryConsulta() {
  const query = String(inventorySearch || '').trim().toLowerCase();

  const filtered = inventoryRows.filter(r => {
    if (!query) return true;

    const values = {
      todos: [
        r.codigo,
        r.material,
        r.categoria,
        r.unidad,
        r.fecha,
        r.observaciones
      ],
      codigo: [r.codigo],
      material: [r.material],
      categoria: [r.categoria],
      unidad: [r.unidad]
    };

    return (values[inventorySearchField] || values.todos)
      .some(value =>
        String(value ?? '').toLowerCase().includes(query)
      );
  });

  document.getElementById('content').innerHTML = `
    <main>
      <div class="titleRow">
        <div>
          <h1>Consulta de Inventario</h1>
          <p>
            Consulta todos los ítems registrados sin afectar
            el formulario de registro.
          </p>
        </div>

        <button id="backInventoryRegister" type="button">
          ← Volver a registrar
        </button>
      </div>

      <section class="panel">
        <h2>Buscar inventario</h2>

        <div style="
          display:grid;
          grid-template-columns:minmax(180px, 220px) 1fr auto;
          gap:10px;
          align-items:end;
        ">
          <label>
            Buscar por
            <select id="inventorySearchField">
              <option value="todos">Todos</option>
              <option value="codigo">Código</option>
              <option value="material">Material / Producto</option>
              <option value="categoria">Categoría</option>
              <option value="unidad">Unidad</option>
            </select>
          </label>

          <label>
            Texto de búsqueda
            <input
              id="inventorySearchInput"
              type="search"
              placeholder="Escribe para buscar..."
              value="${esc(inventorySearch)}"
              autocomplete="off"
            >
          </label>

          <button id="clearInventorySearch" type="button">
            Limpiar
          </button>
        </div>
      </section>

      <div class="cards">
        <div class="card">
          <small>Resultados</small>
          <strong>${filtered.length}</strong>
        </div>

        <div class="card">
          <small>Total registrado</small>
          <strong>${inventoryRows.length}</strong>
        </div>
      </div>

      <section class="panel">
        <h2>Inventario completo</h2>

        ${
          filtered.length
            ? `
              <div class="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Código</th>
                      <th>Material / Producto</th>
                      <th>Categoría</th>
                      <th>Unidad</th>
                      <th>Inicial</th>
                      <th>Entradas</th>
                      <th>Salidas</th>
                      <th>Stock actual</th>
                      <th>Mínimo</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    ${filtered.map(r => {
                      const stock =
                        n(r.stock_inicial) +
                        n(r.entradas) -
                        n(r.salidas);

                      const low =
                        n(r.stock_minimo) > 0 &&
                        stock <= n(r.stock_minimo);

                      return `
                        <tr>
                          <td>${esc(r.fecha)}</td>
                          <td>${esc(r.codigo || '')}</td>
                          <td><strong>${esc(r.material)}</strong></td>
                          <td>${esc(r.categoria || '')}</td>
                          <td>${esc(r.unidad || '')}</td>
                          <td>${n(r.stock_inicial)}</td>
                          <td>${n(r.entradas)}</td>
                          <td>${n(r.salidas)}</td>
                          <td><strong>${stock}</strong></td>
                          <td>${n(r.stock_minimo)}</td>
                          <td>
                            <span class="badge ${low ? 'critical' : 'ok'}">
                              ${low ? 'STOCK BAJO' : 'OK'}
                            </span>
                          </td>
                          <td style="white-space:nowrap;">
                            <button type="button" data-edit-inventory="${esc(r.id)}">
                              Editar
                            </button>
                            <button type="button" data-delete-inventory="${esc(r.id)}">
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            `
            : `
              <div class="empty">
                No se encontraron registros con los criterios seleccionados.
              </div>
            `
        }
      </section>
    </main>
  `;

  document.getElementById('backInventoryRegister')?.addEventListener(
    'click',
    () => {
      inventoryView = 'registro';
      inventorySearch = '';
      inventorySearchField = 'todos';
      renderInventory();
    }
  );

  const field = document.getElementById('inventorySearchField');
  const input = document.getElementById('inventorySearchInput');

  if (field) {
    field.value = inventorySearchField;
    field.addEventListener('change', () => {
      inventorySearchField = field.value;
      renderInventoryConsulta();
    });
  }

  if (input) {
    input.addEventListener('input', () => {
      inventorySearch = input.value;
      renderInventoryConsulta();
    });

    input.focus();
    input.setSelectionRange(
      input.value.length,
      input.value.length
    );
  }

  document.getElementById('clearInventorySearch')?.addEventListener(
    'click',
    () => {
      inventorySearch = '';
      inventorySearchField = 'todos';
      renderInventoryConsulta();
    }
  );

  document
    .querySelectorAll('[data-edit-inventory]')
    .forEach(button => {
      button.onclick = () =>
        editInventory(button.dataset.editInventory);
    });

  document
    .querySelectorAll('[data-delete-inventory]')
    .forEach(button => {
      button.onclick = () =>
        deleteInventory(button.dataset.deleteInventory);
    });
}

function updateInventoryStockPreview() {
  const inicial =
    n(document.getElementById('inv_stock_inicial')?.value);

  const entradas =
    n(document.getElementById('inv_entradas')?.value);

  const salidas =
    n(document.getElementById('inv_salidas')?.value);

  const output =
    document.getElementById('inv_stock_actual');

  if (output) {
    output.textContent =
      inicial + entradas - salidas;
  }
}

async function saveInventory(e) {
  e.preventDefault();

  const payload = {
    user_id: user.id,

    fecha:
      document.getElementById('inv_fecha').value,

    codigo:
      document.getElementById('inv_codigo').value.trim() || null,

    material:
      document.getElementById('inv_material').value.trim(),

    categoria:
      document.getElementById('inv_categoria').value || null,

    unidad:
      document.getElementById('inv_unidad').value,

    stock_inicial:
      n(document.getElementById('inv_stock_inicial').value),

    entradas:
      n(document.getElementById('inv_entradas').value),

    salidas:
      n(document.getElementById('inv_salidas').value),

    stock_sistema:
      n(document.getElementById('inv_stock_inicial').value) +
      n(document.getElementById('inv_entradas').value) -
      n(document.getElementById('inv_salidas').value),

    stock_minimo:
      n(document.getElementById('inv_stock_minimo').value),

    observaciones:
      document.getElementById('inv_observaciones').value.trim() || null
  };

  msg('inventoryMsg', 'Guardando inventario…');

  let result;

  if (editingInventoryId) {
    result =
      await supabase
        .from('inventory')
        .update(payload)
        .eq('id', editingInventoryId)
        .eq('user_id', user.id);
  } else {
    result =
      await supabase
        .from('inventory')
        .insert(payload);
  }

  if (result.error) {
    msg(
      'inventoryMsg',
      'Error: ' + result.error.message
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
      r => String(r.id) === String(id)
    );

  if (!row) {
    alert('No se encontró el registro.');
    return;
  }

  editingInventoryId = row.id;

  renderInventory();

  document.getElementById('inv_fecha').value =
    row.fecha || today;

  document.getElementById('inv_codigo').value =
    row.codigo || '';

  document.getElementById('inv_material').value =
    row.material || '';

  document.getElementById('inv_categoria').value =
    row.categoria || '';

  document.getElementById('inv_unidad').value =
    row.unidad || 'kg';

  document.getElementById('inv_stock_inicial').value =
    n(row.stock_inicial);

  document.getElementById('inv_entradas').value =
    n(row.entradas);

  document.getElementById('inv_salidas').value =
    n(row.salidas);

  document.getElementById('inv_stock_minimo').value =
    n(row.stock_minimo);

  document.getElementById('inv_observaciones').value =
    row.observaciones || '';

  updateInventoryStockPreview();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteInventory(id) {
  const row =
    inventoryRows.find(
      r => String(r.id) === String(id)
    );

  if (!row) return;

  if (!confirm(`¿Eliminar "${row.material}"?`)) return;

  const { error } =
    await supabase
      .from('inventory')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

  if (error) {
    alert('No se pudo eliminar:\n' + error.message);
    return;
  }

  await loadInventory();
  renderInventory();
}

/* =========================================================
   PERSONAL
========================================================= */

function renderPersonal(){
  const total=personalRows.length;

  const novedadesPorDni={};
  novedadesRows.forEach(x=>{
    if(!novedadesPorDni[x.dni]) novedadesPorDni[x.dni]=[];
    novedadesPorDni[x.dni].push(x);
  });

  document.getElementById('content').innerHTML=`
    <main>
      <div class="titleRow">
        <div>
          <h1>Personal</h1>
          <p>Trabajadores registrados: ${total}</p>
        </div>
        <button id="newPersonal" class="primary">+ Nuevo trabajador</button>
      </div>

      <section class="panel">
        <h2>Control de personal</h2>
        ${total?`
          <div class="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>DNI</th>
                  <th>Nombre</th>
                  <th>Cargo</th>
                  <th>Área</th>
                  <th>Turno</th>
                  <th>Estado</th>
                  <th>Permisos</th>
                  <th>Vacaciones</th>
                  <th>Faltas</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${personalRows.map(p=>{
                  const ns=novedadesPorDni[p.dni]||[];
                  const permisos=ns.filter(x=>x.tipo==='PERMISO').length;
                  const vacaciones=ns.filter(x=>x.tipo==='VACACIONES').length;
                  const faltas=ns.filter(x=>x.tipo==='FALTA').length;

                  return `
                    <tr>
                      <td>${esc(p.dni)}</td>
                      <td>${esc(p.nombre||p.nombre_completo||'')}</td>
                      <td>${esc(p.cargo||'')}</td>
                      <td>${esc(p.area||'')}</td>
                      <td>${esc(p.turno||'')}</td>
                      <td>${esc(p.estado||'')}</td>
                      <td>${permisos}</td>
                      <td>${vacaciones}</td>
                      <td>${faltas}</td>
                      <td>
                        <button class="link personalEdit" data-id="${esc(p.id)}">Editar</button>
                        <button class="link personalNovelty" data-dni="${esc(p.dni)}">Novedad</button>
                      </td>
                    </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>`
          :`<div class="empty">No hay trabajadores registrados todavía.</div>`}
      </section>

      <section class="panel">
        <h2>Últimas novedades</h2>
        ${novedadesRows.length?`
          <div class="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>DNI</th><th>Tipo</th><th>Inicio</th><th>Fin</th>
                  <th>Motivo</th><th>Estado</th>
                </tr>
              </thead>
              <tbody>
                ${novedadesRows.slice(0,30).map(x=>`
                  <tr>
                    <td>${esc(x.dni)}</td>
                    <td>${esc(x.tipo)}</td>
                    <td>${esc(x.fecha_inicio)}</td>
                    <td>${esc(x.fecha_fin)}</td>
                    <td>${esc(x.motivo||'')}</td>
                    <td>${esc(x.estado||'')}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>`
          :'<div class="empty">Todavía no hay permisos, vacaciones o faltas registrados.</div>'}
      </section>

      <div id="personalMsg" class="msg"></div>
    </main>`;

  document.getElementById('newPersonal').onclick=()=>showPersonalForm();

  document.querySelectorAll('.personalNovelty').forEach(b=>{
    b.onclick=()=>showNovedadForm(b.dataset.dni);
  });

  document.querySelectorAll('.personalEdit').forEach(b=>{
    b.onclick=()=>{
      const p=personalRows.find(x=>String(x.id)===String(b.dataset.id));
      if(p) showPersonalForm(p);
    };
  });
}

function showPersonalForm(p=null){
  const c=document.getElementById('content');

  c.innerHTML=`
    <main>
      <div class="titleRow">
        <div>
          <h1>${p?'Editar trabajador':'Nuevo trabajador'}</h1>
          <p>Ficha maestra del trabajador.</p>
        </div>
        <button id="backPersonal" class="link">← Volver</button>
      </div>

      <form id="personalForm" class="formGrid">
        <section>
          <label>DNI
            <input id="p_dni" required value="${esc(p?.dni||'')}">
          </label>

          <label>Nombre completo
            <input id="p_nombre" required value="${esc(p?.nombre||p?.nombre_completo||'')}">
          </label>

          <label>Fecha de ingreso
            <input id="p_fecha_ingreso" type="date" value="${esc(p?.fecha_ingreso||'')}">
          </label>

          <label>Cargo
            <input id="p_cargo" value="${esc(p?.cargo||'')}">
          </label>
        </section>

        <section>
          <label>Área
            <input id="p_area" value="${esc(p?.area||'')}">
          </label>

          <label>Turno
            <select id="p_turno">
              <option ${p?.turno==='Mañana'?'selected':''}>Mañana</option>
              <option ${p?.turno==='Tarde'?'selected':''}>Tarde</option>
              <option ${p?.turno==='Noche'?'selected':''}>Noche</option>
            </select>
          </label>

          <label>Estado
            <select id="p_estado">
              <option ${p?.estado==='ACTIVO'||!p?'selected':''}>ACTIVO</option>
              <option ${p?.estado==='INACTIVO'?'selected':''}>INACTIVO</option>
              <option ${p?.estado==='SUSPENDIDO'?'selected':''}>SUSPENDIDO</option>
            </select>
          </label>

          <label>Observaciones
            <textarea id="p_observaciones">${esc(p?.observaciones||'')}</textarea>
          </label>
        </section>

        <div id="personalFormMsg" class="msg full"></div>
        <button class="primary full" type="submit">${p?'Guardar cambios':'Guardar trabajador'}</button>
      </form>
    </main>`;

  document.getElementById('backPersonal').onclick=()=>renderPersonal();

  document.getElementById('personalForm').onsubmit=async e=>{
    e.preventDefault();

    const msg=document.getElementById('personalFormMsg');
    msg.textContent='Guardando…';

    const payload={
      user_id:user.id,
      dni:document.getElementById('p_dni').value.trim(),
      nombre:document.getElementById('p_nombre').value.trim(),
      fecha_ingreso:document.getElementById('p_fecha_ingreso').value||null,
      cargo:document.getElementById('p_cargo').value.trim(),
      area:document.getElementById('p_area').value.trim(),
      turno:document.getElementById('p_turno').value,
      estado:document.getElementById('p_estado').value,
      observaciones:document.getElementById('p_observaciones').value.trim()
    };

    let result;

    if(p){
      result=await supabase.from('personal')
        .update(payload)
        .eq('id',p.id)
        .eq('user_id',user.id);
    }else{
      result=await supabase.from('personal').insert(payload);
    }

    if(result.error){
      msg.textContent=result.error.message;
      return;
    }

    await loadPersonal();
    renderPersonal();
  };
}

function showNovedadForm(dni){
  document.getElementById('content').innerHTML=`
    <main>
      <div class="titleRow">
        <div>
          <h1>Nueva novedad</h1>
          <p>Registro de permisos, vacaciones y faltas.</p>
        </div>
        <button id="backNovedad" class="link">← Volver</button>
      </div>

      <form id="novedadForm" class="formGrid">
        <section>
          <label>DNI
            <input id="n_dni" value="${esc(dni)}" readonly>
          </label>

          <label>Tipo
            <select id="n_tipo">
              <option>PERMISO</option>
              <option>VACACIONES</option>
              <option>FALTA</option>
              <option>DESCANSO_MEDICO</option>
              <option>OTRO</option>
            </select>
          </label>

          <label>Fecha inicio
            <input id="n_inicio" type="date" required value="${today}">
          </label>

          <label>Fecha fin
            <input id="n_fin" type="date" required value="${today}">
          </label>
        </section>

        <section>
          <label>Motivo
            <input id="n_motivo">
          </label>

          <label>Estado
            <select id="n_estado">
              <option>REGISTRADO</option>
              <option>APROBADO</option>
              <option>RECHAZADO</option>
              <option>CERRADO</option>
            </select>
          </label>

          <label>Observaciones
            <textarea id="n_observaciones"></textarea>
          </label>
        </section>

        <div id="novedadMsg" class="msg full"></div>
        <button class="primary full" type="submit">Guardar novedad</button>
      </form>
    </main>`;

  document.getElementById('backNovedad').onclick=()=>renderPersonal();

  document.getElementById('novedadForm').onsubmit=async e=>{
    e.preventDefault();

    const msg=document.getElementById('novedadMsg');
    msg.textContent='Guardando…';

    const inicio=document.getElementById('n_inicio').value;
    const fin=document.getElementById('n_fin').value;

    if(fin<inicio){
      msg.textContent='La fecha fin no puede ser anterior a la fecha inicio.';
      return;
    }

    const payload={
      user_id:user.id,
      dni:document.getElementById('n_dni').value.trim(),
      tipo:document.getElementById('n_tipo').value,
      fecha_inicio:inicio,
      fecha_fin:fin,
      motivo:document.getElementById('n_motivo').value.trim(),
      estado:document.getElementById('n_estado').value,
      observaciones:document.getElementById('n_observaciones').value.trim()
    };

    const {error}=await supabase.from('personal_novedades').insert(payload);

    if(error){
      msg.textContent=error.message;
      return;
    }

    await loadPersonal();
    renderPersonal();
  };
}

async function loadPersonal(){
  const p=await supabase.from('personal')
    .select('*')
    .eq('user_id',user.id)
    .order('nombre',{ascending:true});

  if(p.error){
    personalRows=[];
    console.error('Error tabla personal:',p.error);
  }else{
    personalRows=p.data||[];
  }

  const nov=await supabase.from('personal_novedades')
    .select('*')
    .eq('user_id',user.id)
    .order('fecha_inicio',{ascending:false});

  if(nov.error){
    novedadesRows=[];
    console.error('Error tabla personal_novedades:',nov.error);
  }else{
    novedadesRows=nov.data||[];
  }
}

/* =========================================================
   SSOMA
========================================================= */

function renderSsoma() {
  document.getElementById('content').innerHTML = `
    <main>
      <h1>SSOMA</h1>

      <p>
        Registro y seguimiento de incidentes de Seguridad,
        Salud Ocupacional y Medio Ambiente.
      </p>

      ${(() => {
        const stats = getSsomaStats();
        const abiertos = ssomaRows.filter(
          r => String(r.estado || '').toLowerCase() !== 'cerrado'
        ).length;

        return `
          <div class="cards">
            <div class="card">
              <small>Eventos SSOMA registrados</small>
              <strong>${stats.totalEventos}</strong>
            </div>
            <div class="card">
              <small>Accidentes/incidentes registrados</small>
              <strong>${stats.totalAccidentesIncidentes}</strong>
            </div>
            <div class="card">
              <small>Incidentes abiertos</small>
              <strong>${abiertos}</strong>
            </div>
            <div class="card">
              <small>Días sin accidente/incidente</small>
              <strong>${stats.diasSinAccidenteIncidente === null ? 'SIN DATOS' : stats.diasSinAccidenteIncidente}</strong>
              <span class="badge ${stats.diasSinAccidenteIncidente === null ? 'ok' : stats.diasSinAccidenteIncidente === 0 ? 'critical' : 'ok'}">
                ${stats.diasSinAccidenteIncidente === null ? 'SIN REGISTROS' : stats.diasSinAccidenteIncidente === 0 ? 'EVENTO HOY' : 'EN CONTROL'}
              </span>
            </div>
          </div>
        `;
      })()}

      <section class="panel">
        <h2>
          ${editingSsomaId ? 'Editar incidente' : 'Registrar incidente'}
        </h2>

        <form id="ssomaForm" class="formGrid">
          <section>
            <h2>Identificación</h2>

            <label>
              Fecha
              <input id="ss_fecha" type="date"
                value="${today}" required>
            </label>

            <label>
              Tipo de incidente
              <select id="ss_tipo" required>
                <option value="">Seleccionar</option>
                <option>Accidente</option>
                <option>Incidente</option>
                <option>Casi accidente</option>
                <option>Condición insegura</option>
                <option>Acto inseguro</option>
                <option>Ambiental</option>
                <option>Salud ocupacional</option>
                <option>Otro</option>
              </select>
            </label>

            <label>
              Lugar
              <input id="ss_lugar" type="text" required>
            </label>

            <label>
              Gravedad
              <select id="ss_gravedad" required>
                <option value="">Seleccionar</option>
                <option>Leve</option>
                <option>Moderada</option>
                <option>Grave</option>
                <option>Crítica</option>
              </select>
            </label>

            <label>
              Estado
              <select id="ss_estado" required>
                <option>Abierto</option>
                <option>En investigación</option>
                <option>En seguimiento</option>
                <option>Cerrado</option>
              </select>
            </label>
          </section>

          <section>
            <h2>Detalle</h2>

            <label>
              Hechos
              <textarea id="ss_hechos" required></textarea>
            </label>

            <label>
              Acciones tomadas
              <textarea id="ss_acciones" required></textarea>
            </label>

            <label>
              Personas involucradas
              <textarea id="ss_personas"></textarea>
            </label>
          </section>

          <section>
            <h2>Observaciones</h2>

            <label>
              <textarea id="ss_observaciones"></textarea>
            </label>
          </section>

          <div id="ssomaMsg" class="msg full"></div>

          <div class="full">
            <button class="primary" type="submit">
              ${editingSsomaId ? 'Actualizar incidente' : 'Guardar incidente'}
            </button>

            ${
              editingSsomaId
                ? `<button id="cancelSsoma" type="button">
                     Cancelar
                   </button>`
                : ''
            }
          </div>
        </form>
      </section>

      <section class="panel">
        <h2>Incidentes registrados</h2>

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
                    ${ssomaRows.map(r => `
                      <tr>
                        <td>${esc(r.fecha)}</td>
                        <td>${esc(r.tipo || '')}</td>
                        <td>${esc(r.lugar || '')}</td>
                        <td>${esc(r.gravedad || '')}</td>
                        <td>${esc(r.estado || '')}</td>
                        <td>${esc(r.hechos || '')}</td>
                        <td>
                          <button data-edit-ssoma="${esc(r.id)}">
                            Editar
                          </button>
                          <button data-delete-ssoma="${esc(r.id)}">
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    `).join('')}
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

  document.getElementById('ssomaForm').onsubmit =
    saveSsoma;

  document
    .querySelectorAll('[data-edit-ssoma]')
    .forEach(button => {
      button.onclick = () =>
        editSsoma(button.dataset.editSsoma);
    });

  document
    .querySelectorAll('[data-delete-ssoma]')
    .forEach(button => {
      button.onclick = () =>
        deleteSsoma(button.dataset.deleteSsoma);
    });

  document.getElementById('cancelSsoma')
    ?.addEventListener('click', () => {
      editingSsomaId = null;
      renderSsoma();
    });
}

async function saveSsoma(e) {
  e.preventDefault();

  const payload = {
    user_id: user.id,

    fecha:
      document.getElementById('ss_fecha').value,

    tipo:
      document.getElementById('ss_tipo').value,

    hechos:
      document.getElementById('ss_hechos').value.trim(),

    lugar:
      document.getElementById('ss_lugar').value.trim(),

    acciones_tomadas:
      document.getElementById('ss_acciones').value.trim(),

    personas_involucradas:
      document.getElementById('ss_personas').value.trim() || null,

    gravedad:
      document.getElementById('ss_gravedad').value,

    estado:
      document.getElementById('ss_estado').value,

    observaciones:
      document.getElementById('ss_observaciones').value.trim() || null
  };

  msg('ssomaMsg', 'Guardando incidente…');

  let result;

  if (editingSsomaId) {
    result =
      await supabase
        .from('ssoma_incidents')
        .update(payload)
        .eq('id', editingSsomaId)
        .eq('user_id', user.id);
  } else {
    result =
      await supabase
        .from('ssoma_incidents')
        .insert(payload);
  }

  if (result.error) {
    msg(
      'ssomaMsg',
      'Error: ' + result.error.message
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
      r => String(r.id) === String(id)
    );

  if (!row) {
    alert('No se encontró el incidente.');
    return;
  }

  editingSsomaId = row.id;

  renderSsoma();

  document.getElementById('ss_fecha').value =
    row.fecha || today;

  document.getElementById('ss_tipo').value =
    row.tipo || '';

  document.getElementById('ss_hechos').value =
    row.hechos || '';

  document.getElementById('ss_lugar').value =
    row.lugar || '';

  document.getElementById('ss_acciones').value =
    row.acciones_tomadas || '';

  document.getElementById('ss_personas').value =
    row.personas_involucradas || '';

  document.getElementById('ss_gravedad').value =
    row.gravedad || '';

  document.getElementById('ss_estado').value =
    row.estado || 'Abierto';

  document.getElementById('ss_observaciones').value =
    row.observaciones || '';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteSsoma(id) {
  const row =
    ssomaRows.find(
      r => String(r.id) === String(id)
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
      .eq('id', id)
      .eq('user_id', user.id);

  if (error) {
    alert('No se pudo eliminar:\n' + error.message);
    return;
  }

  await loadSsoma();
  renderSsoma();
}

/* =========================================================
   CARGA GENERAL
========================================================= */

async function load() {
  if (!user?.id) return;

  const r =
    await supabase
      .from('daily_records')
      .select('*')
      .eq('user_id', user.id)
      .order('fecha', { ascending: true });

  if (!r.error) {
    rows = r.data || [];
  } else {
    console.error('Error daily_records:', r.error);
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
        Number.isFinite(Number(s.data.meta_cumplimiento))
          ? Number(s.data.meta_cumplimiento)
          : metas.cumplimiento,

      merma:
        Number.isFinite(Number(s.data.meta_merma))
          ? Number(s.data.meta_merma)
          : metas.merma,

      yield:
        Number.isFinite(Number(s.data.meta_yield))
          ? Number(s.data.meta_yield)
          : metas.yield,

      disponibilidad:
        Number.isFinite(Number(s.data.meta_disponibilidad))
          ? Number(s.data.meta_disponibilidad)
          : metas.disponibilidad,

      asistencia:
        Number.isFinite(Number(s.data.meta_asistencia))
          ? Number(s.data.meta_asistencia)
          : metas.asistencia,

      rechazo:
        Number.isFinite(Number(s.data.meta_rechazo))
          ? Number(s.data.meta_rechazo)
          : metas.rechazo,

      otif:
        Number.isFinite(Number(s.data.meta_entregas))
          ? Number(s.data.meta_entregas)
          : metas.otif,

      incidentes:
        Number.isFinite(Number(s.data.meta_incidentes))
          ? Number(s.data.meta_incidentes)
          : metas.incidentes
    };
  }

  await loadInventory();
  await loadDespachos();
  await loadSsoma();
  await loadPersonal();
  await loadMaintenance();
}

/* =========================================================
   DESPACHOS - CARGA
========================================================= */

async function loadDespachos() {
  if (!user?.id) return;

  const result = await supabase
    .from('qf_shipments')
    .select(`
      *,
      customer:qf_customers(business_name,ruc),
      purchase_order:qf_purchase_orders(oc_number,operating_unit,status),
      vehicle:qf_vehicles(plate),
      driver:qf_drivers(full_name,license_number),
      items:qf_shipment_items(
        line_no,
        source_product_code,
        description_source,
        quantity,
        unit,
        package_type,
        package_count,
        weight_per_package_kg,
        product:qf_products(name,internal_code,base_unit)
      )
    `)
    .eq('owner_id', user.id)
    .order('guide_date', { ascending: false })
    .order('guide_time', { ascending: false });

  if (result.error) {
    console.error('Error despachos:', result.error);
    shipmentRows = [];
    return;
  }

  shipmentRows = result.data || [];
}

function fmtNum(value, decimals = 0) {
  const x = Number(value);
  if (!Number.isFinite(x)) return '—';
  return x.toLocaleString('es-PE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/* =========================================================
   DESPACHOS - INTERFAZ
========================================================= */

async function importGuiasPoderosa() {
  const button = document.getElementById('importPoderosa');
  if (button) {
    button.disabled = true;
    button.textContent = 'Importando…';
  }

  const { data, error } = await supabase.rpc('qf_seed_poderosa_guides');

  if (error) {
    alert('No se pudieron cargar las guías:\n' + error.message);
  } else {
    await loadDespachos();
    renderDespachos();
    const gross = data?.gross_weight_kg ?? '—';
    alert(`Carga completada. Guías: ${data?.guides ?? 0}. Peso bruto: ${fmtNum(gross)} kg.`);
  }

  if (button) {
    button.disabled = false;
    button.textContent = '↻ Cargar las 5 guías reales';
  }
}

function renderDespachos() {
  const guides = Array.isArray(shipmentRows) ? shipmentRows : [];
  const gross = guides.reduce((s, r) => s + n(r.gross_weight_kg), 0);

  const productTotals = {};
  guides.forEach(g => {
    (g.items || []).forEach(i => {
      const key = i.description_source || i.product?.name || 'Producto';
      productTotals[key] = (productTotals[key] || 0) + n(i.quantity);
    });
  });

  const totalItems = Object.values(productTotals).reduce((s, v) => s + v, 0);
  const customers = new Set(guides.map(g => g.customer?.business_name).filter(Boolean)).size;
  const obsCodes = guides.flatMap(g => (g.items || []).map(i => i.source_product_code)).filter(Boolean);
  const codeMap = {};
  guides.forEach(g => (g.items || []).forEach(i => {
    const name = i.product?.name || i.description_source;
    codeMap[name] ||= new Set();
    codeMap[name].add(i.source_product_code || '—');
  }));
  const inconsistencies = Object.entries(codeMap).filter(([, codes]) => codes.size > 1);

  document.getElementById('content').innerHTML = `
    <main>
      <div class="titleRow">
        <div>
          <h1>Despachos</h1>
          <p>Guías de remisión, órdenes de compra, productos y transporte.</p>
        </div>
        <button id="importPoderosa" class="primary" type="button">
          ↻ Cargar las 5 guías reales
        </button>
      </div>

      <div class="cards">
        <div class="card">
          <small>Guías registradas</small>
          <strong>${fmtNum(guides.length)}</strong>
        </div>
        <div class="card">
          <small>Peso bruto</small>
          <strong>${fmtNum(gross)} kg</strong>
        </div>
        <div class="card">
          <small>Clientes</small>
          <strong>${fmtNum(customers)}</strong>
        </div>
        <div class="card">
          <small>Líneas de productos</small>
          <strong>${fmtNum(totalItems)}</strong>
        </div>
      </div>

      ${inconsistencies.length ? `
        <section class="panel">
          <div class="titleRow">
            <div>
              <h2>⚠ Observación de datos fuente</h2>
              <p>Se conserva el código tal como aparece en cada guía; no se corrige automáticamente.</p>
            </div>
            <span class="badge warn">${inconsistencies.length} REVISAR</span>
          </div>
          ${inconsistencies.map(([name, codes]) => `
            <div class="qf-data-warning">
              <strong>${esc(name)}</strong>
              <span>Códigos encontrados: ${esc([...codes].join(', '))}</span>
            </div>
          `).join('')}
        </section>
      ` : ''}

      <section class="panel">
        <div class="titleRow">
          <div>
            <h2>Guías de remisión</h2>
            <p>${guides.length ? 'Información estructurada a partir de las guías cargadas.' : 'Aún no hay guías cargadas.'}</p>
          </div>
        </div>

        ${guides.length ? `
          <div class="qf-table-wrap">
            <table class="qf-table">
              <thead>
                <tr>
                  <th>Guía</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>OC / UP</th>
                  <th>Productos</th>
                  <th>Peso bruto</th>
                  <th>Vehículo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                ${guides.map(g => `
                  <tr>
                    <td><strong>${esc(g.guide_number)}</strong><br><small>${esc((g.guide_time || '').slice(0,5))}</small></td>
                    <td>${esc(g.guide_date || '—')}</td>
                    <td>${esc(g.customer?.business_name || '—')}</td>
                    <td>${esc(g.purchase_order?.oc_number || '—')}<br><small>${esc(g.purchase_order?.operating_unit || '')}</small></td>
                    <td>
                      ${(g.items || []).map(i => `
                        <div class="qf-item-line">
                          <strong>${esc(i.description_source)}</strong>
                          <span>${fmtNum(i.quantity, i.unit === 'kg' ? 0 : 0)} ${esc(i.unit)}
                          ${i.package_count ? ` · ${fmtNum(i.package_count)} ${esc(i.package_type || '')}` : ''}</span>
                        </div>
                      `).join('')}
                    </td>
                    <td><strong>${fmtNum(g.gross_weight_kg)} kg</strong></td>
                    <td>${esc(g.vehicle?.plate || '—')}</td>
                    <td><span class="badge ok">${esc(String(g.status || '').toUpperCase())}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="empty">
            Pulsa <b>“Cargar las 5 guías reales”</b> para insertar en Supabase los documentos que analizamos.
          </div>
        `}
      </section>

      <section class="panel">
        <h2>Resumen por producto</h2>
        <div class="qf-summary-grid">
          ${Object.entries(productTotals).map(([name, value]) => `
            <div class="qf-summary-item">
              <small>${esc(name)}</small>
              <strong>${fmtNum(value)}</strong>
            </div>
          `).join('') || '<div class="empty">Sin datos.</div>'}
        </div>
      </section>

      <section class="panel">
        <h2>Integración con Inventario</h2>
        <p class="qf-muted">
          En esta versión los despachos quedan registrados y trazables sin modificar todavía
          la tabla <code>inventory</code>. Primero verificaremos su estructura real para conectar
          las salidas automáticamente sin arriesgar los datos existentes.
        </p>
      </section>
    </main>
  `;

  document.getElementById('importPoderosa')?.addEventListener('click', importGuiasPoderosa);
}

/* =========================================================
   INVENTARIO - CARGA
========================================================= */

async function loadInventory() {
  if (!user?.id) return;

  const result =
    await supabase
      .from('inventory')
      .select('*')
      .eq('user_id', user.id)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false });

  if (result.error) {
    console.error('Error inventario:', result.error);
    inventoryRows = [];
    return;
  }

  inventoryRows = result.data || [];
}

/* =========================================================
   SSOMA - CARGA
========================================================= */

async function loadSsoma() {
  if (!user?.id) return;

  const result =
    await supabase
      .from('ssoma_incidents')
      .select('*')
      .eq('user_id', user.id)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false });

  if (result.error) {
    console.error('Error SSOMA:', result.error);
    ssomaRows = [];
    return;
  }

  ssomaRows = result.data || [];
}

/* =========================================================
   PERSONAL - CARGA
========================================================= */

/* =========================================================
   MANTENIMIENTO - CARGA
========================================================= */

async function loadMaintenance() {
  if (!user?.id) return;

  const result =
    await supabase
      .from('maintenance')
      .select('*')
      .eq('user_id', user.id)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false });

  if (result.error) {
    console.error('Error mantenimiento:', result.error);
    maintenanceRows = [];
    return;
  }

  maintenanceRows = result.data || [];
}

/* =========================================================
   PLACEHOLDER
========================================================= */

function renderPlaceholder(title) {
  document.getElementById('content').innerHTML = `
    <main>
      <h1>${esc(title)}</h1>

      <section class="panel">
        <p>
          Este módulo está preparado para enlazarse
          con su tabla correspondiente.
        </p>

        <span class="badge ok">
          Módulo preparado
        </span>
      </section>
    </main>
  `;
}

/* =========================================================
   INICIO SEGURO
========================================================= */

async function init() {
  if (!app) {
    console.error(
      'QUIMFLUX: no se encontró el elemento #app.'
    );
    return;
  }

  try {
    const { data, error } =
      await supabase.auth.getSession();

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
      inventoryRows = [];
      ssomaRows = [];
      personalRows = [];
      novedadesRows = [];
      maintenanceRows = [];
      shipmentRows = [];
    }

    /*
      IMPORTANTE:
      No hacemos load() dentro de este callback.
      Evita carreras entre getSession(), carga de datos
      y renderizado que pueden dejar la pantalla en blanco.
    */

    render();
  }
);

/* =========================================================
   ARRANQUE
========================================================= */

init();
