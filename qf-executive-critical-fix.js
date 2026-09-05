import { createClient } from '@supabase/supabase-js';

/*
  Correcciones ejecutivas puntuales:
  1) SSOMA: reconoce tipos como "Incidente operativo" y calcula días desde
     el último accidente/incidente real.
  2) Resumen Ejecutivo: agrega un bloque de Inventario usando la misma
     sesión del usuario y la tabla public.inventory.

  Se mantiene separado de main.js para minimizar el riesgo sobre los módulos
  existentes.
*/

const SUPABASE_URL = 'https://cgkdztwtodmdteohvuoh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sULeDyfJ1l5xfuVhFgXRKA_bsim9qSe';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let lastUserId = null;
let inventoryCache = null;
let ssomaCache = null;
let patching = false;

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[c]));
}

function num(value) {
  const x = Number(value);
  return Number.isFinite(x) ? x : 0;
}

function formatNumber(value, decimals = 0) {
  return num(value).toLocaleString('es-PE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function normalizeType(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isAccidentOrIncident(type) {
  const t = normalizeType(type);

  // "Incidente operativo" debe contar.
  // "Accidente ..." también cuenta.
  // "Casi accidente" no reinicia el indicador de días sin accidente/incidente.
  if (t.startsWith('casi accidente')) return false;
  return t === 'accidente' || t.startsWith('accidente ') ||
         t === 'incidente' || t.startsWith('incidente ');
}

function localToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysBetween(fromDate, toDate) {
  const from = new Date(`${fromDate}T00:00:00`);
  const to = new Date(`${toDate}T00:00:00`);
  const diff = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

async function getCurrentUser() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user || null;
}

async function loadSsoma() {
  const user = await getCurrentUser();
  if (!user?.id) return null;

  if (ssomaCache?.userId === user.id) return ssomaCache.rows;

  const result = await supabase
    .from('ssoma_incidents')
    .select('fecha,tipo,estado')
    .eq('user_id', user.id)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false });

  if (result.error) {
    console.error('QUIMFLUX SSOMA fix:', result.error);
    ssomaCache = { userId: user.id, rows: [] };
    return [];
  }

  ssomaCache = { userId: user.id, rows: result.data || [] };
  return ssomaCache.rows;
}

async function patchSsoma() {
  const main = [...document.querySelectorAll('main')]
    .find(el => el.querySelector('h1')?.textContent?.trim() === 'SSOMA');

  if (!main) return;

  const rows = await loadSsoma();
  const relevant = rows.filter(r => isAccidentOrIncident(r.tipo));
  const lastDate = relevant
    .map(r => String(r.fecha || '').slice(0, 10))
    .filter(v => /^\d{4}-\d{2}-\d{2}$/.test(v))
    .sort()
    .at(-1) || null;

  const days = lastDate ? daysBetween(lastDate, localToday()) : null;

  const cards = [...main.querySelectorAll('.card')];
  const accidentCard = cards.find(card =>
    card.querySelector('small')?.textContent?.trim() === 'Accidentes/incidentes registrados'
  );
  const daysCard = cards.find(card =>
    card.querySelector('small')?.textContent?.trim() === 'Días sin accidente/incidente'
  );

  if (accidentCard) {
    const strong = accidentCard.querySelector('strong');
    if (strong && strong.textContent !== String(relevant.length)) {
      strong.textContent = String(relevant.length);
    }
  }

  if (daysCard) {
    const strong = daysCard.querySelector('strong');
    const badge = daysCard.querySelector('.badge');
    const value = days === null ? 'SIN DATOS' : String(days);
    const label = days === null ? 'SIN REGISTROS' : days === 0 ? 'EVENTO HOY' : 'EN CONTROL';

    if (strong && strong.textContent !== value) strong.textContent = value;
    if (badge && badge.textContent.trim() !== label) badge.textContent = label;
    if (badge) badge.className = `badge ${days === 0 ? 'critical' : 'ok'}`;
  }
}

async function loadInventory() {
  const user = await getCurrentUser();
  if (!user?.id) return [];

  if (inventoryCache?.userId === user.id) return inventoryCache.rows;

  const result = await supabase
    .from('inventory')
    .select('material,unidad,stock_sistema,stock_inicial,entradas,salidas,stock_minimo')
    .eq('user_id', user.id)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false });

  if (result.error) {
    console.error('QUIMFLUX Inventario fix:', result.error);
    inventoryCache = { userId: user.id, rows: [] };
    return [];
  }

  inventoryCache = { userId: user.id, rows: result.data || [] };
  return inventoryCache.rows;
}

function stockActual(row) {
  const sistema = Number(row.stock_sistema);
  if (Number.isFinite(sistema)) return sistema;
  return num(row.stock_inicial) + num(row.entradas) - num(row.salidas);
}

function buildInventoryPanel(rows) {
  const totalItems = rows.length;
  const lowStock = rows.filter(r => {
    const min = num(r.stock_minimo);
    return min > 0 && stockActual(r) <= min;
  }).length;
  const sufficient = Math.max(0, totalItems - lowStock);

  const unitGroups = {};
  rows.forEach(r => {
    const unit = String(r.unidad || 'sin unidad').trim() || 'sin unidad';
    if (!unitGroups[unit]) unitGroups[unit] = { entradas: 0, salidas: 0, stock: 0 };
    unitGroups[unit].entradas += num(r.entradas);
    unitGroups[unit].salidas += num(r.salidas);
    unitGroups[unit].stock += stockActual(r);
  });

  const unitSummary = Object.entries(unitGroups)
    .map(([unit, v]) => `${formatNumber(v.stock)} ${unit}`)
    .join(' · ');

  return `
    <section class="panel qf-executive-inventory" data-qf-executive-inventory>
      <div class="titleRow">
        <div>
          <h2>Inventario</h2>
          <p>Situación actual de materiales y productos registrados.</p>
        </div>
        <span class="badge ${lowStock ? 'warn' : 'ok'}">
          ${lowStock ? `${lowStock} STOCK BAJO` : 'STOCK EN CONTROL'}
        </span>
      </div>
      <div class="cards">
        <div class="card">
          <small>Ítems registrados</small>
          <strong>${formatNumber(totalItems)}</strong>
        </div>
        <div class="card">
          <small>Stock bajo</small>
          <strong>${formatNumber(lowStock)}</strong>
          <span class="badge ${lowStock ? 'warn' : 'ok'}">${lowStock ? 'REVISAR' : 'OK'}</span>
        </div>
        <div class="card">
          <small>Ítems con stock suficiente</small>
          <strong>${formatNumber(sufficient)}</strong>
        </div>
        <div class="card">
          <small>Stock actual por unidad</small>
          <strong style="font-size:1rem;line-height:1.35;">${esc(unitSummary || '—')}</strong>
        </div>
      </div>
    </section>
  `;
}

async function patchResumen() {
  const main = [...document.querySelectorAll('main')]
    .find(el => el.querySelector('h1')?.textContent?.trim() === 'Resumen Ejecutivo');

  if (!main || main.querySelector('[data-qf-executive-inventory]')) return;

  const rows = await loadInventory();
  const html = buildInventoryPanel(rows);

  const sections = [...main.querySelectorAll(':scope > .panel')];
  const production = sections.find(section =>
    section.querySelector('h2')?.textContent?.trim() === 'Producción'
  );

  if (production) {
    production.insertAdjacentHTML('afterend', html);
  } else {
    main.insertAdjacentHTML('beforeend', html);
  }
}

async function applyFixes() {
  if (patching) return;
  patching = true;
  try {
    const user = await getCurrentUser();
    if (!user?.id) return;

    if (lastUserId !== user.id) {
      lastUserId = user.id;
      inventoryCache = null;
      ssomaCache = null;
    }

    await patchSsoma();
    await patchResumen();
  } finally {
    patching = false;
  }
}

const observer = new MutationObserver(() => {
  void applyFixes();
});

function start() {
  if (!document.body) {
    setTimeout(start, 50);
    return;
  }

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  void applyFixes();
}

start();
