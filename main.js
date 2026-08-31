import { createClient } from '@supabase/supabase-js';
import './styles.css';

const SUPABASE_URL = 'https://cgkdztwtodmdteohvuoh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sULeDyfJ1l5xfuVhFgXRKA_bsim9qSe';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const app = document.getElementById('app');
const today = new Date().toISOString().slice(0, 10);

let user = null;
let rows = [];
let inventoryRows = [];
let ssomaRows = [];
let personalRows = [];
let maintenanceRows = [];

let tab = 'dashboard';
let editingDailyId = null;
let editingInventoryId = null;
let editingSsomaId = null;
let editingPersonalId = null;
let editingMaintenanceId = null;
let viewingDailyId = null;
let viewingInventoryId = null;
let viewingSsomaId = null;
let viewingPersonalId = null;
let viewingMaintenanceId = null;

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

function esc(v = '') {
  return String(v).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[c]));
}

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function pct(v) {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return '—';
  return (Number(v) * 100).toFixed(1) + '%';
}

function msg(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function status(value, target, invert = false) {
  if (!Number.isFinite(Number(value)) || !Number.isFinite(Number(target))) {
    return { label: 'SIN DATOS', cls: 'ok' };
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
    costoUnitario: q > 0 ? n(r.costo_produccion) / q : null,
    energiaUnit: q > 0 ? n(r.energia) / q : null
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

function renderAuth() {
  if (!app) return;

  app.innerHTML = `
    <div class="auth">
      <h1>QUIMFLUX</h1>
      <h2>Administrador de Planta</h2>
      <p>Inicia sesión para acceder al dashboard.</p>
      <form id="authForm">
        <label>Correo
          <input id="email" type="email" required autocomplete="email">
        </label>
        <label>Contraseña
          <input id="password" type="password" minlength="6" required autocomplete="current-password">
        </label>
        <div id="authMsg" class="msg"></div>
        <button class="primary" type="submit">Entrar</button>
        <button class="link" id="signup" type="button">Crear una cuenta</button>
      </form>
    </div>
  `;

  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');

  document.getElementById('authForm').onsubmit = async e => {
    e.preventDefault();
    msg('authMsg', 'Iniciando sesión…');

    const { data, error } = await supabase.auth.signInWithPassword({
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

    const { data, error } = await supabase.auth.signUp({ email, password });

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

function render() {
  if (!app) return;

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
      <div><b>QUIMFLUX</b><span> · Administrador de Planta V5</span></div>
      <button id="logout">Salir</button>
    </header>

    <nav>
      ${nav.map(x => `
        <button data-tab="${x[0]}" class="${tab === x[0] ? 'active' : ''}">
          ${x[1]}
        </button>
      `).join('')}
    </nav>

    <div id="content"></div>
  `;

  document.querySelectorAll('nav button').forEach(button => {
    button.onclick = () => {
      tab = button.dataset.tab;
      editingDailyId = null;
      viewingDailyId = null;
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
    maintenanceRows = [];
    render();
  };

  try {
    if (tab === 'dashboard') renderDashboard();
    else if (tab === 'registro') renderDailyModule();
    else if (tab === 'resumen') renderResumen();
    else if (tab === 'inventario') renderInventory();
    else if (tab === 'personal') renderPersonal();
    else if (tab === 'ssoma') renderSsoma();
    else if (tab === 'mantenimiento') renderMaintenance();
    else renderPlaceholder(nav.find(x => x[0] === tab)?.[1] || 'QUIMFLUX');
  } catch (error) {
    console.error(error);
    const content = document.getElementById('content');
    if (content) {
      content.innerHTML = `
        <main><section class="panel">
          <h1>Error al cargar el módulo</h1>
          <pre style="white-space:pre-wrap;">${esc(error?.message || error)}</pre>
        </section></main>
      `;
    }
  }
}

function getAlerts() {
  const alerts = [];
  const d = rows.map(derive);

  const sum = key => d.reduce((s, r) => s + n(r[key]), 0);
  const programada = sum('programada');
  const producida = sum('producida');
  const mp = sum('mp');
  const mermaCantidad = sum('merma');
  const horas = sum('horas_turno');
  const paradasDiarias = sum('horas_paradas');
  const personalProgramado = sum('personal_programado');
  const personalPresente = sum('personal_presente');
  const rechazadas = sum('rechazadas');
  const pedidos = sum('pedidos_programados');
  const pedidosTiempo = sum('pedidos_tiempo');

  const existeDatoOperativo =
    programada > 0 || producida > 0 || mp > 0 || mermaCantidad > 0 ||
    horas > 0 || paradasDiarias > 0 || personalProgramado > 0 ||
    personalPresente > 0 || rechazadas > 0 || pedidos > 0 || pedidosTiempo > 0;

  if (existeDatoOperativo) {
    const cumplimiento = programada > 0 ? producida / programada : null;
    const yieldRate = mp > 0 ? producida / mp : null;
    const mermaRate = mp > 0 ? mermaCantidad / mp : null;

    const horasMantenimiento = maintenanceRows.reduce(
      (total, r) => total + n(r.horas_parada), 0
    );

    const paradas = horasMantenimiento > 0 ? horasMantenimiento : paradasDiarias;
    const disponibilidad = horas > 0 ? Math.max(0, (horas - paradas) / horas) : null;
    const asistencia = personalProgramado > 0 ? personalPresente / personalProgramado : null;
    const rechazo = producida > 0 ? rechazadas / producida : null;
    const otif = pedidos > 0 ? pedidosTiempo / pedidos : null;

    const oee =
      disponibilidad !== null && cumplimiento !== null && rechazo !== null
        ? disponibilidad * cumplimiento * Math.max(0, 1 - rechazo)
        : null;

    [
      ['Cumplimiento', cumplimiento, metas.cumplimiento],
      ['Yield', yieldRate, metas.yield],
      ['Disponibilidad', disponibilidad, metas.disponibilidad],
      ['Asistencia', asistencia, metas.asistencia],
      ['OTIF', otif, metas.otif],
      ['OEE', oee, 0.80]
    ].forEach(([nombre, valor, meta]) => {
      if (valor !== null && valor < meta * 0.85) {
        alerts.push({
          nivel: 'critical',
          titulo: `${nombre} en nivel crítico`,
          detalle: `${pct(valor)} · Meta ${pct(meta)}`
        });
      } else if (valor !== null && valor < meta) {
        alerts.push({
          nivel: 'warn',
          titulo: `${nombre} requiere revisión`,
          detalle: `${pct(valor)} · Meta ${pct(meta)}`
        });
      }
    });

    if (mermaRate !== null && mermaRate > metas.merma * 1.5) {
      alerts.push({
        nivel: 'critical',
        titulo: 'Merma en nivel crítico',
        detalle: `${pct(mermaRate)} · Meta máxima ${pct(metas.merma)}`
      });
    } else if (mermaRate !== null && mermaRate > metas.merma) {
      alerts.push({
        nivel: 'warn',
        titulo: 'Merma por encima de la meta',
        detalle: `${pct(mermaRate)} · Meta máxima ${pct(metas.merma)}`
      });
    }

    if (rechazo !== null && rechazo > metas.rechazo * 1.5) {
      alerts.push({
        nivel: 'critical',
        titulo: 'Rechazo de calidad crítico',
        detalle: `${pct(rechazo)} · Meta máxima ${pct(metas.rechazo)}`
      });
    } else if (rechazo !== null && rechazo > metas.rechazo) {
      alerts.push({
        nivel: 'warn',
        titulo: 'Rechazo de calidad elevado',
        detalle: `${pct(rechazo)} · Meta máxima ${pct(metas.rechazo)}`
      });
    }

    const incidentes = sum('incidentes');
    if (incidentes > metas.incidentes) {
      alerts.push({
        nivel: incidentes >= 2 ? 'critical' : 'warn',
        titulo: 'Incidentes SSOMA registrados',
        detalle: `${incidentes} incidente(s) · Meta ${metas.incidentes}`
      });
    }
  }

  inventoryRows.forEach(r => {
    const stock = n(r.stock_inicial) + n(r.entradas) - n(r.salidas);
    const minimo = n(r.stock_minimo);

    if (minimo > 0 && stock <= minimo) {
      alerts.push({
        nivel: 'critical',
        titulo: `Stock bajo: ${r.material}`,
        detalle: `Stock actual ${stock} ${r.unidad || ''} · Mínimo ${minimo} ${r.unidad || ''}`
      });
    }
  });

  maintenanceRows.forEach(r => {
    const estado = String(r.estado || '').trim().toLowerCase();

    if (estado === 'abierto' || estado === 'en proceso') {
      alerts.push({
        nivel: 'warn',
        titulo: `Mantenimiento pendiente: ${r.equipo}`,
        detalle: `${r.estado} · ${r.fecha || 'Sin fecha'}`
      });
    }

    if (estado === 'programado' && r.fecha_programada && r.fecha_programada < today) {
      alerts.push({
        nivel: 'critical',
        titulo: `Mantenimiento vencido: ${r.equipo}`,
        detalle: `Programado para ${r.fecha_programada}`
      });
    }
  });

  ssomaRows.forEach(r => {
    const estado = String(r.estado || '').trim().toLowerCase();

    if (estado !== 'cerrado') {
      const gravedad = String(r.gravedad || '').trim().toLowerCase();
      alerts.push({
        nivel: gravedad === 'grave' || gravedad === 'crítica' ? 'critical' : 'warn',
        titulo: 'Incidente SSOMA abierto',
        detalle: `${r.tipo || 'Incidente'} · ${r.gravedad || 'Sin gravedad'} · ${r.fecha || ''}`
      });
    }
  });

  const priority = { critical: 1, warn: 2, ok: 3 };
  alerts.sort((a, b) => priority[a.nivel] - priority[b.nivel]);
  return alerts;
}

function renderAlerts() {
  const alerts = getAlerts();

  if (!alerts.length) {
    return `
      <section class="panel">
        <div class="titleRow">
          <div>
            <h2>🚨 Alertas QUIMFLUX</h2>
            <p>No se detectan desviaciones que requieran atención.</p>
          </div>
          <span class="badge ok">✓ SIN ALERTAS</span>
        </div>
      </section>
    `;
  }

  const critical = alerts.filter(a => a.nivel === 'critical').length;
  const warnings = alerts.filter(a => a.nivel === 'warn').length;

  return `
    <section class="panel">
      <div class="titleRow">
        <div>
          <h2>🚨 Alertas QUIMFLUX</h2>
          <p>Desviaciones que requieren atención.</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${critical ? `<span class="badge critical">${critical} CRÍTICA${critical > 1 ? 'S' : ''}</span>` : ''}
          ${warnings ? `<span class="badge warn">${warnings} REVISIÓN${warnings > 1 ? 'ES' : ''}</span>` : ''}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${alerts.map(a => `
          <div style="display:flex;gap:12px;align-items:flex-start;padding:12px;border:1px solid #ddd;border-radius:10px;">
            <span class="badge ${a.nivel}">${a.nivel === 'critical' ? 'CRÍTICO' : 'REVISAR'}</span>
            <div><strong>${esc(a.titulo)}</strong><div><small>${esc(a.detalle)}</small></div></div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

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
  const incidentes = sum('incidentes');

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

  const disponibilidad = horas > 0 ? Math.max(0, (horas - paradas) / horas) : null;

  const oee =
    disponibilidad !== null && cumplimiento !== null && rechazo !== null
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

function trendClass(values) {
  const clean = values.filter(v => v !== null && Number.isFinite(v));
  if (clean.length < 2) return { arrow: '→', label: 'SIN DATOS', cls: 'ok' };
  const delta = clean[clean.length - 1] - clean[0];
  if (Math.abs(delta) < 0.005) return { arrow: '→', label: 'ESTABLE', cls: 'ok' };
  return delta > 0
    ? { arrow: '↑', label: 'MEJORANDO', cls: 'ok' }
    : { arrow: '↓', label: 'EMPEORANDO', cls: 'warn' };
}

function trendData() {
  const sorted = [...rows].map(derive).sort((a, b) =>
    String(a.fecha || '').localeCompare(String(b.fecha || ''))
  );

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

function formatChartDate(value) {
  const raw = String(value || '');
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}` : raw;
}

function renderTrendChart(data) {
  if (!data.length) {
    return `<div class="empty">Todavía no hay suficientes registros para mostrar la tendencia.</div>`;
  }

  const W = 1100, H = 410, left = 66, right = 28, top = 34, bottom = 72;
  const plotW = W - left - right;
  const plotH = H - top - bottom;

  const allValues = data.flatMap(r =>
    [r.cumplimiento, r.yieldRate, r.oee].filter(v => v !== null && Number.isFinite(v))
  );
  const rawMin = allValues.length ? Math.min(...allValues) : 0;
  const rawMax = allValues.length ? Math.max(...allValues) : 100;
  const minY = Math.max(0, Math.floor((rawMin - 10) / 10) * 10);
  const maxY = Math.min(120, Math.max(100, Math.ceil((rawMax + 8) / 10) * 10));
  const range = Math.max(20, maxY - minY);

  const x = i => data.length === 1 ? left + plotW / 2 : left + (i * plotW) / (data.length - 1);
  const y = value => top + plotH - ((value - minY) / range) * plotH;

  const ticks = [];
  for (let v = minY; v <= maxY; v += 10) ticks.push(v);
  const grid = ticks.map(v => `
    <line x1="${left}" y1="${y(v)}" x2="${W-right}" y2="${y(v)}" class="chartGrid"/>
    <text x="${left-12}" y="${y(v)+4}" text-anchor="end" class="chartAxis">${v}%</text>
  `).join('');

  const colors = {
    cumplimiento: '#5eead4',
    yieldRate: '#c084fc',
    oee: '#f472b6',
    meta: '#fbbf24'
  };

  const makePath = key => {
    const segments = [];
    let segment = [];
    data.forEach((r,i) => {
      if (r[key] === null || !Number.isFinite(r[key])) {
        if (segment.length) segments.push(segment);
        segment=[];
      } else {
        segment.push(`${x(i).toFixed(1)},${y(r[key]).toFixed(1)}`);
      }
    });
    if (segment.length) segments.push(segment);
    return segments.map(points =>
      `<polyline points="${points.join(' ')}" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`
    ).join('');
  };

  const lines = ['cumplimiento','yieldRate','oee'].map(key => `
    <g style="color:${colors[key]}">
      ${makePath(key)}
      ${data.map((r,i) => r[key] === null ? '' : `
        <circle cx="${x(i)}" cy="${y(r[key])}" r="5" fill="currentColor" stroke="currentColor">
          <title>${key === 'cumplimiento' ? 'Cumplimiento' : key === 'yieldRate' ? 'Yield' : 'OEE'} · ${formatChartDate(r.fecha)} · ${Number(r[key]).toFixed(1)}%</title>
        </circle>`).join('')}
    </g>
  `).join('');

  const metaValue = metas.cumplimiento * 100;
  const metaY = y(metaValue);
  const labelStep = Math.max(1, Math.ceil(data.length / 8));

  return `
    <div class="trendLegend">
      <span><i style="background:${colors.cumplimiento}"></i>Cumplimiento</span>
      <span><i style="background:${colors.yieldRate}"></i>Yield</span>
      <span><i style="background:${colors.oee}"></i>OEE</span>
      <span><i class="dash" style="background:${colors.meta}"></i>Meta ${pct(metas.cumplimiento)}</span>
    </div>
    <div class="trendChartWrap">
      <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Tendencias de cumplimiento, Yield y OEE">
        ${grid}
        <line x1="${left}" y1="${metaY}" x2="${W-right}" y2="${metaY}" stroke="${colors.meta}" stroke-width="2.5" stroke-dasharray="9 7"/>
        <text x="${W-right-2}" y="${metaY-10}" text-anchor="end" class="chartMeta">META ${pct(metas.cumplimiento)}</text>
        ${lines}
        ${data.map((r,i) => {
          const show = data.length <= 8 || i === 0 || i === data.length-1 || i % labelStep === 0;
          return show ? `<text x="${x(i)}" y="${H-30}" text-anchor="middle" class="chartDate">${esc(formatChartDate(r.fecha))}</text>` : '';
        }).join('')}
      </svg>
    </div>
    <div class="chartHint">Pasa el cursor sobre un punto para ver el valor exacto.</div>
  `;
}

function renderDashboard() {
  const metrics = aggregateMetrics(rows);
  const sorted = [...metrics.d].sort((a, b) => String(a.fecha || '').localeCompare(String(b.fecha || '')));
  const latest = sorted.length ? sorted[sorted.length - 1] : null;
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

  const tc = trendClass(trend.map(x => x.cumplimiento === null ? null : x.cumplimiento / 100));
  const ty = trendClass(trend.map(x => x.yieldRate === null ? null : x.yieldRate / 100));
  const to = trendClass(trend.map(x => x.oee === null ? null : x.oee / 100));

  const content = document.getElementById('content');

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

      ${latest ? `
        <section class="panel">
          <div class="titleRow">
            <div>
              <h2>Último turno</h2>
              <p>${esc(latest.fecha)} · ${esc(latest.turno)} · ${esc(latest.producto || 'Sin producto')}</p>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button type="button" data-view-daily="${esc(latest.id)}">Visualizar</button>
            </div>
          </div>

          <span class="badge ok">REGISTRO MÁS RECIENTE</span>

          <div class="cards">
            ${[
              ['Cumplimiento', latest.cumplimiento, metas.cumplimiento],
              ['Yield', latest.yieldRate, metas.yield],
              ['Merma', latest.merma, metas.merma, true],
              ['Disponibilidad', latest.disponibilidad, metas.disponibilidad],
              ['Asistencia', latest.asistencia, metas.asistencia],
              ['Rechazo calidad', latest.rechazo, metas.rechazo, true],
              ['OEE', latest.oee, 0.80],
              ['OTIF', latest.otif, metas.otif]
            ].map(k => {
              const st = status(k[1], k[2], k[3] || false);
              return `<div class="card kpiCard"><small class="kpiLabel">${k[0]}</small><strong class="kpiValue">${pct(k[1])}</strong><span class="badge ${st.cls} kpiStatus">${st.label}</span></div>`;
            }).join('')}
          </div>

          <p><b>Producción del último turno:</b> ${n(latest.producida).toLocaleString()} de ${n(latest.programada).toLocaleString()} programados.</p>
        </section>
      ` : ''}

      <section class="panel">
        <h2>Indicadores acumulados de planta</h2>
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

      <section class="panel">
        <h2>Tendencias de desempeño</h2>
        <p>Evolución de los principales KPI según los registros diarios.</p>
        <div class="cards">
          <div class="card"><small>Tendencia cumplimiento ${tc.arrow}</small><strong>${tc.label}</strong></div>
          <div class="card"><small>Tendencia Yield ${ty.arrow}</small><strong>${ty.label}</strong></div>
          <div class="card"><small>Tendencia OEE ${to.arrow}</small><strong>${to.label}</strong></div>
        </div>
        ${renderTrendChart(trend)}
      </section>

      <section class="panel">
        <h2>Indicadores generales</h2>
        <div class="cards">
          ${cards.slice(0, 8).map(c => `
            <div class="card kpiCard"><small class="kpiLabel">${esc(c[0])}</small><strong class="kpiValue">${esc(c[1])}</strong>${c.length > 2 ? `<span class="badge ${c[2].cls} kpiStatus">${c[2].label}</span>` : ''}</div>
          `).join('')}
        </div>
      </section>

      <section class="panel">
        <div class="titleRow">
          <div>
            <h2>Últimos registros</h2>
            <p>Visualiza o edita los registros diarios guardados.</p>
          </div>
          <button class="primary" type="button" data-new-daily>+ Nuevo registro</button>
        </div>

        ${metrics.d.length ? `
          <div class="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th><th>Turno</th><th>Producto</th>
                  <th>Programada</th><th>Producida</th><th>Merma</th><th>OEE</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${sorted.slice(-20).reverse().map(r => `
                  <tr>
                    <td>${esc(r.fecha)}</td>
                    <td>${esc(r.turno)}</td>
                    <td>${esc(r.producto)}</td>
                    <td>${n(r.programada).toLocaleString()}</td>
                    <td>${n(r.producida).toLocaleString()}</td>
                    <td>${pct(r.merma)}</td>
                    <td>${pct(r.oee)}</td>
                    <td>
                      <div style="display:flex;gap:6px;flex-wrap:wrap;">
                        <button type="button" data-view-daily="${esc(r.id)}">Visualizar</button>
                        <button type="button" data-delete-id="${esc(r.id)}">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `<div class="empty">Todavía no hay registros. Ve a Registro Diario para ingresar el primero.</div>`}
      </section>
    </main>
  `;

  document.querySelectorAll('[data-view-daily]').forEach(b => {
    b.onclick = () => viewDaily(b.dataset.viewDaily);
  });

  document.querySelectorAll('[data-delete-id]').forEach(b => {
    b.onclick = () => deleteRecord(b.dataset.deleteId);
  });

  document.querySelector('[data-new-daily]')?.addEventListener('click', () => {
    tab = 'registro';
    editingDailyId = null;
    viewingDailyId = null;
    render();
  });
}

function renderDailyModule() {
  if (viewingDailyId) {
    renderDailyView(viewingDailyId);
    return;
  }

  const r = editingDailyId
    ? rows.find(x => String(x.id) === String(editingDailyId)) || empty()
    : empty();

  document.getElementById('content').innerHTML = `
    <main>
      <div class="titleRow">
        <div>
          <h1>${editingDailyId ? 'Editar registro diario' : 'Registro Diario'}</h1>
          <p>Ingresa los datos del turno. Los KPI se calculan automáticamente.</p>
        </div>
        ${editingDailyId ? `<button type="button" data-back-dashboard>Volver al Dashboard</button>` : ''}
      </div>

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
          <h2>Despacho y SSOMA</h2>
          ${fields.slice(15).map(f => control(f, r)).join('')}
        </section>

        <div id="saveMsg" class="msg full"></div>

        <div class="full" style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="primary" type="submit">
            ${editingDailyId ? 'Actualizar registro' : 'Guardar registro diario'}
          </button>
          ${editingDailyId ? `<button type="button" data-cancel-daily>Cancelar edición</button>` : ''}
        </div>
      </form>
    </main>
  `;

  document.getElementById('daily').onsubmit = saveDaily;

  document.querySelector('[data-cancel-daily]')?.addEventListener('click', () => {
    editingDailyId = null;
    renderDailyModule();
  });

  document.querySelector('[data-back-dashboard]')?.addEventListener('click', () => {
    editingDailyId = null;
    tab = 'dashboard';
    render();
  });
}

function control(f, r) {
  const [key, label, type] = f;
  let input;

  if (type === 'select') {
    input = `
      <select id="f_${key}">
        <option ${r[key] === 'Mañana' ? 'selected' : ''}>Mañana</option>
        <option ${r[key] === 'Tarde' ? 'selected' : ''}>Tarde</option>
        <option ${r[key] === 'Noche' ? 'selected' : ''}>Noche</option>
      </select>
    `;
  } else if (type === 'textarea') {
    input = `<textarea id="f_${key}">${esc(r[key] || '')}</textarea>`;
  } else {
    input = `<input id="f_${key}" type="${type}" value="${esc(r[key] ?? '')}" ${type === 'number' ? 'step="any"' : ''}>`;
  }

  return `<label>${esc(label)}${input}</label>`;
}

async function saveDaily(e) {
  e.preventDefault();

  const payload = { user_id: user.id };

  fields.forEach(([key, , type]) => {
    const el = document.getElementById('f_' + key);
    payload[key] = type === 'number'
      ? (el.value === '' ? null : n(el.value))
      : el.value;
  });

  msg('saveMsg', editingDailyId ? 'Actualizando…' : 'Guardando…');

  let result;

  if (editingDailyId) {
    result = await supabase
      .from('daily_records')
      .update(payload)
      .eq('id', editingDailyId)
      .eq('user_id', user.id);
  } else {
    result = await supabase.from('daily_records').insert(payload);
  }

  if (result.error) {
    msg('saveMsg', 'Error: ' + result.error.message);
    return;
  }

  editingDailyId = null;
  await load();
  tab = 'dashboard';
  render();
}

function viewDaily(id) {
  if (!id) return;
  viewingDailyId = id;
  editingDailyId = null;
  tab = 'registro';
  render();
}

function renderDailyView(id) {
  const row = rows.find(r => String(r.id) === String(id));

  if (!row) {
    viewingDailyId = null;
    renderDailyModule();
    return;
  }

  const r = derive(row);

  document.getElementById('content').innerHTML = `
    <main>
      <div class="titleRow">
        <div>
          <h1>Visualizar registro diario</h1>
          <p>${esc(r.fecha)} · ${esc(r.turno)} · ${esc(r.producto || 'Sin producto')}</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" data-edit-view-daily>Editar</button>
          <button type="button" data-back-daily>Volver</button>
        </div>
      </div>

      <section class="panel">
        <h2>KPI calculados</h2>
        <div class="cards">
          ${[
            ['Cumplimiento', r.cumplimiento, metas.cumplimiento],
            ['Yield', r.yieldRate, metas.yield],
            ['Merma', r.merma, metas.merma, true],
            ['Disponibilidad', r.disponibilidad, metas.disponibilidad],
            ['Asistencia', r.asistencia, metas.asistencia],
            ['Rechazo', r.rechazo, metas.rechazo, true],
            ['OEE', r.oee, 0.80],
            ['OTIF', r.otif, metas.otif]
          ].map(k => {
            const st = status(k[1], k[2], k[3] || false);
            return `<div class="card kpiCard"><small class="kpiLabel">${k[0]}</small><strong class="kpiValue">${pct(k[1])}</strong><span class="badge ${st.cls} kpiStatus">${st.label}</span></div>`;
          }).join('')}
        </div>
      </section>

      <section class="panel">
        <h2>Datos registrados</h2>
        <div class="tableWrap">
          <table>
            <tbody>
              ${fields.map(([key, label]) => `
                <tr>
                  <th>${esc(label)}</th>
                  <td>${key === 'observaciones' ? esc(row[key] || '') : esc(row[key] ?? '')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  `;

  document.querySelector('[data-edit-view-daily]').onclick = () => {
    viewingDailyId = null;
    editingDailyId = row.id;
    renderDailyModule();
  };

  document.querySelector('[data-back-daily]').onclick = () => {
    viewingDailyId = null;
    tab = 'dashboard';
    render();
  };
}

async function deleteRecord(id) {
  const row = rows.find(r => String(r.id) === String(id));
  if (!row) return;

  if (!confirm(`¿Eliminar ${row.fecha} · ${row.turno} · ${row.producto || 'Sin producto'}?\n\nEsta acción no se puede deshacer.`)) return;

  const { error } = await supabase
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

function renderResumen() {
  const m = aggregateMetrics(rows);

  const kpis = [
    ['Cumplimiento', m.cumplimiento, metas.cumplimiento],
    ['Yield', m.yieldRate, metas.yield],
    ['Merma', m.merma, metas.merma, true],
    ['Disponibilidad', m.disponibilidad, metas.disponibilidad],
    ['Asistencia', m.asistencia, metas.asistencia],
    ['Rechazo', m.rechazo, metas.rechazo, true],
    ['OEE', m.oee, 0.80],
    ['OTIF', m.otif, metas.otif]
  ];

  document.getElementById('content').innerHTML = `
    <main>
      <h1>Resumen Ejecutivo</h1>
      <p>Visión consolidada del desempeño de la planta.</p>

      <section class="panel">
        <h2>Indicadores principales</h2>
        <div class="cards">
          ${kpis.map(k => {
            const st = status(k[1], k[2], k[3] || false);
            return `<div class="card kpiCard"><small class="kpiLabel">${k[0]}</small><strong class="kpiValue">${pct(k[1])}</strong><span class="badge ${st.cls} kpiStatus">${st.label}</span></div>`;
          }).join('')}
        </div>
      </section>

      <section class="panel">
        <h2>Producción</h2>
        <div class="cards">
          <div class="card"><small>Producción programada</small><strong>${m.programada.toLocaleString()}</strong></div>
          <div class="card"><small>Producción real</small><strong>${m.producida.toLocaleString()}</strong></div>
          <div class="card"><small>Materia prima consumida</small><strong>${m.mp.toLocaleString()}</strong></div>
          <div class="card"><small>Merma</small><strong>${m.mermaCantidad.toLocaleString()}</strong></div>
          <div class="card"><small>Horas de turno</small><strong>${m.horas.toFixed(1)}</strong></div>
          <div class="card"><small>Horas de parada</small><strong>${m.paradas.toFixed(2)}</strong></div>
        </div>
      </section>

      <section class="panel">
        <h2>Costos y eficiencia</h2>
        <div class="cards">
          <div class="card"><small>Costo producción</small><strong>S/ ${m.costo.toLocaleString()}</strong></div>
          <div class="card"><small>Costo mantenimiento</small><strong>S/ ${maintenanceRows.reduce((t,r) => t+n(r.costo),0).toLocaleString()}</strong></div>
          <div class="card"><small>Costo unitario</small><strong>${m.costoUnitario === null ? '—' : 'S/ ' + m.costoUnitario.toFixed(3)}</strong></div>
          <div class="card"><small>Energía total</small><strong>${m.energiaTotal.toLocaleString()} kWh</strong></div>
          <div class="card"><small>Energía por unidad</small><strong>${m.energia === null ? '—' : m.energia.toFixed(3) + ' kWh/unidad'}</strong></div>
        </div>
      </section>
    </main>
  `;
}

function renderMaintenance() {
  const total = maintenanceRows.length;
  const programados = maintenanceRows.filter(r => String(r.estado||'').toLowerCase() === 'programado').length;
  const pendientes = maintenanceRows.filter(r => ['abierto','en proceso'].includes(String(r.estado||'').toLowerCase())).length;
  const cerrados = maintenanceRows.filter(r => String(r.estado||'').toLowerCase() === 'cerrado').length;
  const horasParada = maintenanceRows.reduce((t,r) => t+n(r.horas_parada),0);
  const costoTotal = maintenanceRows.reduce((t,r) => t+n(r.costo),0);

  document.getElementById('content').innerHTML = `
    <main>
      <div class="titleRow">
        <div>
          <h1>Gestión de Mantenimiento</h1>
          <p>Registro, seguimiento y control del mantenimiento de equipos.</p>
        </div>
        <span class="online">● EN LÍNEA</span>
      </div>

      <div class="cards">
        <div class="card"><small>Mantenimientos registrados</small><strong>${total}</strong></div>
        <div class="card"><small>Programados</small><strong>${programados}</strong></div>
        <div class="card"><small>Abiertos / En proceso</small><strong>${pendientes}</strong><span class="badge ${pendientes?'warn':'ok'}">${pendientes?'PENDIENTE':'OK'}</span></div>
        <div class="card"><small>Cerrados</small><strong>${cerrados}</strong></div>
        <div class="card"><small>Horas de parada</small><strong>${horasParada.toFixed(2)} horas</strong></div>
        <div class="card"><small>Costo total</small><strong>S/ ${costoTotal.toFixed(2)}</strong></div>
      </div>

      <section class="panel">
        <h2>${editingMaintenanceId ? 'Editar mantenimiento' : 'Registrar mantenimiento'}</h2>
        <form id="maintenanceForm" class="formGrid">
          <section>
            <h2>Identificación</h2>
            <label>Fecha<input id="mt_fecha" type="date" value="${today}" required></label>
            <label>Equipo<input id="mt_equipo" type="text" required></label>
            <label>Código de equipo<input id="mt_codigo_equipo" type="text"></label>
            <label>Tipo<select id="mt_tipo"><option>Preventivo</option><option>Correctivo</option><option>Predictivo</option><option>Inspección</option><option>Emergencia</option><option>Otro</option></select></label>
            <label>Causa<input id="mt_causa" type="text"></label>
          </section>
          <section>
            <h2>Intervención</h2>
            <label>Descripción<textarea id="mt_descripcion" required></textarea></label>
            <label>Horas de parada<input id="mt_horas_parada" type="number" step="0.01" min="0" value="0"></label>
            <label>Costo (S/)<input id="mt_costo" type="number" step="0.01" min="0" value="0"></label>
            <label>Responsable<input id="mt_responsable" type="text"></label>
          </section>
          <section>
            <h2>Programación y estado</h2>
            <label>Estado<select id="mt_estado"><option>Programado</option><option>Abierto</option><option>En proceso</option><option>Cerrado</option><option>Cancelado</option></select></label>
            <label>Fecha programada<input id="mt_fecha_programada" type="date"></label>
            <label>Fecha de cierre<input id="mt_fecha_cierre" type="date"></label>
            <label>Observaciones<textarea id="mt_observaciones"></textarea></label>
          </section>
          <div id="maintenanceMsg" class="msg full"></div>
          <div class="full" style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="primary" type="submit">${editingMaintenanceId?'Actualizar mantenimiento':'Guardar mantenimiento'}</button>
            ${editingMaintenanceId ? '<button id="cancelMaintenance" type="button">Cancelar edición</button>' : ''}
          </div>
        </form>
      </section>

      <section class="panel">
        <h2>Mantenimientos registrados</h2>
        ${maintenanceRows.length ? `
          <div class="tableWrap"><table>
            <thead><tr><th>Fecha</th><th>Equipo</th><th>Tipo</th><th>Horas</th><th>Causa</th><th>Costo</th><th>Responsable</th><th>Estado</th><th>Próximo</th><th>Acciones</th></tr></thead>
            <tbody>
              ${maintenanceRows.map(r => `
                <tr>
                  <td>${esc(r.fecha)}</td>
                  <td><strong>${esc(r.equipo)}</strong>${r.codigo_equipo?`<br><small>${esc(r.codigo_equipo)}</small>`:''}</td>
                  <td>${esc(r.tipo)}</td>
                  <td>${n(r.horas_parada).toFixed(2)}</td>
                  <td>${esc(r.causa||'')}</td>
                  <td>S/ ${n(r.costo).toFixed(2)}</td>
                  <td>${esc(r.responsable||'')}</td>
                  <td><span class="badge ${
                    String(r.estado||'').toLowerCase()==='cerrado' ? 'ok' :
                    String(r.estado||'').toLowerCase()==='cancelado' ? 'critical' :
                    String(r.estado||'').toLowerCase()==='programado' ? 'ok' : 'warn'
                  }">${esc(r.estado)}</span></td>
                  <td>${esc(r.fecha_programada||'')}</td>
                  <td>
                    <button type="button" data-view-maintenance="${esc(r.id)}">Visualizar</button>
                    <button type="button" data-edit-maintenance="${esc(r.id)}">Editar</button>
                    <button type="button" data-delete-maintenance="${esc(r.id)}">Eliminar</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table></div>
        ` : '<div class="empty">Todavía no hay mantenimientos registrados.</div>'}
      </section>
    </main>
  `;

  if (editingMaintenanceId) {
    const row = maintenanceRows.find(r => String(r.id) === String(editingMaintenanceId));
    if (row) fillMaintenance(row);
  }

  document.getElementById('maintenanceForm').onsubmit = saveMaintenance;

  document.querySelectorAll('[data-view-maintenance]').forEach(b => {
    b.onclick = () => viewMaintenance(b.dataset.viewMaintenance);
  });

  document.querySelectorAll('[data-edit-maintenance]').forEach(b => {
    b.onclick = () => editMaintenance(b.dataset.editMaintenance);
  });

  document.querySelectorAll('[data-delete-maintenance]').forEach(b => {
    b.onclick = () => deleteMaintenance(b.dataset.deleteMaintenance);
  });

  document.getElementById('cancelMaintenance')?.addEventListener('click', () => {
    editingMaintenanceId = null;
    renderMaintenance();
  });
}

function fillMaintenance(row) {
  const values = {
    mt_fecha: row.fecha || today,
    mt_equipo: row.equipo || '',
    mt_codigo_equipo: row.codigo_equipo || '',
    mt_tipo: row.tipo || 'Preventivo',
    mt_causa: row.causa || '',
    mt_descripcion: row.descripcion || '',
    mt_horas_parada: n(row.horas_parada),
    mt_costo: n(row.costo),
    mt_responsable: row.responsable || '',
    mt_estado: row.estado || 'Abierto',
    mt_fecha_programada: row.fecha_programada || '',
    mt_fecha_cierre: row.fecha_cierre || '',
    mt_observaciones: row.observaciones || ''
  };

  Object.entries(values).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  });
}

async function saveMaintenance(e) {
  e.preventDefault();

  const payload = {
    user_id: user.id,
    fecha: document.getElementById('mt_fecha').value,
    equipo: document.getElementById('mt_equipo').value.trim(),
    codigo_equipo: document.getElementById('mt_codigo_equipo').value.trim() || null,
    tipo: document.getElementById('mt_tipo').value,
    causa: document.getElementById('mt_causa').value.trim() || null,
    descripcion: document.getElementById('mt_descripcion').value.trim(),
    horas_parada: n(document.getElementById('mt_horas_parada').value),
    costo: n(document.getElementById('mt_costo').value),
    responsable: document.getElementById('mt_responsable').value.trim() || null,
    estado: document.getElementById('mt_estado').value,
    fecha_programada: document.getElementById('mt_fecha_programada').value || null,
    fecha_cierre: document.getElementById('mt_fecha_cierre').value || null,
    observaciones: document.getElementById('mt_observaciones').value.trim() || null
  };

  if (!payload.fecha || !payload.equipo || !payload.descripcion) {
    msg('maintenanceMsg', 'Completa fecha, equipo y descripción.');
    return;
  }

  msg('maintenanceMsg', editingMaintenanceId ? 'Actualizando…' : 'Guardando…');

  const result = editingMaintenanceId
    ? await supabase.from('maintenance').update(payload).eq('id', editingMaintenanceId).eq('user_id', user.id)
    : await supabase.from('maintenance').insert(payload);

  if (result.error) {
    msg('maintenanceMsg', 'Error: ' + result.error.message);
    return;
  }

  editingMaintenanceId = null;
  await loadMaintenance();
  renderMaintenance();
}

function editMaintenance(id) {
  const row = maintenanceRows.find(r => String(r.id) === String(id));
  if (!row) return alert('No se encontró el mantenimiento.');
  editingMaintenanceId = row.id;
  renderMaintenance();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function viewMaintenance(id) {
  const row = maintenanceRows.find(r => String(r.id) === String(id));
  if (!row) return alert('No se encontró el mantenimiento.');

  document.getElementById('content').innerHTML = `
    <main>
      <div class="titleRow">
        <div><h1>Visualizar mantenimiento</h1><p>${esc(row.fecha)} · ${esc(row.equipo)}</p></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button data-edit-view-maintenance>Editar</button>
          <button data-back-maintenance>Volver</button>
        </div>
      </div>
      <section class="panel">
        <div class="tableWrap"><table><tbody>
          ${[
            ['Fecha','fecha'],['Equipo','equipo'],['Código','codigo_equipo'],['Tipo','tipo'],
            ['Causa','causa'],['Descripción','descripcion'],['Horas de parada','horas_parada'],
            ['Costo','costo'],['Responsable','responsable'],['Estado','estado'],
            ['Fecha programada','fecha_programada'],['Fecha de cierre','fecha_cierre'],
            ['Observaciones','observaciones']
          ].map(([label,key]) => `<tr><th>${label}</th><td>${esc(row[key] ?? '')}</td></tr>`).join('')}
        </tbody></table></div>
      </section>
    </main>
  `;

  document.querySelector('[data-edit-view-maintenance]').onclick = () => editMaintenance(row.id);
  document.querySelector('[data-back-maintenance]').onclick = () => renderMaintenance();
}

async function deleteMaintenance(id) {
  const row = maintenanceRows.find(r => String(r.id) === String(id));
  if (!row) return;
  if (!confirm(`¿Eliminar el mantenimiento de "${row.equipo}"?\n\nEsta acción no se puede deshacer.`)) return;

  const { error } = await supabase.from('maintenance').delete().eq('id', id).eq('user_id', user.id);
  if (error) return alert('No se pudo eliminar:\n' + error.message);

  await loadMaintenance();
  renderMaintenance();
}

function renderInventory() {
  const lowStock = inventoryRows.filter(r => {
    const stock = n(r.stock_inicial) + n(r.entradas) - n(r.salidas);
    return n(r.stock_minimo) > 0 && stock <= n(r.stock_minimo);
  }).length;

  document.getElementById('content').innerHTML = `
    <main>
      <h1>Control de Inventario</h1>
      <p>Registra entradas, salidas y stock de materiales y productos.</p>

      <div class="cards">
        <div class="card"><small>Ítems registrados</small><strong>${inventoryRows.length}</strong></div>
        <div class="card"><small>Stock bajo</small><strong>${lowStock}</strong><span class="badge ${lowStock?'critical':'ok'}">${lowStock?'REVISAR':'OK'}</span></div>
      </div>

      <section class="panel">
        <h2>${editingInventoryId ? 'Editar inventario' : 'Registrar inventario'}</h2>
        <form id="inventoryForm" class="formGrid">
          <section>
            <h2>Identificación</h2>
            <label>Fecha<input id="inv_fecha" type="date" value="${today}" required></label>
            <label>Código<input id="inv_codigo" type="text"></label>
            <label>Material / Producto<input id="inv_material" type="text" required></label>
            <label>Categoría<select id="inv_categoria"><option value="">Seleccionar</option><option>Materia prima</option><option>Producto terminado</option><option>Insumo</option><option>Repuesto</option><option>Envase / embalaje</option><option>Otro</option></select></label>
            <label>Unidad<select id="inv_unidad"><option>kg</option><option>t</option><option>g</option><option>litros</option><option>unidades</option><option>cajas</option><option>bolsas</option><option>otros</option></select></label>
          </section>

          <section>
            <h2>Movimiento</h2>
            <label>Stock inicial<input id="inv_stock_inicial" type="number" step="any" min="0" value="0"></label>
            <label>Entradas<input id="inv_entradas" type="number" step="any" min="0" value="0"></label>
            <label>Salidas<input id="inv_salidas" type="number" step="any" min="0" value="0"></label>
            <label>Stock mínimo<input id="inv_stock_minimo" type="number" step="any" min="0" value="0"></label>
            <div class="panel"><small>STOCK ACTUAL</small><strong id="inv_stock_actual" style="display:block;font-size:28px;margin-top:8px;">0</strong></div>
          </section>

          <section>
            <h2>Observaciones</h2>
            <label><textarea id="inv_observaciones"></textarea></label>
          </section>

          <div id="inventoryMsg" class="msg full"></div>
          <div class="full">
            <button class="primary" type="submit">${editingInventoryId?'Actualizar inventario':'Guardar inventario'}</button>
            ${editingInventoryId ? '<button id="cancelInventory" type="button">Cancelar</button>' : ''}
          </div>
        </form>
      </section>

      <section class="panel">
        <h2>Inventario registrado</h2>
        ${inventoryRows.length ? `
          <div class="tableWrap"><table>
            <thead><tr><th>Fecha</th><th>Código</th><th>Material</th><th>Categoría</th><th>Unidad</th><th>Inicial</th><th>Entradas</th><th>Salidas</th><th>Stock</th><th>Mínimo</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              ${inventoryRows.map(r => {
                const stock = n(r.stock_inicial)+n(r.entradas)-n(r.salidas);
                const low = n(r.stock_minimo)>0 && stock<=n(r.stock_minimo);
                return `<tr>
                  <td>${esc(r.fecha)}</td><td>${esc(r.codigo||'')}</td><td>${esc(r.material)}</td><td>${esc(r.categoria||'')}</td><td>${esc(r.unidad)}</td>
                  <td>${n(r.stock_inicial)}</td><td>${n(r.entradas)}</td><td>${n(r.salidas)}</td><td><strong>${stock}</strong></td><td>${n(r.stock_minimo)}</td>
                  <td><span class="badge ${low?'critical':'ok'}">${low?'STOCK BAJO':'OK'}</span></td>
                  <td>
                    <button type="button" data-view-inventory="${esc(r.id)}">Visualizar</button>
                    <button type="button" data-edit-inventory="${esc(r.id)}">Editar</button>
                    <button type="button" data-delete-inventory="${esc(r.id)}">Eliminar</button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table></div>
        ` : '<div class="empty">Todavía no hay inventario registrado.</div>'}
      </section>
    </main>
  `;

  updateInventoryStockPreview();

  ['inv_stock_inicial','inv_entradas','inv_salidas'].forEach(id =>
    document.getElementById(id)?.addEventListener('input', updateInventoryStockPreview)
  );

  if (editingInventoryId) {
    const row = inventoryRows.find(r => String(r.id) === String(editingInventoryId));
    if (row) fillInventory(row);
  }

  document.getElementById('inventoryForm').onsubmit = saveInventory;

  document.querySelectorAll('[data-view-inventory]').forEach(b => b.onclick = () => viewInventory(b.dataset.viewInventory));
  document.querySelectorAll('[data-edit-inventory]').forEach(b => b.onclick = () => editInventory(b.dataset.editInventory));
  document.querySelectorAll('[data-delete-inventory]').forEach(b => b.onclick = () => deleteInventory(b.dataset.deleteInventory));

  document.getElementById('cancelInventory')?.addEventListener('click', () => {
    editingInventoryId = null;
    renderInventory();
  });
}

function updateInventoryStockPreview() {
  const inicial = n(document.getElementById('inv_stock_inicial')?.value);
  const entradas = n(document.getElementById('inv_entradas')?.value);
  const salidas = n(document.getElementById('inv_salidas')?.value);
  const output = document.getElementById('inv_stock_actual');
  if (output) output.textContent = inicial + entradas - salidas;
}

function fillInventory(row) {
  const values = {
    inv_fecha: row.fecha || today,
    inv_codigo: row.codigo || '',
    inv_material: row.material || '',
    inv_categoria: row.categoria || '',
    inv_unidad: row.unidad || 'kg',
    inv_stock_inicial: n(row.stock_inicial),
    inv_entradas: n(row.entradas),
    inv_salidas: n(row.salidas),
    inv_stock_minimo: n(row.stock_minimo),
    inv_observaciones: row.observaciones || ''
  };

  Object.entries(values).forEach(([id,value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  });

  updateInventoryStockPreview();
}

async function saveInventory(e) {
  e.preventDefault();

  const payload = {
    user_id: user.id,
    fecha: document.getElementById('inv_fecha').value,
    codigo: document.getElementById('inv_codigo').value.trim() || null,
    material: document.getElementById('inv_material').value.trim(),
    categoria: document.getElementById('inv_categoria').value || null,
    unidad: document.getElementById('inv_unidad').value,
    stock_inicial: n(document.getElementById('inv_stock_inicial').value),
    entradas: n(document.getElementById('inv_entradas').value),
    salidas: n(document.getElementById('inv_salidas').value),
    stock_minimo: n(document.getElementById('inv_stock_minimo').value),
    observaciones: document.getElementById('inv_observaciones').value.trim() || null
  };

  msg('inventoryMsg', editingInventoryId ? 'Actualizando…' : 'Guardando…');

  const result = editingInventoryId
    ? await supabase.from('inventory').update(payload).eq('id', editingInventoryId).eq('user_id', user.id)
    : await supabase.from('inventory').insert(payload);

  if (result.error) {
    msg('inventoryMsg', 'Error: ' + result.error.message);
    return;
  }

  editingInventoryId = null;
  await loadInventory();
  renderInventory();
}

function editInventory(id) {
  const row = inventoryRows.find(r => String(r.id) === String(id));
  if (!row) return alert('No se encontró el registro.');
  editingInventoryId = row.id;
  renderInventory();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function viewInventory(id) {
  const row = inventoryRows.find(r => String(r.id) === String(id));
  if (!row) return alert('No se encontró el registro.');

  const stock = n(row.stock_inicial)+n(row.entradas)-n(row.salidas);
  const low = n(row.stock_minimo)>0 && stock<=n(row.stock_minimo);

  document.getElementById('content').innerHTML = `
    <main>
      <div class="titleRow">
        <div><h1>Visualizar inventario</h1><p>${esc(row.material)}</p></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button data-edit-view-inventory>Editar</button>
          <button data-back-inventory>Volver</button>
        </div>
      </div>
      <section class="panel">
        <div class="cards">
          <div class="card"><small>Stock actual</small><strong>${stock}</strong></div>
          <div class="card"><small>Stock mínimo</small><strong>${n(row.stock_minimo)}</strong><span class="badge ${low?'critical':'ok'}">${low?'STOCK BAJO':'OK'}</span></div>
        </div>
        <div class="tableWrap"><table><tbody>
          ${[['Fecha','fecha'],['Código','codigo'],['Material','material'],['Categoría','categoria'],['Unidad','unidad'],['Stock inicial','stock_inicial'],['Entradas','entradas'],['Salidas','salidas'],['Stock mínimo','stock_minimo'],['Observaciones','observaciones']].map(([l,k]) => `<tr><th>${l}</th><td>${esc(row[k] ?? '')}</td></tr>`).join('')}
        </tbody></table></div>
      </section>
    </main>
  `;

  document.querySelector('[data-edit-view-inventory]').onclick = () => editInventory(row.id);
  document.querySelector('[data-back-inventory]').onclick = () => renderInventory();
}

async function deleteInventory(id) {
  const row = inventoryRows.find(r => String(r.id) === String(id));
  if (!row) return;
  if (!confirm(`¿Eliminar "${row.material}"?\n\nEsta acción no se puede deshacer.`)) return;

  const { error } = await supabase.from('inventory').delete().eq('id', id).eq('user_id', user.id);
  if (error) return alert('No se pudo eliminar:\n' + error.message);

  await loadInventory();
  renderInventory();
}

function renderPersonal() {
  const activos = personalRows.filter(r => String(r.estado||'').toLowerCase() === 'activo').length;
  const inactivos = personalRows.length - activos;
  const areas = new Set(personalRows.map(r => r.area).filter(Boolean)).size;

  document.getElementById('content').innerHTML = `
    <main>
      <div class="titleRow">
        <div><h1>Gestión de Personal</h1><p>Registro y control del personal de la planta.</p></div>
        <span class="online">● EN LÍNEA</span>
      </div>

      <div class="cards">
        <div class="card"><small>Personal registrado</small><strong>${personalRows.length}</strong></div>
        <div class="card"><small>Personal activo</small><strong>${activos}</strong><span class="badge ok">ACTIVO</span></div>
        <div class="card"><small>Personal inactivo</small><strong>${inactivos}</strong></div>
        <div class="card"><small>Áreas</small><strong>${areas}</strong></div>
      </div>

      <section class="panel">
        <h2>${editingPersonalId ? 'Editar trabajador' : 'Registrar trabajador'}</h2>
        <form id="personalForm" class="formGrid">
          <section>
            <h2>Identificación</h2>
            <label>DNI<input id="per_dni" type="text" maxlength="20" required></label>
            <label>Nombre completo<input id="per_nombre" type="text" required></label>
            <label>Fecha de ingreso<input id="per_fecha_ingreso" type="date" value="${today}" required></label>
          </section>

          <section>
            <h2>Puesto</h2>
            <label>Cargo<input id="per_cargo" type="text" required></label>
            <label>Área<input id="per_area" type="text" required></label>
            <label>Turno<select id="per_turno"><option>Mañana</option><option>Tarde</option><option>Noche</option></select></label>
            <label>Estado<select id="per_estado"><option>Activo</option><option>Inactivo</option></select></label>
          </section>

          <section>
            <h2>Observaciones</h2>
            <label><textarea id="per_observaciones"></textarea></label>
          </section>

          <div id="personalMsg" class="msg full"></div>
          <div class="full">
            <button class="primary" type="submit">${editingPersonalId?'Actualizar trabajador':'Guardar trabajador'}</button>
            ${editingPersonalId ? '<button id="cancelPersonal" type="button">Cancelar</button>' : ''}
          </div>
        </form>
      </section>

      <section class="panel">
        <h2>Personal registrado</h2>
        ${personalRows.length ? `
          <div class="tableWrap"><table>
            <thead><tr><th>DNI</th><th>Nombre</th><th>Cargo</th><th>Área</th><th>Turno</th><th>Ingreso</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              ${personalRows.map(r => `
                <tr>
                  <td>${esc(r.dni)}</td><td><strong>${esc(r.nombre)}</strong></td><td>${esc(r.cargo)}</td><td>${esc(r.area)}</td><td>${esc(r.turno)}</td><td>${esc(r.fecha_ingreso)}</td>
                  <td><span class="badge ${r.estado === 'Activo' ? 'ok':'warn'}">${esc(r.estado)}</span></td>
                  <td>
                    <button type="button" data-view-personal="${esc(r.id)}">Visualizar</button>
                    <button type="button" data-edit-personal="${esc(r.id)}">Editar</button>
                    <button type="button" data-delete-personal="${esc(r.id)}">Eliminar</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table></div>
        ` : '<div class="empty">Todavía no hay personal registrado.</div>'}
      </section>
    </main>
  `;

  if (editingPersonalId) {
    const row = personalRows.find(r => String(r.id) === String(editingPersonalId));
    if (row) fillPersonal(row);
  }

  document.getElementById('personalForm').onsubmit = savePersonal;
  document.querySelectorAll('[data-view-personal]').forEach(b => b.onclick = () => viewPersonal(b.dataset.viewPersonal));
  document.querySelectorAll('[data-edit-personal]').forEach(b => b.onclick = () => editPersonal(b.dataset.editPersonal));
  document.querySelectorAll('[data-delete-personal]').forEach(b => b.onclick = () => deletePersonal(b.dataset.deletePersonal));

  document.getElementById('cancelPersonal')?.addEventListener('click', () => {
    editingPersonalId = null;
    renderPersonal();
  });
}

function fillPersonal(row) {
  const values = {
    per_dni: row.dni || '',
    per_nombre: row.nombre || '',
    per_fecha_ingreso: row.fecha_ingreso || today,
    per_cargo: row.cargo || '',
    per_area: row.area || '',
    per_turno: row.turno || 'Mañana',
    per_estado: row.estado || 'Activo',
    per_observaciones: row.observaciones || ''
  };

  Object.entries(values).forEach(([id,value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  });
}

async function savePersonal(e) {
  e.preventDefault();

  const payload = {
    user_id: user.id,
    dni: document.getElementById('per_dni').value.trim(),
    nombre: document.getElementById('per_nombre').value.trim(),
    fecha_ingreso: document.getElementById('per_fecha_ingreso').value,
    cargo: document.getElementById('per_cargo').value.trim(),
    area: document.getElementById('per_area').value.trim(),
    turno: document.getElementById('per_turno').value,
    estado: document.getElementById('per_estado').value,
    observaciones: document.getElementById('per_observaciones').value.trim() || null
  };

  if (!payload.dni || !payload.nombre || !payload.cargo || !payload.area || !payload.fecha_ingreso) {
    msg('personalMsg', 'Completa todos los campos obligatorios.');
    return;
  }

  msg('personalMsg', editingPersonalId ? 'Actualizando…' : 'Guardando…');

  const result = editingPersonalId
    ? await supabase.from('personal').update(payload).eq('id', editingPersonalId).eq('user_id', user.id)
    : await supabase.from('personal').insert(payload);

  if (result.error) {
    msg('personalMsg', result.error.code === '23505' ? 'Ya existe un trabajador con ese DNI.' : 'Error: ' + result.error.message);
    return;
  }

  editingPersonalId = null;
  await loadPersonal();
  renderPersonal();
}

function editPersonal(id) {
  const row = personalRows.find(r => String(r.id) === String(id));
  if (!row) return alert('No se encontró el trabajador.');
  editingPersonalId = row.id;
  renderPersonal();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function viewPersonal(id) {
  const row = personalRows.find(r => String(r.id) === String(id));
  if (!row) return alert('No se encontró el trabajador.');

  document.getElementById('content').innerHTML = `
    <main>
      <div class="titleRow">
        <div><h1>Visualizar trabajador</h1><p>${esc(row.nombre)}</p></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button data-edit-view-personal>Editar</button>
          <button data-back-personal>Volver</button>
        </div>
      </div>
      <section class="panel">
        <div class="tableWrap"><table><tbody>
          ${[['DNI','dni'],['Nombre','nombre'],['Fecha de ingreso','fecha_ingreso'],['Cargo','cargo'],['Área','area'],['Turno','turno'],['Estado','estado'],['Observaciones','observaciones']].map(([l,k]) => `<tr><th>${l}</th><td>${esc(row[k] ?? '')}</td></tr>`).join('')}
        </tbody></table></div>
      </section>
    </main>
  `;

  document.querySelector('[data-edit-view-personal]').onclick = () => editPersonal(row.id);
  document.querySelector('[data-back-personal]').onclick = () => renderPersonal();
}

async function deletePersonal(id) {
  const row = personalRows.find(r => String(r.id) === String(id));
  if (!row) return;

  if (!confirm(`¿Eliminar a "${row.nombre}"?\n\nEsta acción no se puede deshacer.`)) return;

  const { error } = await supabase.from('personal').delete().eq('id', id).eq('user_id', user.id);
  if (error) return alert('No se pudo eliminar:\n' + error.message);

  await loadPersonal();
  renderPersonal();
}

function renderSsoma() {
  document.getElementById('content').innerHTML = `
    <main>
      <h1>SSOMA</h1>
      <p>Registro y seguimiento de incidentes de Seguridad, Salud Ocupacional y Medio Ambiente.</p>

      <div class="cards">
        <div class="card"><small>Incidentes registrados</small><strong>${ssomaRows.length}</strong></div>
        <div class="card"><small>Incidentes abiertos</small><strong>${ssomaRows.filter(r => String(r.estado||'').toLowerCase() !== 'cerrado').length}</strong></div>
      </div>

      <section class="panel">
        <h2>${editingSsomaId ? 'Editar incidente' : 'Registrar incidente'}</h2>
        <form id="ssomaForm" class="formGrid">
          <section>
            <h2>Identificación</h2>
            <label>Fecha<input id="ss_fecha" type="date" value="${today}" required></label>
            <label>Tipo de incidente<select id="ss_tipo" required><option value="">Seleccionar</option><option>Accidente</option><option>Incidente</option><option>Casi accidente</option><option>Condición insegura</option><option>Acto inseguro</option><option>Ambiental</option><option>Salud ocupacional</option><option>Otro</option></select></label>
            <label>Lugar<input id="ss_lugar" type="text" required></label>
            <label>Gravedad<select id="ss_gravedad" required><option value="">Seleccionar</option><option>Leve</option><option>Moderada</option><option>Grave</option><option>Crítica</option></select></label>
            <label>Estado<select id="ss_estado"><option>Abierto</option><option>En investigación</option><option>En seguimiento</option><option>Cerrado</option></select></label>
          </section>

          <section>
            <h2>Detalle</h2>
            <label>Hechos<textarea id="ss_hechos" required></textarea></label>
            <label>Acciones tomadas<textarea id="ss_acciones" required></textarea></label>
            <label>Personas involucradas<textarea id="ss_personas"></textarea></label>
          </section>

          <section>
            <h2>Observaciones</h2>
            <label><textarea id="ss_observaciones"></textarea></label>
          </section>

          <div id="ssomaMsg" class="msg full"></div>
          <div class="full">
            <button class="primary" type="submit">${editingSsomaId?'Actualizar incidente':'Guardar incidente'}</button>
            ${editingSsomaId ? '<button id="cancelSsoma" type="button">Cancelar</button>' : ''}
          </div>
        </form>
      </section>

      <section class="panel">
        <h2>Incidentes registrados</h2>
        ${ssomaRows.length ? `
          <div class="tableWrap"><table>
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Lugar</th><th>Gravedad</th><th>Estado</th><th>Hechos</th><th>Acciones</th></tr></thead>
            <tbody>
              ${ssomaRows.map(r => `
                <tr>
                  <td>${esc(r.fecha)}</td><td>${esc(r.tipo||'')}</td><td>${esc(r.lugar||'')}</td><td>${esc(r.gravedad||'')}</td><td>${esc(r.estado||'')}</td><td>${esc(r.hechos||'')}</td>
                  <td>
                    <button type="button" data-view-ssoma="${esc(r.id)}">Visualizar</button>
                    <button type="button" data-edit-ssoma="${esc(r.id)}">Editar</button>
                    <button type="button" data-delete-ssoma="${esc(r.id)}">Eliminar</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table></div>
        ` : '<div class="empty">Todavía no hay incidentes registrados.</div>'}
      </section>
    </main>
  `;

  if (editingSsomaId) {
    const row = ssomaRows.find(r => String(r.id) === String(editingSsomaId));
    if (row) fillSsoma(row);
  }

  document.getElementById('ssomaForm').onsubmit = saveSsoma;
  document.querySelectorAll('[data-view-ssoma]').forEach(b => b.onclick = () => viewSsoma(b.dataset.viewSsoma));
  document.querySelectorAll('[data-edit-ssoma]').forEach(b => b.onclick = () => editSsoma(b.dataset.editSsoma));
  document.querySelectorAll('[data-delete-ssoma]').forEach(b => b.onclick = () => deleteSsoma(b.dataset.deleteSsoma));

  document.getElementById('cancelSsoma')?.addEventListener('click', () => {
    editingSsomaId = null;
    renderSsoma();
  });
}

function fillSsoma(row) {
  const values = {
    ss_fecha: row.fecha || today,
    ss_tipo: row.tipo || '',
    ss_lugar: row.lugar || '',
    ss_gravedad: row.gravedad || '',
    ss_estado: row.estado || 'Abierto',
    ss_hechos: row.hechos || '',
    ss_acciones: row.acciones_tomadas || '',
    ss_personas: row.personas_involucradas || '',
    ss_observaciones: row.observaciones || ''
  };

  Object.entries(values).forEach(([id,value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  });
}

async function saveSsoma(e) {
  e.preventDefault();

  const payload = {
    user_id: user.id,
    fecha: document.getElementById('ss_fecha').value,
    tipo: document.getElementById('ss_tipo').value,
    hechos: document.getElementById('ss_hechos').value.trim(),
    lugar: document.getElementById('ss_lugar').value.trim(),
    acciones_tomadas: document.getElementById('ss_acciones').value.trim(),
    personas_involucradas: document.getElementById('ss_personas').value.trim() || null,
    gravedad: document.getElementById('ss_gravedad').value,
    estado: document.getElementById('ss_estado').value,
    observaciones: document.getElementById('ss_observaciones').value.trim() || null
  };

  msg('ssomaMsg', editingSsomaId ? 'Actualizando…' : 'Guardando…');

  const result = editingSsomaId
    ? await supabase.from('ssoma_incidents').update(payload).eq('id', editingSsomaId).eq('user_id', user.id)
    : await supabase.from('ssoma_incidents').insert(payload);

  if (result.error) {
    msg('ssomaMsg', 'Error: ' + result.error.message);
    return;
  }

  editingSsomaId = null;
  await loadSsoma();
  renderSsoma();
}

function editSsoma(id) {
  const row = ssomaRows.find(r => String(r.id) === String(id));
  if (!row) return alert('No se encontró el incidente.');
  editingSsomaId = row.id;
  renderSsoma();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function viewSsoma(id) {
  const row = ssomaRows.find(r => String(r.id) === String(id));
  if (!row) return alert('No se encontró el incidente.');

  document.getElementById('content').innerHTML = `
    <main>
      <div class="titleRow">
        <div><h1>Visualizar incidente SSOMA</h1><p>${esc(row.fecha)} · ${esc(row.tipo||'')}</p></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button data-edit-view-ssoma>Editar</button>
          <button data-back-ssoma>Volver</button>
        </div>
      </div>
      <section class="panel">
        <div class="tableWrap"><table><tbody>
          ${[['Fecha','fecha'],['Tipo','tipo'],['Lugar','lugar'],['Gravedad','gravedad'],['Estado','estado'],['Hechos','hechos'],['Acciones tomadas','acciones_tomadas'],['Personas involucradas','personas_involucradas'],['Observaciones','observaciones']].map(([l,k]) => `<tr><th>${l}</th><td>${esc(row[k] ?? '')}</td></tr>`).join('')}
        </tbody></table></div>
      </section>
    </main>
  `;

  document.querySelector('[data-edit-view-ssoma]').onclick = () => editSsoma(row.id);
  document.querySelector('[data-back-ssoma]').onclick = () => renderSsoma();
}

async function deleteSsoma(id) {
  const row = ssomaRows.find(r => String(r.id) === String(id));
  if (!row) return;
  if (!confirm(`¿Eliminar el incidente del ${row.fecha}?\n\nEsta acción no se puede deshacer.`)) return;

  const { error } = await supabase.from('ssoma_incidents').delete().eq('id', id).eq('user_id', user.id);
  if (error) return alert('No se pudo eliminar:\n' + error.message);

  await loadSsoma();
  renderSsoma();
}

function renderPlaceholder(title) {
  document.getElementById('content').innerHTML = `
    <main><h1>${esc(title)}</h1><section class="panel">
      <p>Este módulo está preparado para enlazarse con su tabla correspondiente.</p>
      <span class="badge ok">Módulo preparado</span>
    </section></main>
  `;
}

async function load() {
  if (!user?.id) return;

  const r = await supabase
    .from('daily_records')
    .select('*')
    .eq('user_id', user.id)
    .order('fecha', { ascending: true });

  rows = r.error ? [] : (r.data || []);

  const s = await supabase
    .from('app_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (s.data) {
    metas = {
      ...metas,
      cumplimiento: Number.isFinite(Number(s.data.meta_cumplimiento)) ? Number(s.data.meta_cumplimiento) : metas.cumplimiento,
      merma: Number.isFinite(Number(s.data.meta_merma)) ? Number(s.data.meta_merma) : metas.merma,
      yield: Number.isFinite(Number(s.data.meta_yield)) ? Number(s.data.meta_yield) : metas.yield,
      disponibilidad: Number.isFinite(Number(s.data.meta_disponibilidad)) ? Number(s.data.meta_disponibilidad) : metas.disponibilidad,
      asistencia: Number.isFinite(Number(s.data.meta_asistencia)) ? Number(s.data.meta_asistencia) : metas.asistencia,
      rechazo: Number.isFinite(Number(s.data.meta_rechazo)) ? Number(s.data.meta_rechazo) : metas.rechazo,
      otif: Number.isFinite(Number(s.data.meta_entregas)) ? Number(s.data.meta_entregas) : metas.otif,
      incidentes: Number.isFinite(Number(s.data.meta_incidentes)) ? Number(s.data.meta_incidentes) : metas.incidentes
    };
  }

  await loadInventory();
  await loadSsoma();
  await loadPersonal();
  await loadMaintenance();
}

async function loadInventory() {
  if (!user?.id) return;
  const result = await supabase.from('inventory').select('*').eq('user_id', user.id).order('fecha', { ascending: false }).order('created_at', { ascending: false });
  inventoryRows = result.error ? [] : (result.data || []);
}

async function loadSsoma() {
  if (!user?.id) return;
  const result = await supabase.from('ssoma_incidents').select('*').eq('user_id', user.id).order('fecha', { ascending: false }).order('created_at', { ascending: false });
  ssomaRows = result.error ? [] : (result.data || []);
}

async function loadPersonal() {
  if (!user?.id) return;
  const result = await supabase.from('personal').select('*').eq('user_id', user.id).order('estado', { ascending: true }).order('nombre', { ascending: true });
  personalRows = result.error ? [] : (result.data || []);
}

async function loadMaintenance() {
  if (!user?.id) return;
  const result = await supabase.from('maintenance').select('*').eq('user_id', user.id).order('fecha', { ascending: false }).order('created_at', { ascending: false });
  maintenanceRows = result.error ? [] : (result.data || []);
}

async function init() {
  if (!app) return;

  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      renderAuth();
      return;
    }

    user = data.session?.user || null;

    if (user) await load();
    render();
  } catch (error) {
    console.error(error);
    renderAuth();
  }
}

supabase.auth.onAuthStateChange((_event, session) => {
  user = session?.user || null;

  if (!user) {
    rows = [];
    inventoryRows = [];
    ssomaRows = [];
    personalRows = [];
    maintenanceRows = [];
  }

  render();
});

init();
