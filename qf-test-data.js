import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cgkdztwtodmdteohvuoh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sULeDyfJ1l5xfuVhFgXRKA_bsim9qSe';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MARKER = 'PRUEBA DIRECTORIO QUIMFLUX 2026';
const PREFIX = 'PRUEBA-DIR';
const today = new Date().toISOString().slice(0, 10);

const css = `
#qfTestFab{position:fixed;right:18px;bottom:18px;z-index:99990;border:0;border-radius:999px;padding:11px 16px;background:#087f4f;color:#fff;font:700 13px system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.18);cursor:pointer}
#qfTestFab:hover{filter:brightness(1.05)}
#qfTestBackdrop{position:fixed;inset:0;z-index:99999;background:rgba(8,20,16,.55);display:grid;place-items:center;padding:20px}
#qfTestModal{width:min(720px,96vw);max-height:88vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.28);padding:24px;font-family:system-ui,sans-serif;color:#17211d}
#qfTestModal h2{margin:0 0 6px;color:#087f4f}#qfTestModal p{margin:6px 0 14px;color:#52615b}
.qf-test-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:16px 0}.qf-test-item{border:1px solid #dfe8e3;border-radius:10px;padding:9px;background:#f7faf8}.qf-test-item b{display:block}.qf-test-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;margin-top:18px}.qf-test-actions button{border:0;border-radius:9px;padding:10px 14px;font-weight:700;cursor:pointer}.qf-test-load{background:#087f4f;color:#fff}.qf-test-delete{background:#f1e8e8;color:#8a2525}.qf-test-close{background:#eef2ef;color:#26352e}.qf-test-msg{margin-top:12px;padding:10px;border-radius:9px;background:#f4f7f5;white-space:pre-wrap;font-size:13px}
@media(max-width:600px){.qf-test-grid{grid-template-columns:1fr}#qfTestFab{right:10px;bottom:10px}}
`;

document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);

function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function dateAt(i){const d=new Date();d.setDate(d.getDate()-i);return d.toISOString().slice(0,10);}
function testName(kind,i){return `${PREFIX}-${kind}-${String(i+1).padStart(2,'0')}`;}

async function currentUser(){const {data}=await supabase.auth.getUser();return data?.user||null;}

async function marked(table, userId, column='observaciones'){
  const {data,error}=await supabase.from(table).select('*').eq('user_id',userId).ilike(column,`${MARKER}%`);
  if(error) throw error;
  return data||[];
}

async function markedOwner(table, userId, column='observations'){
  const {data,error}=await supabase.from(table).select('*').eq('owner_id',userId).ilike(column,`${MARKER}%`);
  if(error) throw error;
  return data||[];
}

function dailyRows(userId){
  return Array.from({length:5},(_,i)=>({
    user_id:userId,fecha:dateAt(i),turno:['Mañana','Tarde','Noche','Mañana','Tarde'][i],
    producto:`${PREFIX}-PRODUCTO-${i+1}`,programada:1000+i*100,producida:960+i*95,mp:1100+i*105,merma:22+i*2,
    horas_turno:8,horas_paradas:[0.5,0.25,1,0.75,0.4][i],personal_programado:10,personal_presente:[10,9,10,9,10][i],
    rechazadas:[12,8,15,10,6][i],costo_produccion:5200+i*450,energia:620+i*35,costo_mantenimiento:[180,0,420,150,80][i],
    incidentes:0,pedidos_programados:8,pedidos_tiempo:[8,7,7,8,8][i],reproceso:[5,3,8,4,2][i],no_conformidades:[0,1,1,0,0][i],
    observaciones:`${MARKER} · Registro diario ${i+1}`
  }));
}

function maintenanceRows(userId){
  const tipos=['Preventivo','Correctivo','Predictivo','Inspección','Emergencia'];
  const estados=['Cerrado','En proceso','Programado','Cerrado','Abierto'];
  return Array.from({length:5},(_,i)=>({
    user_id:userId,fecha:dateAt(i),equipo:`${PREFIX} Equipo ${i+1}`,codigo_equipo:`EQ-${PREFIX}-${i+1}`,
    tipo:tipos[i],causa:['Desgaste','Falla sensor','Vibración','Inspección rutinaria','Falla eléctrica'][i],
    descripcion:`${MARKER} · mantenimiento de prueba ${i+1}`,horas_parada:[1.2,2.5,0.8,0.4,3][i],costo:[250,680,320,120,950][i],
    responsable:`Técnico Prueba ${i+1}`,estado:estados[i],fecha_programada:dateAt(i-1),fecha_cierre:i<3?dateAt(i):null,
    observaciones:`${MARKER} · Mantenimiento ${i+1}`
  }));
}

function inventoryRows(userId){
  return Array.from({length:5},(_,i)=>({
    user_id:userId,fecha:dateAt(i),codigo:`${PREFIX}-MAT-${i+1}`,material:`${PREFIX} Material ${i+1}`,
    categoria:['Materia prima','Envase','Repuesto','Insumo','Producto terminado'][i],unidad:['kg','kg','unidad','unidad','caja'][i],
    stock_inicial:0,entradas:100+i*20,salidas:10+i*3,stock_sistema:90+i*17,stock_minimo:20+i*5,
    observaciones:`${MARKER} · Inventario ${i+1}`
  }));
}

function personalRows(userId){
  const areas=['Producción','Calidad','Mantenimiento','Almacén','SSOMA'];
  const turnos=['Mañana','Tarde','Noche','Mañana','Tarde'];
  return Array.from({length:5},(_,i)=>({
    user_id:userId,dni:`91${String(i+1).padStart(6,'0')}`,nombre:`${PREFIX} Colaborador ${i+1}`,
    fecha_ingreso:dateAt(30+i),cargo:['Operario','Analista','Técnico','Almacenero','Supervisor SSOMA'][i],area:areas[i],turno:turnos[i],estado:'ACTIVO',
    observaciones:`${MARKER} · Personal ${i+1}`
  }));
}

function noveltyRows(userId){
  const tipos=['PERMISO','VACACIONES','FALTA','DESCANSO_MEDICO','OTRO'];
  return Array.from({length:5},(_,i)=>({
    user_id:userId,dni:`91${String(i+1).padStart(6,'0')}`,tipo:tipos[i],fecha_inicio:dateAt(i),fecha_fin:dateAt(Math.max(0,i-1)),
    motivo:`${MARKER} · Novedad ${i+1}`,estado:i===2?'APROBADO':'REGISTRADO',observaciones:`${MARKER} · Novedad personal ${i+1}`
  }));
}

function ssomaRows(userId){
  const tipos=['Condición insegura','Casi accidente','Condición insegura','Casi accidente','Condición insegura'];
  return Array.from({length:5},(_,i)=>({
    user_id:userId,fecha:dateAt(i),tipo:tipos[i],hechos:`${MARKER} · Evento SSOMA de prueba ${i+1}`,
    lugar:['Planta','Almacén','Taller','Patio de maniobras','Laboratorio'][i],acciones_tomadas:'Se realizó verificación y acción preventiva de prueba.',
    personas_involucradas:i%2===0?`Colaborador prueba ${i+1}`:null,gravedad:['Leve','Leve','Moderada','Leve','Leve'][i],estado:i===4?'Cerrado':'Abierto',
    observaciones:`${MARKER} · SSOMA ${i+1}`
  }));
}

function shipmentRows(userId){
  const status=['registrado','preparando','despachado','entregado','anulado'];
  return Array.from({length:5},(_,i)=>({
    owner_id:userId,guide_number:testName('GUIA',i),guide_date:dateAt(i),guide_time:['08:15','10:30','13:20','15:10','17:05'][i],
    gross_weight_kg:[450,720,380,910,560][i],reason:'Venta',customer_id:null,purchase_order_id:null,origin:'Planta QUIMFLUX',destination:`Destino prueba ${i+1}`,
    vehicle_id:null,driver_id:null,status:status[i],observations:`${MARKER} · Despacho ${i+1}`
  }));
}

function shipmentItems(shipmentId,userId,i){return [{owner_id:userId,shipment_id:shipmentId,line_no:1,product_id:null,source_product_code:`${PREFIX}-PROD-${i+1}`,description_source:`Producto de prueba ${i+1}`,quantity:50+i*10,unit:'cajas',package_type:'Caja',package_count:5+i,weight_per_package_kg:10}];}

function receiptRows(userId){
  const status=['Registrada','Pendiente de revisión','Recibida','Aprobada','Rechazada'];
  return Array.from({length:5},(_,i)=>({
    owner_id:userId,receipt_date:dateAt(i),receipt_time:['07:30','09:10','11:45','14:20','16:40'][i],document_type:'Guía de Remisión',guide_series:'E001',guide_number:`${PREFIX}-REC-${String(i+1).padStart(3,'0')}`,
    supplier_id:null,supplier_name:`${PREFIX} Proveedor ${i+1}`,supplier_ruc:`20910000${String(i+1).padStart(2,'0')}`,purchase_order:`${PREFIX}-OC-${String(i+1).padStart(3,'0')}`,
    vehicle_plate:`TST-${i+1}23`,driver_name:`Conductor Prueba ${i+1}`,driver_license:`LIC-PRUEBA-${i+1}`,origin:`Proveedor prueba ${i+1}`,
    status:status[i],total_quantity:20+i*5,total_weight_kg:200+i*40,observations:`${MARKER} · Recepción ${i+1}`,updated_at:new Date().toISOString()
  }));
}

function receiptItems(receiptId,i){return [{receipt_id:receiptId,product_id:null,codigo:`${PREFIX}-MAT-${i+1}`,material:`Material de prueba ${i+1}`,description:`Material de prueba ${i+1}`,unit:'kg',quantity_guide:20+i*5,quantity_received:20+i*5,weight_kg:200+i*40,lot:`LOT-PRUEBA-${i+1}`,condition:i===4?'Con diferencia':'Conforme'}];}

async function insertMissing(table, rows, userId, mode='user'){
  const existing=mode==='owner' ? await markedOwner(table,userId) : await marked(table,userId);
  const keys=new Set(existing.map((r,i)=>r.observaciones||r.observations||r.guide_number||i));
  const pending=rows.filter(r=>!(keys.has(r.observaciones)||keys.has(r.guide_number)));
  if(!pending.length)return {inserted:0,existing:existing.length};
  const {error}=await supabase.from(table).insert(pending);
  if(error)throw error;
  return {inserted:pending.length,existing:existing.length};
}

async function seedAll(){
  const user=await currentUser();
  if(!user)throw new Error('Debes iniciar sesión antes de cargar las pruebas.');
  const result=[];

  result.push(['Registro Diario',await insertMissing('daily_records',dailyRows(user.id),user.id)]);
  result.push(['Mantenimiento',await insertMissing('maintenance',maintenanceRows(user.id),user.id)]);
  result.push(['Inventario',await insertMissing('inventory',inventoryRows(user.id),user.id)]);
  result.push(['Personal',await insertMissing('personal',personalRows(user.id),user.id)]);
  result.push(['SSOMA',await insertMissing('ssoma_incidents',ssomaRows(user.id),user.id)]);
  result.push(['Novedades personal',await insertMissing('personal_novedades',noveltyRows(user.id),user.id)]);

  const existingShip=await markedOwner('qf_shipments',user.id);
  const shipPending=shipmentRows(user.id).filter(r=>!existingShip.some(x=>x.observations===r.observations));
  if(shipPending.length){
    const {data,error}=await supabase.from('qf_shipments').insert(shipPending).select('id,observations');
    if(error)throw error;
    const items=[];for(let i=0;i<(data||[]).length;i++){const idx=Number((data[i].observations||'').match(/(\d+)$/)?.[1]||i+1)-1;items.push(...shipmentItems(data[i].id,user.id,idx));}
    if(items.length){const {error:e}=await supabase.from('qf_shipment_items').insert(items);if(e)throw e;}
  }
  result.push(['Despachos',{inserted:shipPending.length,existing:existingShip.length}]);

  const existingRec=await markedOwner('qf_receipts',user.id);
  const recPending=receiptRows(user.id).filter(r=>!existingRec.some(x=>x.observations===r.observations));
  if(recPending.length){
    const {data,error}=await supabase.from('qf_receipts').insert(recPending).select('id,observations');
    if(error)throw error;
    const items=[];for(let i=0;i<(data||[]).length;i++){const idx=Number((data[i].observations||'').match(/(\d+)$/)?.[1]||i+1)-1;items.push(...receiptItems(data[i].id,idx));}
    if(items.length){const {error:e}=await supabase.from('qf_receipt_items').insert(items);if(e)throw e;}
  }
  result.push(['Recepciones',{inserted:recPending.length,existing:existingRec.length}]);

  return result;
}

async function deleteAll(){
  const user=await currentUser();if(!user)throw new Error('Debes iniciar sesión.');
  const report=[];
  for(const table of ['daily_records','maintenance','inventory','personal_novedades','ssoma_incidents','personal']){
    const rows=await marked(table,user.id);if(rows.length){const {error}=await supabase.from(table).delete().eq('user_id',user.id).ilike('observaciones',`${MARKER}%`);if(error)throw error}report.push([table,rows.length]);
  }
  const ships=await markedOwner('qf_shipments',user.id);if(ships.length){const ids=ships.map(x=>x.id);const {error:e1}=await supabase.from('qf_shipment_items').delete().in('shipment_id',ids);if(e1)throw e1;const {error:e2}=await supabase.from('qf_shipments').delete().eq('owner_id',user.id).ilike('observations',`${MARKER}%`);if(e2)throw e2}report.push(['Despachos',ships.length]);
  const recs=await markedOwner('qf_receipts',user.id);if(recs.length){const ids=recs.map(x=>x.id);const {error:e1}=await supabase.from('qf_receipt_items').delete().in('receipt_id',ids);if(e1)throw e1;const {error:e2}=await supabase.from('qf_receipts').delete().eq('owner_id',user.id).ilike('observations',`${MARKER}%`);if(e2)throw e2}report.push(['Recepciones',recs.length]);
  return report;
}

function renderModal(){
  document.getElementById('qfTestBackdrop')?.remove();
  document.body.insertAdjacentHTML('beforeend',`<div id="qfTestBackdrop"><section id="qfTestModal"><h2>🧪 Pruebas de presentación QUIMFLUX</h2><p>Genera cinco registros controlados por módulo. Se identifican con <b>${MARKER}</b> y pueden eliminarse sin tocar la información real.</p><div class="qf-test-grid"><div class="qf-test-item"><b>5</b> Registro Diario</div><div class="qf-test-item"><b>5</b> Mantenimiento</div><div class="qf-test-item"><b>5</b> Inventario</div><div class="qf-test-item"><b>5</b> Personal</div><div class="qf-test-item"><b>5</b> Novedades</div><div class="qf-test-item"><b>5</b> SSOMA</div><div class="qf-test-item"><b>5</b> Despachos</div><div class="qf-test-item"><b>5</b> Recepciones</div><div class="qf-test-item"><b>5</b> Costos / KPIs (derivados)</div><div class="qf-test-item"><b>5</b> Dashboard / Resumen (derivados)</div></div><div id="qfTestMsg" class="qf-test-msg">Listo para cargar las pruebas.</div><div class="qf-test-actions"><button class="qf-test-close">Cerrar</button><button class="qf-test-delete">Eliminar pruebas</button><button class="qf-test-load">Cargar 5 pruebas</button></div></section></div>`);
  const close=()=>document.getElementById('qfTestBackdrop')?.remove();
  document.querySelector('.qf-test-close').onclick=close;
  document.getElementById('qfTestBackdrop').onclick=e=>{if(e.target.id==='qfTestBackdrop')close()};
  document.querySelector('.qf-test-load').onclick=async()=>{const m=document.getElementById('qfTestMsg');m.textContent='Cargando pruebas en Supabase…';try{const r=await seedAll();m.textContent='Carga completada.\n'+r.map(x=>`${x[0]}: ${x[1].inserted} nuevos · ${x[1].existing} existentes`).join('\n');setTimeout(()=>location.reload(),900)}catch(e){console.error(e);m.textContent='ERROR: '+(e?.message||e)}};
  document.querySelector('.qf-test-delete').onclick=async()=>{if(!confirm('¿Eliminar SOLO las pruebas marcadas para presentación?'))return;const m=document.getElementById('qfTestMsg');m.textContent='Eliminando pruebas…';try{const r=await deleteAll();m.textContent='Pruebas eliminadas.\n'+r.map(x=>`${x[0]}: ${x[1]}`).join('\n');setTimeout(()=>location.reload(),900)}catch(e){console.error(e);m.textContent='ERROR: '+(e?.message||e)}};
}

function mount(){
  supabase.auth.getSession().then(({data})=>{
    const logged=!!data?.session?.user;
    const old=document.getElementById('qfTestFab');
    if(logged&&!old){const b=document.createElement('button');b.id='qfTestFab';b.textContent='🧪 Pruebas';b.title='Cargar datos de prueba para la presentación';b.onclick=renderModal;document.body.appendChild(b)}
    if(!logged)old?.remove();
  }).catch(()=>{});
}

new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});
supabase.auth.onAuthStateChange(()=>setTimeout(mount,100));
setTimeout(mount,400);
