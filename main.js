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

const today = new Date().toISOString().slice(0,10);
let user = null;
let rows = [];
let personalRows = [];
let novedadesRows = [];
let tab = 'dashboard';

let metas = {
  cumplimiento:.95, merma:.02, yield:.95, disponibilidad:.90,
  asistencia:.95, rechazo:.03, otif:.95, incidentes:0
};

function esc(v=''){
  return String(v).replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[c]));
}

function n(v){
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function pct(v){
  return (n(v)*100).toFixed(1)+'%';
}

function derive(r){
  const p=n(r.programada), q=n(r.producida), mp=n(r.mp);
  const h=n(r.horas_turno), stop=n(r.horas_paradas);
  const pp=n(r.personal_programado), pa=n(r.personal_presente);
  const rej=n(r.rechazadas), pedidos=n(r.pedidos_programados);
  const at=n(r.pedidos_tiempo);

  const merma=mp?n(r.merma)/mp:0;
  const yieldRate=mp?q/mp:0;
  const disponibilidad=h?Math.max(0,(h-stop)/h):0;
  const asistencia=pp?pa/pp:0;
  const rechazo=q?rej/q:0;

  return {
    ...r,
    cumplimiento:p?q/p:0,
    merma,
    yieldRate,
    disponibilidad,
    asistencia,
    rechazo,
    oee:disponibilidad*yieldRate*Math.max(0,1-rechazo),
    otif:pedidos?at/pedidos:0,
    costoUnitario:q?n(r.costo_produccion)/q:0,
    energiaUnit:q?n(r.energia)/q:0
  };
}

function empty(){
  return {
    fecha:today, turno:'Mañana', producto:'',
    programada:0, producida:0, mp:0, merma:0,
    horas_turno:8, horas_paradas:0,
    personal_programado:0, personal_presente:0,
    rechazadas:0, costo_produccion:0, energia:0,
    costo_mantenimiento:0, incidentes:0,
    pedidos_programados:0, pedidos_tiempo:0,
    reproceso:0, no_conformidades:0, observaciones:''
  };
}

function renderAuth(){
  app.innerHTML=`
    <div class="auth">
      <div class="authCard">
        <div class="logo">QUIMFLUX</div>
        <h1>Administrador de Planta</h1>
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
    </div>`;

  document.getElementById('authForm').onsubmit=async e=>{
    e.preventDefault();
    const msg=document.getElementById('authMsg');
    msg.textContent='Procesando…';

    const {data,error}=await supabase.auth.signInWithPassword({
      email:document.getElementById('email').value,
      password:document.getElementById('password').value
    });

    if(error) msg.textContent=error.message;
    else{
      user=data.user;
      await load();
      render();
    }
  };

  document.getElementById('signup').onclick=async()=>{
    const msg=document.getElementById('authMsg');
    msg.textContent='Creando cuenta…';

    const {data,error}=await supabase.auth.signUp({
      email:document.getElementById('email').value,
      password:document.getElementById('password').value
    });

    msg.textContent=error
      ? error.message
      : (data.session?'Cuenta creada.':'Cuenta creada. Si Supabase pide confirmación, revisa tu correo.');
  };
}

function render(){
  if(!user){
    renderAuth();
    return;
  }

  const nav=[
    ['dashboard','Dashboard'],
    ['registro','Registro Diario'],
    ['resumen','Resumen Ejecutivo'],
    ['costos','Costos'],
    ['mantenimiento','Mantenimiento'],
    ['inventario','Inventario'],
    ['personal','Personal'],
    ['ssoma','SSOMA']
  ];

  app.innerHTML=`
    <header>
      <div><b>QUIMFLUX</b><span> · Administrador de Planta V5</span></div>
      <button id="logout" class="logout">Salir</button>
    </header>
    <nav>
      ${nav.map(x=>`
        <button data-tab="${x[0]}" class="${tab===x[0]?'active':''}">
          ${x[1]}
        </button>`).join('')}
    </nav>
    <div id="content"></div>`;

  document.querySelectorAll('nav button').forEach(b=>{
    b.onclick=()=>{
      tab=b.dataset.tab;
      render();
    };
  });

  document.getElementById('logout').onclick=async()=>{
    await supabase.auth.signOut();
  };

  if(tab==='dashboard') renderDashboard();
  else if(tab==='registro') renderForm();
  else if(tab==='personal') renderPersonal();
  else renderPlaceholder(nav.find(x=>x[0]===tab)?.[1]||'QUIMFLUX');
}

function renderDashboard(){
  const d=rows.map(derive);
  const sums=key=>d.reduce((s,r)=>s+n(r[key]),0);

  const k={
    prod:sums('producida'),
    programada:sums('programada'),
    mp:sums('mp'),
    mermaKg:sums('merma'),
    stop:sums('horas_paradas'),
    hours:sums('horas_turno'),
    pp:sums('personal_programado'),
    pa:sums('personal_presente'),
    rejKg:sums('rechazadas'),
    pedidos:sums('pedidos_programados'),
    aTiempo:sums('pedidos_tiempo'),
    reproceso:sums('reproceso'),
    nc:sums('no_conformidades'),
    cum:sums('programada')?sums('producida')/sums('programada'):0,
    yield:sums('mp')?sums('producida')/sums('mp'):0,
    merma:sums('mp')?sums('merma')/sums('mp'):0,
    disp:sums('horas_turno')?Math.max(0,(sums('horas_turno')-sums('horas_paradas'))/sums('horas_turno')):0,
    asis:sums('personal_programado')?sums('personal_presente')/sums('personal_programado'):0,
    rech:sums('producida')?sums('rechazadas')/sums('producida'):0,
    otif:sums('pedidos_programados')?sums('pedidos_tiempo')/sums('pedidos_programados'):0,
    costo:sums('costo_produccion'),
    mnt:sums('costo_mantenimiento'),
    unit:sums('producida')?sums('costo_produccion')/sums('producida'):0,
    energy:sums('producida')?sums('energia')/sums('producida'):0,
    inc:sums('incidentes')
  };

  k.oee=k.disp*k.cum*Math.max(0,1-k.rech);

  const status=(value,target,invert=false)=>{
    const ok=invert?value<=target:value>=target;
    const critical=invert?value>target*1.5:value<target*0.85;
    return {
      label:critical?'CRÍTICO':ok?'OK':'REVISAR',
      cls:critical?'critical':ok?'ok':'warn'
    };
  };

  const cards=[
    ['Producción total',k.prod.toLocaleString()],
    ['Cumplimiento',pct(k.cum),status(k.cum,metas.cumplimiento)],
    ['Yield',pct(k.yield),status(k.yield,metas.yield)],
    ['Merma',pct(k.merma),status(k.merma,metas.merma,true)],
    ['Disponibilidad',pct(k.disp),status(k.disp,metas.disponibilidad)],
    ['Asistencia',pct(k.asis),status(k.asis,metas.asistencia)],
    ['Rechazo calidad',pct(k.rech),status(k.rech,metas.rechazo,true)],
    ['OEE',pct(k.oee),status(k.oee,.80)],
    ['Costo producción','S/ '+k.costo.toLocaleString()],
    ['Costo unitario','S/ '+k.unit.toFixed(3)],
    ['Mantenimiento','S/ '+k.mnt.toLocaleString()],
    ['Energía',k.energy.toFixed(3)+' kWh/kg'],
    ['Entregas a tiempo',pct(k.otif),status(k.otif,metas.otif)],
    ['Incidentes SSOMA',String(k.inc),status(k.inc,metas.incidentes,true)]
  ];

  document.getElementById('content').innerHTML=`
    <main>
      <div class="titleRow">
        <div>
          <h1>Dashboard de Administración de Planta</h1>
          <p>Datos sincronizados con Supabase · ${rows.length} registros</p>
        </div>
        <span class="online">● EN LÍNEA</span>
      </div>

      <div class="cards">
        ${cards.map(c=>`
          <div class="card">
            <small>${c[0]}</small>
            <strong>${c[1]}</strong>
            ${c.length>2?`<span class="badge ${c[2].cls}">${c[2].label}</span>`:''}
          </div>`).join('')}
      </div>

      <section class="panel">
        <h2>Últimos registros</h2>
        ${d.length?`
          <div class="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th><th>Turno</th><th>Producto</th>
                  <th>Programada</th><th>Producida</th><th>Merma</th><th>OEE</th>
                </tr>
              </thead>
              <tbody>
                ${d.slice(-20).reverse().map(r=>`
                  <tr>
                    <td>${esc(r.fecha)}</td>
                    <td>${esc(r.turno)}</td>
                    <td>${esc(r.producto)}</td>
                    <td>${n(r.programada)}</td>
                    <td>${n(r.producida)}</td>
                    <td>${n(r.merma)}</td>
                    <td>${pct(r.oee)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>`
          :'<div class="empty">Todavía no hay registros. Ve a <b>Registro Diario</b> para ingresar el primero.</div>'}
      </section>
    </main>`;
}

function renderForm(){
  const r=empty();

  document.getElementById('content').innerHTML=`
    <main>
      <h1>Registro Diario</h1>
      <p>Ingresa los datos del turno. Los KPI se calculan automáticamente.</p>

      <form id="daily" class="formGrid">
        <section>
          <h2>Producción</h2>
          ${fields.slice(0,7).map(f=>control(f,r)).join('')}
        </section>

        <section>
          <h2>Operación y personal</h2>
          ${fields.slice(7,12).map(f=>control(f,r)).join('')}
        </section>

        <section>
          <h2>Costos y energía</h2>
          ${fields.slice(12,15).map(f=>control(f,r)).join('')}
        </section>

        <section>
          <h2>Despacho y SSOMA</h2>
          ${fields.slice(15).map(f=>control(f,r)).join('')}
        </section>

        <div id="saveMsg" class="msg full"></div>
        <button class="primary full" type="submit">Guardar registro diario</button>
      </form>
    </main>`;

  document.getElementById('daily').onsubmit=async e=>{
    e.preventDefault();
    const msg=document.getElementById('saveMsg');

    const payload={user_id:user.id};

    fields.forEach(([key,,type])=>{
      const el=document.getElementById('f_'+key);
      payload[key]=type==='number'
        ?(el.value===''?null:n(el.value))
        :el.value;
    });

    msg.textContent='Guardando…';

    const {error}=await supabase.from('daily_records').insert(payload);

    if(error) msg.textContent=error.message;
    else{
      msg.textContent='Registro guardado correctamente.';
      await load();
      setTimeout(()=>render(),400);
    }
  };
}

function control(f,r){
  const [key,label,type]=f;
  let input;

  if(type==='select'){
    input=`
      <select id="f_${key}">
        <option>Mañana</option>
        <option>Tarde</option>
        <option>Noche</option>
      </select>`;
  }
  else if(type==='textarea'){
    input=`<textarea id="f_${key}">${esc(r[key])}</textarea>`;
  }
  else{
    input=`<input id="f_${key}" type="${type}" value="${esc(r[key])}" ${type==='number'?'step="any"':''}>`;
  }

  return `<label>${label}${input}</label>`;
}

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

function renderPlaceholder(title){
  document.getElementById('content').innerHTML=`
    <main>
      <h1>${esc(title)}</h1>
      <section class="panel">
        <p>Este módulo está preparado para enlazarse con su tabla correspondiente de Supabase en la siguiente fase.</p>
        <span class="badge ok">Módulo preparado</span>
      </section>
    </main>`;
}

async function load(){
  const r=await supabase.from('daily_records')
    .select('*')
    .order('fecha',{ascending:true});

  if(!r.error) rows=r.data||[];

  const s=await supabase.from('app_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  if(s.data){
    metas={
      ...metas,
      cumplimiento:n(s.data.meta_cumplimiento)||metas.cumplimiento,
      merma:n(s.data.meta_merma)||metas.merma,
      yield:n(s.data.meta_yield)||metas.yield,
      disponibilidad:n(s.data.meta_disponibilidad)||metas.disponibilidad,
      asistencia:n(s.data.meta_asistencia)||metas.asistencia,
      rechazo:n(s.data.meta_rechazo)||metas.rechazo,
      otif:n(s.data.meta_entregas)||metas.otif,
      incidentes:n(s.data.meta_incidentes)
    };
  }

  await loadPersonal();
}

supabase.auth.getSession().then(async({data})=>{
  user=data.session?.user||null;
  if(user) await load();
  render();
});

supabase.auth.onAuthStateChange((_event,session)=>{
  user=session?.user||null;
  render();
});
