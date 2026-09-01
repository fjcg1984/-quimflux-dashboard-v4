import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cgkdztwtodmdteohvuoh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sULeDyfJ1l5xfuVhFgXRKA_bsim9qSe';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let busy = false;
let currentGuide = null;
let guidesCache = [];

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;

function waitForUser() {
  return supabase.auth.getSession().then(({ data }) => data.session?.user || null);
}

async function loadGuides() {
  const user = await waitForUser();
  if (!user) return [];
  const { data, error } = await supabase.from('qf_shipments').select('id,guide_number,guide_date,guide_time,gross_weight_kg,reason,customer_id,purchase_order_id,origin,destination,vehicle_id,driver_id,status,observations').eq('owner_id', user.id).order('guide_date',{ascending:false}).order('guide_time',{ascending:false});
  if (error) throw error;
  guidesCache = data || [];
  return guidesCache;
}

async function loadOptions(userId) {
  const [customers, orders, vehicles, drivers, products] = await Promise.all([
    supabase.from('qf_customers').select('id,business_name,ruc').eq('owner_id', userId).eq('active', true).order('business_name'),
    supabase.from('qf_purchase_orders').select('id,oc_number,operating_unit,status,customer_id').eq('owner_id', userId).order('oc_number'),
    supabase.from('qf_vehicles').select('id,plate').eq('owner_id', userId).eq('active', true).order('plate'),
    supabase.from('qf_drivers').select('id,full_name,license_number').eq('owner_id', userId).eq('active', true).order('full_name'),
    supabase.from('qf_products').select('id,internal_code,name,base_unit').eq('owner_id', userId).eq('active', true).order('name')
  ]);
  for (const x of [customers,orders,vehicles,drivers,products]) if (x.error) throw x.error;
  return { customers: customers.data||[], orders: orders.data||[], vehicles: vehicles.data||[], drivers: drivers.data||[], products: products.data||[] };
}

async function openGuideForm(id = null) {
  const user = await waitForUser();
  if (!user) return;

  if (id) {
    const { count, error } = await supabase.from('qf_inventory_movements').select('id',{count:'exact',head:true}).eq('shipment_id',id).eq('owner_id',user.id);
    if (error) { alert('No se pudo verificar Inventario: ' + error.message); return; }
    if ((count || 0) > 0) {
      alert('Esta guía ya está vinculada a Inventario y no se puede editar para proteger la trazabilidad.');
      return;
    }
  }

  const options = await loadOptions(user.id);
  currentGuide = null;
  if (id) {
    const { data, error } = await supabase.from('qf_shipments').select('*,items:qf_shipment_items(*)').eq('id', id).eq('owner_id', user.id).single();
    if (error) { alert('No se pudo cargar la guía: ' + error.message); return; }
    currentGuide = data;
  }

  const g = currentGuide || {};
  const items = g.items?.length ? g.items : [{ line_no:1, product_id:'', source_product_code:'', description_source:'', quantity:'', unit:'kg', package_type:'', package_count:'', weight_per_package_kg:'' }];

  document.getElementById('qfDespachosModal')?.remove();
  document.body.insertAdjacentHTML('beforeend', `
    <div id="qfDespachosModal" class="qf-modal-backdrop">
      <div class="qf-modal">
        <div class="qf-modal-head"><div><h2>${id ? 'Editar guía' : 'Nueva guía de remisión'}</h2><p>Registro manual en Supabase.</p></div><button type="button" id="qfCloseModal">×</button></div>
        <form id="qfGuideForm">
          <div class="qf-modal-grid">
            <label>N.º de guía<input id="qfg_number" required value="${esc(g.guide_number || '')}" placeholder="EG07-00000000"></label>
            <label>Fecha<input id="qfg_date" type="date" required value="${esc(g.guide_date || new Date().toISOString().slice(0,10))}"></label>
            <label>Hora<input id="qfg_time" type="time" value="${esc((g.guide_time||'').slice(0,5))}"></label>
            <label>Motivo<select id="qfg_reason"><option>Venta</option><option>Traslado</option><option>Devolución</option><option>Otro</option></select></label>
            <label>Cliente<select id="qfg_customer"><option value="">Sin cliente</option>${options.customers.map(x=>`<option value="${x.id}">${esc(x.business_name)}${x.ruc?' · '+esc(x.ruc):''}</option>`).join('')}</select></label>
            <label>Orden de compra<select id="qfg_order"><option value="">Sin OC</option>${options.orders.map(x=>`<option value="${x.id}">${esc(x.oc_number)}${x.operating_unit?' · '+esc(x.operating_unit):''}</option>`).join('')}</select></label>
            <label>Origen<input id="qfg_origin" value="${esc(g.origin||'')}" placeholder="Origen del despacho"></label>
            <label>Destino<input id="qfg_destination" value="${esc(g.destination||'')}" placeholder="Destino del despacho"></label>
            <label>Peso bruto (kg)<input id="qfg_weight" type="number" step="0.01" min="0" value="${esc(g.gross_weight_kg ?? '')}"></label>
            <label>Vehículo<select id="qfg_vehicle"><option value="">Sin vehículo</option>${options.vehicles.map(x=>`<option value="${x.id}">${esc(x.plate)}</option>`).join('')}</select></label>
            <label>Conductor<select id="qfg_driver"><option value="">Sin conductor</option>${options.drivers.map(x=>`<option value="${x.id}">${esc(x.full_name)}${x.license_number?' · '+esc(x.license_number):''}</option>`).join('')}</select></label>
            <label>Estado<select id="qfg_status"><option>registrado</option><option>preparando</option><option>despachado</option><option>entregado</option><option>anulado</option></select></label>
            <label class="qf-span-2">Observaciones<textarea id="qfg_observations">${esc(g.observations||'')}</textarea></label>
          </div>
          <section class="qf-items-editor">
            <div class="qf-items-head"><div><h3>Productos de la guía</h3><p>Agrega una línea por producto.</p></div><button type="button" id="qfAddItem">+ Agregar producto</button></div>
            <div id="qfItemsRows">${items.map((i,idx)=>itemRow(i,idx,options.products)).join('')}</div>
          </section>
          <div id="qfGuideMsg" class="qf-form-msg"></div>
          <div class="qf-modal-actions"><button type="button" id="qfCancelGuide">Cancelar</button><button class="primary" type="submit">${id?'Guardar cambios':'Guardar guía'}</button></div>
        </form>
      </div>
    </div>
  `);

  const set = (id,val) => { const e=document.getElementById(id); if(e) e.value=val ?? ''; };
  set('qfg_reason', g.reason || 'Venta'); set('qfg_customer', g.customer_id); set('qfg_order', g.purchase_order_id); set('qfg_vehicle', g.vehicle_id); set('qfg_driver', g.driver_id); set('qfg_status', g.status || 'registrado');
  document.getElementById('qfCloseModal').onclick = closeModal;
  document.getElementById('qfCancelGuide').onclick = closeModal;
  document.getElementById('qfAddItem').onclick = () => { const wrap=document.getElementById('qfItemsRows'); const idx=wrap.querySelectorAll('.qf-item-row').length; wrap.insertAdjacentHTML('beforeend', itemRow({line_no:idx+1,unit:'kg'},idx,options.products)); bindItemButtons(); };
  bindItemButtons();
  document.getElementById('qfGuideForm').onsubmit = e => saveGuide(e,id,user.id);
}

function itemRow(i, idx, products) {
  return `<div class="qf-item-row" data-item-row>
    <div><label>Producto<select data-i="product_id"><option value="">Sin catálogo</option>${products.map(p=>`<option value="${p.id}" ${String(i.product_id||'')===String(p.id)?'selected':''}>${esc(p.name)} · ${esc(p.internal_code)}</option>`).join('')}</select></label></div>
    <div><label>Código fuente<input data-i="source_product_code" value="${esc(i.source_product_code||'')}"></label></div>
    <div class="qf-item-wide"><label>Descripción<input data-i="description_source" required value="${esc(i.description_source||'')}"></label></div>
    <div><label>Cantidad<input data-i="quantity" type="number" step="0.01" min="0" required value="${esc(i.quantity ?? '')}"></label></div>
    <div><label>Unidad<select data-i="unit">${['kg','unidades','cajas','sacos','baldes','otros'].map(u=>`<option ${String(i.unit||'kg')===u?'selected':''}>${u}</option>`).join('')}</select></label></div>
    <div><label>Tipo envase<input data-i="package_type" value="${esc(i.package_type||'')}"></label></div>
    <div><label>N.º envases<input data-i="package_count" type="number" step="0.01" min="0" value="${esc(i.package_count ?? '')}"></label></div>
    <div><label>Kg/envase<input data-i="weight_per_package_kg" type="number" step="0.01" min="0" value="${esc(i.weight_per_package_kg ?? '')}"></label></div>
    <button type="button" class="qf-remove-item" title="Eliminar línea">Eliminar</button>
  </div>`;
}

function bindItemButtons() {
  document.querySelectorAll('.qf-remove-item').forEach(btn => btn.onclick = () => { const rows=document.querySelectorAll('.qf-item-row'); if(rows.length<=1){ alert('La guía debe tener al menos un producto.'); return; } btn.closest('.qf-item-row').remove(); });
}

function collectItems() {
  return [...document.querySelectorAll('.qf-item-row')].map((row,idx) => {
    const get = k => row.querySelector(`[data-i="${k}"]`)?.value ?? '';
    return { line_no:idx+1, product_id:get('product_id')||null, source_product_code:get('source_product_code').trim()||null, description_source:get('description_source').trim(), quantity:num(get('quantity')), unit:get('unit'), package_type:get('package_type').trim()||null, package_count:get('package_count')===''?null:num(get('package_count')), weight_per_package_kg:get('weight_per_package_kg')===''?null:num(get('weight_per_package_kg')) };
  });
}

async function saveGuide(e,id,userId) {
  e.preventDefault(); if (busy) return; busy=true;
  const msg=document.getElementById('qfGuideMsg'); msg.textContent='Guardando…';
  const payload={owner_id:userId,guide_number:document.getElementById('qfg_number').value.trim(),guide_date:document.getElementById('qfg_date').value,guide_time:document.getElementById('qfg_time').value||null,reason:document.getElementById('qfg_reason').value,customer_id:document.getElementById('qfg_customer').value||null,purchase_order_id:document.getElementById('qfg_order').value||null,origin:document.getElementById('qfg_origin').value.trim()||null,destination:document.getElementById('qfg_destination').value.trim()||null,gross_weight_kg:document.getElementById('qfg_weight').value===''?null:num(document.getElementById('qfg_weight').value),vehicle_id:document.getElementById('qfg_vehicle').value||null,driver_id:document.getElementById('qfg_driver').value||null,status:document.getElementById('qfg_status').value,observations:document.getElementById('qfg_observations').value.trim()||null};
  const items=collectItems();
  if(!payload.guide_number||!payload.guide_date){msg.textContent='N.º de guía y fecha son obligatorios.';busy=false;return;}
  if(items.some(x=>!x.description_source||x.quantity<=0)){msg.textContent='Cada producto necesita descripción y cantidad mayor que cero.';busy=false;return;}
  let shipmentId=id;
  let result;
  if(id) result=await supabase.from('qf_shipments').update(payload).eq('id',id).eq('owner_id',userId).select('id').single();
  else result=await supabase.from('qf_shipments').insert(payload).select('id').single();
  if(result.error){msg.textContent='Error: '+result.error.message;busy=false;return;}
  shipmentId=result.data.id;
  if(id){ const del=await supabase.from('qf_shipment_items').delete().eq('shipment_id',id).eq('owner_id',userId); if(del.error){msg.textContent='No se pudieron reemplazar los productos: '+del.error.message;busy=false;return;} }
  const ins=await supabase.from('qf_shipment_items').insert(items.map(x=>({...x,shipment_id:shipmentId,owner_id:userId})));
  if(ins.error){msg.textContent='La guía se guardó pero fallaron los productos: '+ins.error.message;busy=false;return;}
  closeModal(); await refreshDespachos(); busy=false;
}

async function deleteGuide(id) {
  const user=await waitForUser(); if(!user) return;
  const g=guidesCache.find(x=>x.id===id); if(!g) return;
  const { count, error:movementError } = await supabase.from('qf_inventory_movements').select('id',{count:'exact',head:true}).eq('shipment_id',id).eq('owner_id',user.id);
  if(movementError){alert('No se pudo verificar la integración con Inventario: '+movementError.message);return;}
  if((count||0)>0){alert('Esta guía ya tiene movimientos de Inventario. No se elimina para proteger la trazabilidad.');return;}
  if(!confirm(`¿Eliminar la guía ${g.guide_number}?\n\nEsta acción no se puede deshacer.`)) return;
  const { error }=await supabase.from('qf_shipments').delete().eq('id',id).eq('owner_id',user.id);
  if(error){alert('No se pudo eliminar: '+error.message);return;}
  await refreshDespachos();
}

function closeModal(){document.getElementById('qfDespachosModal')?.remove(); currentGuide=null;}

function addToolbar() {
  const main=document.querySelector('#content main'); if(!main) return false;
  const h1=[...main.querySelectorAll('h1')].find(x=>x.textContent.trim()==='Despachos'); if(!h1) return false;
  const row=h1.closest('.titleRow');
  if(!row) return false;
  if(document.getElementById('qfNewGuide')) return true;
  const right=document.createElement('div'); right.className='qf-dispatch-actions'; right.innerHTML='<button id="qfNewGuide" class="primary" type="button">+ Nueva guía</button>'; row.appendChild(right);
  document.getElementById('qfNewGuide').onclick=()=>openGuideForm();
  return true;
}

function addTableActions() {
  const main=document.querySelector('#content main'); if(!main) return false;
  const h1=[...main.querySelectorAll('h1')].find(x=>x.textContent.trim()==='Despachos'); if(!h1) return false;
  const table=main.querySelector('.qf-table'); if(!table) return true;
  const head=table.querySelector('thead tr');
  if(head && ![...head.children].some(x=>x.textContent.trim()==='Acciones')) head.insertAdjacentHTML('beforeend','<th>Acciones</th>');
  table.querySelectorAll('tbody tr').forEach((tr,idx)=>{
    if(tr.querySelector('[data-qf-guide-actions]')) return;
    const guide=guidesCache[idx]; if(!guide) return;
    const td=document.createElement('td'); td.dataset.qfGuideActions='1'; td.style.whiteSpace='nowrap'; td.innerHTML=`<button type="button" data-qf-edit="${guide.id}">Editar</button> <button type="button" data-qf-delete="${guide.id}">Eliminar</button>`; tr.appendChild(td);
  });
  document.querySelectorAll('[data-qf-edit]').forEach(b=>b.onclick=()=>openGuideForm(b.dataset.qfEdit));
  document.querySelectorAll('[data-qf-delete]').forEach(b=>b.onclick=()=>deleteGuide(b.dataset.qfDelete));
  return true;
}

async function refreshDespachos(){
  await loadGuides();
  const nav=[...document.querySelectorAll('nav button')].find(b=>b.dataset.tab==='despachos');
  if(nav) nav.click();
}

async function enhance(){
  const user=await waitForUser(); if(!user) return;
  const main=document.querySelector('#content main'); if(!main) return;
  const h1=[...main.querySelectorAll('h1')].find(x=>x.textContent.trim()==='Despachos'); if(!h1) return;
  try { await loadGuides(); addToolbar(); addTableActions(); } catch(e) { console.error('QUIMFLUX Despachos CRUD:',e); }
}

let timer=null;
const observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(enhance,120);});
observer.observe(document.body,{childList:true,subtree:true});
supabase.auth.onAuthStateChange(()=>{setTimeout(enhance,250);});
setTimeout(enhance,300);
