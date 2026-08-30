import { createClient } from '@supabase/supabase-js';
import './styles.css';

const SUPABASE_URL = 'https://cgkdztwtodmdteohvuoh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sULeDyfJ1l5xfuVhFgXRKA_bsim9qSe';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const app = document.getElementById('app');

const fields = [
  ['fecha','Fecha','date'],['turno','Turno','select'],['producto','Producto','text'],
  ['programada','Cantidad programada','number'],['producida','Cantidad producida','number'],['mp','Materia prima consumida','number'],['merma','Merma','number'],
  ['horas_turno','Horas de turno','number'],['horas_paradas','Horas de parada','number'],['personal_programado','Personal programado','number'],['personal_presente','Personal presente','number'],['rechazadas','Unidades rechazadas','number'],
  ['costo_produccion','Costo producción (S/)','number'],['energia','Energía (kWh)','number'],['costo_mantenimiento','Costo mantenimiento (S/)','number'],
  ['incidentes','Incidentes SSOMA','number'],['pedidos_programados','Pedidos programados','number'],['pedidos_tiempo','Pedidos a tiempo','number'],['reproceso','Reproceso','number'],['no_conformidades','No conformidades','number'],['observaciones','Observaciones','textarea']
];
const numeric = fields.filter(x=>x[2]==='number').map(x=>x[0]);
const today = new Date().toISOString().slice(0,10);
let user = null, rows = [], tab = 'dashboard', metas = {cumplimiento:.95, merma:.02, yield:.95, disponibilidad:.90, asistencia:.95, rechazo:.03, otif:.95, incidentes:0};

function esc(v=''){ return String(v).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
function n(v){ const x=Number(v); return Number.isFinite(x)?x:0; }
function pct(v){ return (n(v)*100).toFixed(1)+'%'; }
function avg(a,k){ return a.length?a.reduce((s,r)=>s+n(r[k]),0)/a.length:0; }
function derive(r){
  const p=n(r.programada), q=n(r.producida), mp=n(r.mp), h=n(r.horas_turno), stop=n(r.horas_paradas), pp=n(r.personal_programado), pa=n(r.personal_presente), rej=n(r.rechazadas), pedidos=n(r.pedidos_programados), at=n(r.pedidos_tiempo);
  const merma=mp?n(r.merma)/mp:0, yieldRate=mp?q/mp:0, disponibilidad=h?Math.max(0,(h-stop)/h):0, asistencia=pp?pa/pp:0, rechazo=q?rej/q:0;
  return {...r,cumplimiento:p?q/p:0,merma,yieldRate,disponibilidad,asistencia,rechazo,oee:disponibilidad*yieldRate*Math.max(0,1-rechazo),otif:pedidos?at/pedidos:0,costoUnitario:q?n(r.costo_produccion)/q:0,energiaUnit:q?n(r.energia)/q:0};
}
function empty(){return {fecha:today,turno:'Mañana',producto:'',programada:0,producida:0,mp:0,merma:0,horas_turno:8,horas_paradas:0,personal_programado:0,personal_presente:0,rechazadas:0,costo_produccion:0,energia:0,costo_mantenimiento:0,incidentes:0,pedidos_programados:0,pedidos_tiempo:0,reproceso:0,no_conformidades:0,observaciones:''};}

function renderAuth(){
  app.innerHTML=`<div class="auth"><div class="authCard"><div class="logo">QUIMFLUX</div><h1>Administrador de Planta</h1><p>Inicia sesión para acceder al dashboard.</p><form id="authForm"><label>Correo<input id="email" type="email" required autocomplete="email"></label><label>Contraseña<input id="password" type="password" minlength="6" required autocomplete="current-password"></label><div id="authMsg" class="msg"></div><button class="primary" type="submit">Entrar</button><button class="link" id="signup" type="button">Crear una cuenta</button></form></div></div>`;
  document.getElementById('authForm').onsubmit=async e=>{e.preventDefault();const msg=document.getElementById('authMsg');msg.textContent='Procesando…';const {data,error}=await supabase.auth.signInWithPassword({email:email.value,password:password.value});if(error)msg.textContent=error.message;else{user=data.user;await load();render();}};
  document.getElementById('signup').onclick=async()=>{const msg=document.getElementById('authMsg');msg.textContent='Creando cuenta…';const {data,error}=await supabase.auth.signUp({email:email.value,password:password.value});msg.textContent=error?error.message:(data.session?'Cuenta creada.':'Cuenta creada. Si Supabase pide confirmación, revisa tu correo.');};
}

function render(){
  if(!user){renderAuth();return;}
  const nav=[['dashboard','Dashboard'],['registro','Registro Diario'],['resumen','Resumen Ejecutivo'],['costos','Costos'],['mantenimiento','Mantenimiento'],['inventario','Inventario'],['personal','Personal'],['ssoma','SSOMA']];
  app.innerHTML=`<header><div><b>QUIMFLUX</b><span> · Administrador de Planta V4</span></div><button id="logout" class="logout">Salir</button></header><nav>${nav.map(x=>`<button data-tab="${x[0]}" class="${tab===x[0]?'active':''}">${x[1]}</button>`).join('')}</nav><div id="content"></div>`;
  document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render();});
  document.getElementById('logout').onclick=()=>supabase.auth.signOut();
  if(tab==='dashboard')renderDashboard(); else if(tab==='registro')renderForm(); else renderPlaceholder(nav.find(x=>x[0]===tab)?.[1]||'QUIMFLUX');
}
function renderDashboard(){
  const d=rows.map(derive);const k={prod:d.reduce((s,r)=>s+n(r.producida),0),cum:avg(d,'cumplimiento'),yield:avg(d,'yieldRate'),merma:avg(d,'merma'),disp:avg(d,'disponibilidad'),asis:avg(d,'asistencia'),rech:avg(d,'rechazo'),oee:avg(d,'oee'),costo:d.reduce((s,r)=>s+n(r.costo_produccion),0),mnt:d.reduce((s,r)=>s+n(r.costo_mantenimiento),0),unit:avg(d,'costoUnitario'),energy:avg(d,'energiaUnit'),otif:avg(d,'otif'),inc:d.reduce((s,r)=>s+n(r.incidentes),0)};
  const cards=[['Producción total',k.prod.toLocaleString()+' kg'],['Cumplimiento',pct(k.cum),k.cum>=metas.cumplimiento],['Yield',pct(k.yield),k.yield>=metas.yield],['Merma',pct(k.merma),k.merma<=metas.merma],['Disponibilidad',pct(k.disp),k.disp>=metas.disponibilidad],['Asistencia',pct(k.asis),k.asis>=metas.asistencia],['Rechazo calidad',pct(k.rech),k.rech<=metas.rechazo],['OEE',pct(k.oee),k.oee>=.80],['Costo producción','S/ '+k.costo.toLocaleString()],['Costo unitario','S/ '+k.unit.toFixed(3)],['Mantenimiento','S/ '+k.mnt.toLocaleString()],['Energía',k.energy.toFixed(3)+' kWh/kg'],['Entregas a tiempo',pct(k.otif),k.otif>=metas.otif],['Incidentes SSOMA',String(k.inc),k.inc<=metas.incidentes]];
  document.getElementById('content').innerHTML=`<main><div class="titleRow"><div><h1>Dashboard de Administración de Planta</h1><p>Datos sincronizados con Supabase · ${rows.length} registros</p></div><span class="online">● EN LÍNEA</span></div><div class="cards">${cards.map(c=>`<div class="card"><small>${c[0]}</small><strong>${c[1]}</strong>${c.length>2?`<span class="badge ${c[2]?'ok':'warn'}">${c[2]?'OK':'REVISAR'}</span>`:''}</div>`).join('')}</div><section class="panel"><h2>Últimos registros</h2>${d.length?`<div class="tableWrap"><table><thead><tr><th>Fecha</th><th>Turno</th><th>Producto</th><th>Programada</th><th>Producida</th><th>Merma</th><th>OEE</th></tr></thead><tbody>${d.slice(-20).reverse().map(r=>`<tr><td>${esc(r.fecha)}</td><td>${esc(r.turno)}</td><td>${esc(r.producto)}</td><td>${n(r.programada)}</td><td>${n(r.producida)}</td><td>${n(r.merma)}</td><td>${pct(r.oee)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Todavía no hay registros. Ve a <b>Registro Diario</b> para ingresar el primero.</div>'}</section></main>`;
}
function renderForm(){
  const r=empty();document.getElementById('content').innerHTML=`<main><h1>Registro Diario</h1><p>Ingresa los datos del turno. Los KPI se calculan automáticamente.</p><form id="daily" class="formGrid"><section><h2>Producción</h2>${fields.slice(0,7).map(f=>control(f,r)).join('')}</section><section><h2>Operación y personal</h2>${fields.slice(7,12).map(f=>control(f,r)).join('')}</section><section><h2>Costos y energía</h2>${fields.slice(12,15).map(f=>control(f,r)).join('')}</section><section><h2>Despacho y SSOMA</h2>${fields.slice(15).map(f=>control(f,r)).join('')}</section><div id="saveMsg" class="msg full"></div><button class="primary full" type="submit">Guardar registro diario</button></form></main>`;
  document.getElementById('daily').onsubmit=async e=>{e.preventDefault();const msg=document.getElementById('saveMsg');const payload={user_id:user.id};fields.forEach(([key,,type])=>{const el=document.getElementById('f_'+key);payload[key]=type==='number'?(el.value===''?null:n(el.value)):el.value;});msg.textContent='Guardando…';const {error}=await supabase.from('daily_records').insert(payload);if(error)msg.textContent=error.message;else{msg.textContent='Registro guardado correctamente.';await load();setTimeout(()=>render(),400);}};
}
function control(f,r){const [key,label,type]=f;let input;if(type==='select')input=`<select id="f_${key}"><option>Mañana</option><option>Tarde</option><option>Noche</option></select>`;else if(type==='textarea')input=`<textarea id="f_${key}"></textarea>`;else input=`<input id="f_${key}" type="${type}" value="${esc(r[key])}" ${type==='number'?'step="any"':''}>`;return `<label>${label}${input}</label>`;}
function renderPlaceholder(title){document.getElementById('content').innerHTML=`<main><h1>${esc(title)}</h1><section class="panel"><p>Este módulo está preparado para enlazarse con su tabla correspondiente de Supabase en la siguiente fase.</p><span class="badge ok">Módulo preparado</span></section></main>`;}
async function load(){const r=await supabase.from('daily_records').select('*').order('fecha',{ascending:true});if(!r.error)rows=r.data||[];const s=await supabase.from('app_settings').select('*').limit(1).maybeSingle();if(s.data){metas={...metas,cumplimiento:n(s.data.meta_cumplimiento)||metas.cumplimiento,merma:n(s.data.meta_merma)||metas.merma,yield:n(s.data.meta_yield)||metas.yield,disponibilidad:n(s.data.meta_disponibilidad)||metas.disponibilidad,asistencia:n(s.data.meta_asistencia)||metas.asistencia,rechazo:n(s.data.meta_rechazo)||metas.rechazo,otif:n(s.data.meta_entregas)||metas.otif,incidentes:n(s.data.meta_incidentes)};}}

supabase.auth.getSession().then(async({data})=>{user=data.session?.user||null;if(user)await load();render();});
supabase.auth.onAuthStateChange((_event,session)=>{user=session?.user||null;render();});
