import { createClient } from ‘@supabase/supabase-js’; import
‘./styles.css’;

/* ========================================================= QUIMFLUX -
ADMINISTRADOR DE PLANTA V5 main.js COMPLETO Incluye: Dashboard +
gráfico + visualizar + editar + eliminar Registros diarios +
Inventario + Personal + SSOMA + Mantenimiento
========================================================= */

const SUPABASE_URL=‘https://cgkdztwtodmdteohvuoh.supabase.co’; const
SUPABASE_KEY=‘sb_publishable_sULeDyfJ1l5xfuVhFgXRKA_bsim9qSe’; const
supabase=createClient(SUPABASE_URL,SUPABASE_KEY); const
app=document.getElementById(‘app’); const today=new
Date().toISOString().slice(0,10);

let user=null; let rows=[]; let inventoryRows=[]; let ssomaRows=[]; let
personalRows=[]; let maintenanceRows=[]; let tab=‘dashboard’;

let editingDailyId=null; let editingInventoryId=null; let
editingSsomaId=null; let editingPersonalId=null; let
editingMaintenanceId=null;

let metas={ cumplimiento:.95, merma:.02, yield:.95, disponibilidad:.90,
asistencia:.95, rechazo:.03, otif:.95, incidentes:0 };

/* ========================================================= UTILIDADES
========================================================= */

function esc(v=’‘){ return
String(v).replace(/[&<>“’]/g,c=>({’&‘:’&‘,’<‘:’<‘,’>‘:’>‘,’“‘:’”‘,“’“:’'’
}[c])); }

function n(v){ const x=Number(v); return Number.isFinite(x)?x:0; }

function pct(v){ return
v===null||v===undefined||!Number.isFinite(Number(v))
?‘—’:(Number(v)*100).toFixed(1)+‘%’; }

function msg(id,text){ const el=document.getElementById(id);
if(el)el.textContent=text; }

function status(value,target,invert=false){
if(value===null||value===undefined|| !Number.isFinite(Number(value))||
!Number.isFinite(Number(target))){ return {label:‘SIN DATOS’,cls:‘ok’};
} const v=Number(value),t=Number(target); const ok=invert?v<=t:v>=t;
const critical=invert?v>t1.5:v<t.85; return {
label:critical?‘CRÍTICO’:ok?‘OK’:‘REVISAR’,
cls:critical?‘critical’:ok?‘ok’:‘warn’ }; }

/* ========================================================= REGISTRO
DIARIO ========================================================= */

const fields=[ [‘fecha’,‘Fecha’,‘date’], [‘turno’,‘Turno’,‘select’],
[‘producto’,‘Producto’,‘text’], [‘programada’,‘Cantidad
programada’,‘number’], [‘producida’,‘Cantidad producida’,‘number’],
[‘mp’,‘Materia prima consumida’,‘number’], [‘merma’,‘Merma’,‘number’],
[‘horas_turno’,‘Horas de turno’,‘number’], [‘horas_paradas’,‘Horas de
parada’,‘number’], [‘personal_programado’,‘Personal
programado’,‘number’], [‘personal_presente’,‘Personal
presente’,‘number’], [‘rechazadas’,‘Unidades rechazadas’,‘number’],
[‘costo_produccion’,‘Costo producción (S/)’,‘number’],
[‘energia’,‘Energía (kWh)’,‘number’], [‘costo_mantenimiento’,‘Costo
mantenimiento (S/)’,‘number’], [‘incidentes’,‘Incidentes
SSOMA’,‘number’], [‘pedidos_programados’,‘Pedidos
programados’,‘number’], [‘pedidos_tiempo’,‘Pedidos a tiempo’,‘number’],
[‘reproceso’,‘Reproceso’,‘number’], [‘no_conformidades’,‘No
conformidades’,‘number’], [‘observaciones’,‘Observaciones’,‘textarea’]];

function derive(r){ const p=n(r.programada),q=n(r.producida),mp=n(r.mp);
const h=n(r.horas_turno),stop=n(r.horas_paradas); const
pp=n(r.personal_programado),pa=n(r.personal_presente); const
rej=n(r.rechazadas),ped=n(r.pedidos_programados); const
at=n(r.pedidos_tiempo),mermaCantidad=n(r.merma);

const cumplimiento=p>0?q/p:null; const yieldRate=mp>0?q/mp:null; const
merma=mp>0?mermaCantidad/mp:null; const
disponibilidad=h>0?Math.max(0,(h-stop)/h):null; const
asistencia=pp>0?pa/pp:null; const rechazo=q>0?rej/q:null; const
otif=ped>0?at/ped:null; const
oee=disponibilidad!==null&&cumplimiento!==null&&rechazo!==null
?disponibilidadcumplimientoMath.max(0,1-rechazo):null;

return { …r,mermaCantidad,cumplimiento,yieldRate,merma,
disponibilidad,asistencia,rechazo,otif,oee,
costoUnitario:q>0?n(r.costo_produccion)/q:null,
energiaUnit:q>0?n(r.energia)/q:null }; }

function empty(){ return { fecha:today,turno:‘Mañana’,producto:’‘,
programada:0,producida:0,mp:0,merma:0, horas_turno:8,horas_paradas:0,
personal_programado:0,personal_presente:0,
rechazadas:0,costo_produccion:0,energia:0,
costo_mantenimiento:0,incidentes:0,
pedidos_programados:0,pedidos_tiempo:0,
reproceso:0,no_conformidades:0,observaciones:’’ }; }

/* ========================================================= LOGIN
========================================================= */

function renderAuth(){ if(!app)return;
app.innerHTML=<div class="auth">       <h1>QUIMFLUX</h1>       <h2>Administrador de Planta</h2>       <p>Inicia sesión para acceder al dashboard.</p>       <form id="authForm">         <label>Correo           <input id="email" type="email" required autocomplete="email">         </label>         <label>Contraseña           <input id="password" type="password" minlength="6" required autocomplete="current-password">         </label>         <div id="authMsg" class="msg"></div>         <button class="primary" type="submit">Entrar</button>         <button class="link" id="signup" type="button">Crear una cuenta</button>       </form>     </div>;
const email=document.getElementById(‘email’); const
password=document.getElementById(‘password’);

document.getElementById(‘authForm’).onsubmit=async e=>{
e.preventDefault(); msg(‘authMsg’,‘Iniciando sesión…’); const
{data,error}=await supabase.auth.signInWithPassword({
email:email.value.trim(),password:password.value });
if(error){msg(‘authMsg’,error.message);return;} user=data.user; await
load(); render(); };

document.getElementById(‘signup’).onclick=async()=>{ const
em=email.value.trim(),pw=password.value;
if(!em||!pw){msg(‘authMsg’,‘Ingresa correo y contraseña.’);return;}
msg(‘authMsg’,‘Creando cuenta…’); const {data,error}=await
supabase.auth.signUp({email:em,password:pw});
if(error){msg(‘authMsg’,error.message);return;}
msg(‘authMsg’,data.session?‘Cuenta creada correctamente.’: ‘Cuenta
creada. Revisa tu correo si Supabase solicita confirmación.’); }; }

/* ========================================================= RENDER
PRINCIPAL ========================================================= */

function render(){ if(!app)return; if(!user){renderAuth();return;}

const nav=[ [‘dashboard’,‘Dashboard’],[‘registro’,‘Registro Diario’],
[‘resumen’,‘Resumen Ejecutivo’],[‘costos’,‘Costos’],
[‘mantenimiento’,‘Mantenimiento’],[‘inventario’,‘Inventario’],
[‘personal’,‘Personal’],[‘ssoma’,‘SSOMA’] ];

app.innerHTML=<header>       <div><b>QUIMFLUX</b><span> · Administrador de Planta V5</span></div>       <button id="logout">Salir</button>     </header>     <nav>       ${nav.map(x=>
${x[1]} ).join('')}     </nav>     <div id="content"></div>;

document.querySelectorAll(‘nav button’).forEach(b=>{ b.onclick=()=>{
tab=b.dataset.tab; if(tab!==‘registro’)editingDailyId=null; render(); };
});

document.getElementById(‘logout’).onclick=async()=>{ await
supabase.auth.signOut();
user=null;rows=[];inventoryRows=[];ssomaRows=[];personalRows=[];maintenanceRows=[];
editingDailyId=null;editingInventoryId=null;editingSsomaId=null;
editingPersonalId=null;editingMaintenanceId=null; render(); };

try{ if(tab===‘dashboard’)renderDashboard(); else
if(tab===‘registro’)renderForm(); else
if(tab===‘resumen’)renderResumen(); else
if(tab===‘inventario’)renderInventory(); else
if(tab===‘personal’)renderPersonal(); else
if(tab===‘ssoma’)renderSsoma(); else
if(tab===‘mantenimiento’)renderMaintenance(); else
renderPlaceholder(nav.find(x=>x[0]===tab)?.[1]||‘QUIMFLUX’);
}catch(error){ console.error(‘Error renderizando QUIMFLUX:’,error);
const content=document.getElementById(‘content’);
if(content)content.innerHTML=<main><section class="panel">         <h1>Error al cargar el módulo</h1>         <p>Se produjo un error al renderizar QUIMFLUX.</p>         <pre style="white-space:pre-wrap">${esc(error?.message||error)}</pre>         <button onclick="location.reload()">Recargar</button>       </section></main>;
} }

/* ========================================================= ALERTAS
========================================================= */

function getAlerts(){ const alerts=[]; const d=rows.map(derive); const
sum=k=>d.reduce((s,r)=>s+n(r[k]),0);

const programada=sum(‘programada’),producida=sum(‘producida’); const
mp=sum(‘mp’),merma=sum(‘merma’); const
horas=sum(‘horas_turno’),paradasDiarias=sum(‘horas_paradas’); const
pp=sum(‘personal_programado’),pa=sum(‘personal_presente’); const
rechazadas=sum(‘rechazadas’),ped=sum(‘pedidos_programados’); const
at=sum(‘pedidos_tiempo’);

const existe=programada>0||producida>0||mp>0||merma>0||horas>0||
paradasDiarias>0||pp>0||pa>0||rechazadas>0||ped>0||at>0;

if(existe){ const cumplimiento=programada>0?producida/programada:null;
const yieldRate=mp>0?producida/mp:null; const
mermaRate=mp>0?merma/mp:null; const
mtStop=maintenanceRows.reduce((s,r)=>s+n(r.horas_parada),0); const
paradas=mtStop>0?mtStop:paradasDiarias; const
disponibilidad=horas>0?Math.max(0,(horas-paradas)/horas):null; const
asistencia=pp>0?pa/pp:null; const
rechazo=producida>0?rechazadas/producida:null; const
otif=ped>0?at/ped:null; const
oee=disponibilidad!==null&&cumplimiento!==null&&rechazo!==null
?disponibilidadcumplimientoMath.max(0,1-rechazo):null;

    [
      ['Cumplimiento',cumplimiento,metas.cumplimiento],
      ['Yield',yieldRate,metas.yield],
      ['Disponibilidad',disponibilidad,metas.disponibilidad],
      ['Asistencia',asistencia,metas.asistencia],
      ['OTIF',otif,metas.otif],
      ['OEE',oee,.80]
    ].forEach(k=>{
      if(k[1]!==null&&k[1]<k[2]*.85)
        alerts.push({nivel:'critical',titulo:`${k[0]} en nivel crítico`,
          detalle:`${pct(k[1])} · Meta ${pct(k[2])}`});
      else if(k[1]!==null&&k[1]<k[2])
        alerts.push({nivel:'warn',titulo:`${k[0]} requiere revisión`,
          detalle:`${pct(k[1])} · Meta ${pct(k[2])}`});
    });

    if(mermaRate!==null&&mermaRate>metas.merma*1.5)
      alerts.push({nivel:'critical',titulo:'Merma en nivel crítico',
        detalle:`${pct(mermaRate)} · Meta máxima ${pct(metas.merma)}`});
    else if(mermaRate!==null&&mermaRate>metas.merma)
      alerts.push({nivel:'warn',titulo:'Merma por encima de la meta',
        detalle:`${pct(mermaRate)} · Meta máxima ${pct(metas.merma)}`});

    if(rechazo!==null&&rechazo>metas.rechazo*1.5)
      alerts.push({nivel:'critical',titulo:'Rechazo de calidad crítico',
        detalle:`${pct(rechazo)} · Meta máxima ${pct(metas.rechazo)}`});
    else if(rechazo!==null&&rechazo>metas.rechazo)
      alerts.push({nivel:'warn',titulo:'Rechazo de calidad elevado',
        detalle:`${pct(rechazo)} · Meta máxima ${pct(metas.rechazo)}`});

    const incidentes=sum('incidentes');
    if(incidentes>metas.incidentes)
      alerts.push({nivel:incidentes>=2?'critical':'warn',
        titulo:'Incidentes SSOMA registrados',
        detalle:`${incidentes} incidente(s) · Meta ${metas.incidentes}`});

}

inventoryRows.forEach(r=>{ const
stock=n(r.stock_inicial)+n(r.entradas)-n(r.salidas); const
min=n(r.stock_minimo); if(min>0&&stock<=min)
alerts.push({nivel:‘critical’,titulo:Stock bajo: ${r.material},
detalle:Stock actual ${stock} ${r.unidad||''} · Mínimo ${min} ${r.unidad||''}});
});

maintenanceRows.forEach(r=>{ const
e=String(r.estado||’‘).trim().toLowerCase(); if(e===’abierto’||e===‘en
proceso’)
alerts.push({nivel:‘warn’,titulo:Mantenimiento pendiente: ${r.equipo},
detalle:${r.estado} · ${r.fecha||'Sin fecha'}});
if(e===‘programado’&&r.fecha_programada&&r.fecha_programada<today)
alerts.push({nivel:‘critical’,titulo:Mantenimiento vencido: ${r.equipo},
detalle:Programado para ${r.fecha_programada}}); });

ssomaRows.forEach(r=>{ const
e=String(r.estado||’‘).trim().toLowerCase(); if(e!==’cerrado’){ const
g=String(r.gravedad||’‘).trim().toLowerCase(); alerts.push({
nivel:g===’grave’||g===‘crítica’?‘critical’:‘warn’, titulo:‘Incidente
SSOMA abierto’,
detalle:${r.tipo||'Incidente'} · ${r.gravedad||'Sin gravedad'} · ${r.fecha||''}
}); } });

alerts.sort((a,b)=>{ const p={critical:1,warn:2,ok:3}; return
p[a.nivel]-p[b.nivel]; }); return alerts; }

function renderAlerts(){ const alerts=getAlerts(); if(!alerts.length){
const hay=rows.some(r=>[
‘programada’,‘producida’,‘mp’,‘merma’,‘horas_turno’,
‘horas_paradas’,‘personal_programado’,‘personal_presente’,
‘rechazadas’,‘pedidos_programados’,‘pedidos_tiempo’
].some(k=>n(r[k])>0)); return
<section class="panel">         <div class="titleRow">           <div>             <h2>🚨 Alertas QUIMFLUX</h2>             <p>${hay?'No se detectan desviaciones que requieran atención.':               'Todavía no existen datos operativos suficientes para evaluar los KPI.'}</p>           </div>           <span class="badge ok">${hay?'✓ PLANTA SIN ALERTAS':'0 CRÍTICAS'}</span>         </div>         ${hay?'':

Los KPI permanecerán como SIN DATOS hasta que ingreses datos reales.

}       </section>; }

const critical=alerts.filter(a=>a.nivel===‘critical’).length; const
warnings=alerts.filter(a=>a.nivel===‘warn’).length;

return
<section class="panel">       <div class="titleRow">         <div><h2>🚨 Alertas QUIMFLUX</h2><p>Desviaciones que requieren atención.</p></div>         <div style="display:flex;gap:8px;flex-wrap:wrap">           ${critical?criticalCRÍTICA{critical>1?‘S’:’’}:''}           ${warnings?warningsREVISIÓN{warnings>1?‘ES’:’’}:''}         </div>       </div>       <div style="display:flex;flex-direction:column;gap:10px">         ${alerts.map(a=>
            <span class="badge ${a.nivel}">${a.nivel==='critical'?'CRÍTICO':'REVISAR'}</span>
            <div><strong>${esc(a.titulo)}</strong><div><small>${esc(a.detalle)}</small></div></div>
          </div>`).join('')}
      </div>
    </section>`;

}

/* ========================================================= MÉTRICAS +
GRÁFICO ========================================================= */

function aggregateMetrics(data,useMaintenance=true){ const
d=(Array.isArray(data)?data:[]).map(derive); const
sum=k=>d.reduce((s,r)=>s+n(r[k]),0); const
programada=sum(‘programada’),producida=sum(‘producida’),mp=sum(‘mp’);
const mermaCantidad=sum(‘mermaCantidad’),horas=sum(‘horas_turno’); const
paradasDiarias=sum(‘horas_paradas’); const
pp=sum(‘personal_programado’),pa=sum(‘personal_presente’); const
rechazadas=sum(‘rechazadas’),ped=sum(‘pedidos_programados’); const
pedidosTiempo=sum(‘pedidos_tiempo’),costo=sum(‘costo_produccion’); const
energiaTotal=sum(‘energia’),incidentes=sum(‘incidentes’);

const cumplimiento=programada>0?producida/programada:null; const
yieldRate=mp>0?producida/mp:null; const
merma=mp>0?mermaCantidad/mp:null; const asistencia=pp>0?pa/pp:null;
const rechazo=producida>0?rechazadas/producida:null; const
otif=ped>0?pedidosTiempo/ped:null; const
mtStop=useMaintenance?maintenanceRows.reduce((s,r)=>s+n(r.horas_parada),0):0;
const paradas=useMaintenance&&mtStop>0?mtStop:paradasDiarias; const
disponibilidad=horas>0?Math.max(0,(horas-paradas)/horas):null; const
oee=disponibilidad!==null&&cumplimiento!==null&&rechazo!==null
?disponibilidadcumplimientoMath.max(0,1-rechazo):null;

return { d,programada,producida,mp,mermaCantidad,merma,horas,paradas,
pp,pa,rechazadas,ped,pedidosTiempo,costo,energiaTotal,incidentes,
cumplimiento,yieldRate,disponibilidad,asistencia,rechazo,otif,oee,
costoUnitario:producida>0?costo/producida:null,
energia:producida>0?energiaTotal/producida:null }; }

function trendClass(values){ const
clean=values.filter(v=>v!==null&&Number.isFinite(v));
if(clean.length<2)return{arrow:‘→’,label:‘SIN DATOS’,cls:‘ok’}; const
delta=clean.at(-1)-clean[0];
if(Math.abs(delta)<.005)return{arrow:‘→’,label:‘ESTABLE’,cls:‘ok’};
return delta>0 ?{arrow:‘↑’,label:‘MEJORANDO’,cls:‘ok’}
:{arrow:‘↓’,label:‘EMPEORANDO’,cls:‘warn’}; }

function trendData(){ const sorted=[…rows].map(derive).sort((a,b)=>
String(a.fecha||’‘).localeCompare(String(b.fecha||’‘))); const
byDate=new Map(); sorted.forEach(r=>{ const key=r.fecha||’Sin fecha’;
if(!byDate.has(key))byDate.set(key,[]); byDate.get(key).push(r); });
return […byDate.entries()].map(([fecha,items])=>{ const
m=aggregateMetrics(items,false); return { fecha,
cumplimiento:m.cumplimiento===null?null:m.cumplimiento100,
yieldRate:m.yieldRate===null?null:m.yieldRate100,
oee:m.oee===null?null:m.oee100, meta:metas.cumplimiento100 }; }); }

function renderTrendChart(data){
if(!data.length)return<div class="empty">Todavía no hay suficientes registros para mostrar la tendencia.</div>;

const W=1000,H=360,left=58,right=22,top=24,bottom=58; const
plotW=W-left-right,plotH=H-top-bottom,maxY=120,minY=0; const
x=i=>data.length===1?left+plotW/2:left+iplotW/(data.length-1); const
y=v=>top+plotH-((v-minY)/(maxY-minY))plotH;

const
grid=[0,20,40,60,80,100,120].map(v=><line x1="${left}" y1="${y(v)}" x2="${W-right}" y2="${y(v)}" stroke="currentColor" opacity=".14"/>     <text x="${left-10}" y="${y(v)+4}" text-anchor="end" font-size="12" fill="currentColor" opacity=".72">${v}%</text>).join(’’);

const
colors={cumplimiento:‘#5eead4’,yieldRate:‘#c084fc’,oee:‘#f472b6’,meta:‘#fbbf24’};

function path(key){ const pts=[]; let segment=[]; data.forEach((r,i)=>{
if(r[key]===null||!Number.isFinite(r[key])){
if(segment.length)pts.push(segment); segment=[]; }else
segment.push(${x(i).toFixed(1)},${y(r[key]).toFixed(1)}); });
if(segment.length)pts.push(segment); return
pts.map(p=><polyline points="${p.join(' ')}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>).join(’’);
}

const
lines=[‘cumplimiento’,‘yieldRate’,‘oee’].map(key=><g style="color:${colors[key]}">       ${path(key)}       ${data.map((r,i)=>r[key]===null?'':).join('')}     </g>).join(’’);

const metaY=y(metas.cumplimiento*100);

const labels=data.map((r,i)=>{ const
show=data.length<=8||i===0||i===data.length-1||i%Math.ceil(data.length/8)===0;
return
show?<text x="${x(i)}" y="${H-20}" text-anchor="middle" font-size="11" fill="currentColor" opacity=".75">${esc(r.fecha)}</text>:’‘;
}).join(’’);

return
<div class="trendLegend">       <span><i style="background:${colors.cumplimiento}"></i>Cumplimiento</span>       <span><i style="background:${colors.yieldRate}"></i>Yield</span>       <span><i style="background:${colors.oee}"></i>OEE</span>       <span><i class="dash" style="background:${colors.meta}"></i>Meta ${pct(metas.cumplimiento)}</span>     </div>     <div style="width:100%;overflow-x:auto">       <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Tendencias de cumplimiento, yield y OEE">         ${grid}         <line x1="${left}" y1="${metaY}" x2="${W-right}" y2="${metaY}" stroke="${colors.meta}" stroke-width="2" stroke-dasharray="8 6"/>         <text x="${W-right-4}" y="${metaY-8}" text-anchor="end" font-size="12" fill="${colors.meta}">META ${pct(metas.cumplimiento)}</text>         ${lines}${labels}       </svg>     </div>;
}

/* ========================================================= DASHBOARD
========================================================= */

function renderDashboard(){ const metrics=aggregateMetrics(rows); const
latest=metrics.d.length?metrics.d.at(-1):null; const
latestMetrics=latest?aggregateMetrics([latest],false):null; const
trend=trendData();

const cards=[ [‘Producción total’,metrics.producida.toLocaleString()],
[‘Cumplimiento’,pct(metrics.cumplimiento),status(metrics.cumplimiento,metas.cumplimiento)],
[‘Yield’,pct(metrics.yieldRate),status(metrics.yieldRate,metas.yield)],
[‘Merma’,pct(metrics.merma),status(metrics.merma,metas.merma,true)],
[‘Disponibilidad’,pct(metrics.disponibilidad),status(metrics.disponibilidad,metas.disponibilidad)],
[‘Asistencia’,pct(metrics.asistencia),status(metrics.asistencia,metas.asistencia)],
[‘Rechazo
calidad’,pct(metrics.rechazo),status(metrics.rechazo,metas.rechazo,true)],
[‘OEE’,pct(metrics.oee),status(metrics.oee,.80)], [‘Costo
producción’,‘S/’+metrics.costo.toLocaleString()], [‘Costo
mantenimiento’,‘S/’+maintenanceRows.reduce((t,r)=>t+n(r.costo),0).toLocaleString()],
[‘Horas parada’,metrics.paradas.toFixed(2)+’ h’], [‘Costo
unitario’,metrics.costoUnitario===null?‘—’:‘S/’+metrics.costoUnitario.toFixed(3)],
[‘Energía’,metrics.energia===null?‘—’:metrics.energia.toFixed(3)+’
kWh/unidad’], [‘Entregas a
tiempo’,pct(metrics.otif),status(metrics.otif,metas.otif)], [‘Incidentes
SSOMA’,String(metrics.incidentes),status(metrics.incidentes,metas.incidentes,true)]
];

const
tc=trendClass(trend.map(x=>x.cumplimiento===null?null:x.cumplimiento/100));
const
ty=trendClass(trend.map(x=>x.yieldRate===null?null:x.yieldRate/100));
const to=trendClass(trend.map(x=>x.oee===null?null:x.oee/100));

const comparison=latest?[
[‘Cumplimiento’,latest.cumplimiento,metrics.cumplimiento],
[‘Yield’,latest.yieldRate,metrics.yieldRate],
[‘Merma’,latest.merma,metrics.merma],
[‘Disponibilidad’,latest.disponibilidad,metrics.disponibilidad],
[‘Asistencia’,latest.asistencia,metrics.asistencia],
[‘Rechazo’,latest.rechazo,metrics.rechazo],
[‘OEE’,latest.oee,metrics.oee], [‘OTIF’,latest.otif,metrics.otif] ]:[];

document.getElementById(‘content’).innerHTML=`
        <div>
          <h1>Dashboard de Administración de Planta</h1>
          <p>Datos sincronizados con Supabase · ${rows.length} registros diarios · ${maintenanceRows.length} mantenimientos</p>
        </div>
        <span class="online">● EN LÍNEA</span>
      </div>

      ${renderAlerts()}

      ${latest?`
        <section class="panel">
          <h2>Último turno</h2>
          <p>${esc(latest.fecha)} · ${esc(latest.turno)} · ${esc(latest.producto||'Sin producto')}</p>
          <span class="badge ok">REGISTRO MÁS RECIENTE</span>
          <div class="cards">
            ${[
              ['Cumplimiento',latest.cumplimiento,metas.cumplimiento],
              ['Yield',latest.yieldRate,metas.yield],
              ['Merma',latest.merma,metas.merma,true],
              ['Disponibilidad',latest.disponibilidad,metas.disponibilidad],
              ['Asistencia',latest.asistencia,metas.asistencia],
              ['Rechazo calidad',latest.rechazo,metas.rechazo,true],
              ['OEE',latest.oee,.80],
              ['OTIF',latest.otif,metas.otif]
            ].map(k=>{
              const st=status(k[1],k[2],k[3]||false);
              return `<div class="card"><small>${k[0]}</small><strong>${pct(k[1])}</strong><span class="badge ${st.cls}">${st.label}</span></div>`;
            }).join('')}
          </div>
          <p><b>Producción del último turno:</b> ${n(latest.producida).toLocaleString()} de ${n(latest.programada).toLocaleString()} programados.</p>
        </section>`:''}

      <section class="panel">
        <h2>Indicadores acumulados de planta</h2>
        <p>Consolidado de todos los registros diarios.</p>
        <span class="badge ok">HISTÓRICO</span>
        <div class="cards">
          ${cards.map(c=>`<div class="card"><small>${esc(c[0])}</small><strong>${esc(c[1])}</strong>${c[2]?`<span class="badge ${c[2].cls}">${c[2].label}</span>`:''}</div>`).join('')}
        </div>
      </section>

      ${comparison.length?`
        <section class="panel">
          <h2>Comparativa: último turno vs histórico</h2>
          <div class="tableWrap"><table>
            <thead><tr><th>Indicador</th><th>Último turno</th><th>Histórico</th><th>Diferencia</th></tr></thead>
            <tbody>
              ${comparison.map(([name,last,hist])=>{
                const diff=last===null||hist===null?null:(last-hist)*100;
                return `<tr><td>${esc(name)}</td><td>${pct(last)}</td><td>${pct(hist)}</td><td>${diff===null?'—':(diff>=0?'+':'')+diff.toFixed(1)+' pp'}</td></tr>`;
              }).join('')}
            </tbody>
          </table></div>
        </section>`:''}

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
          ${cards.slice(0,8).map(c=>`<div class="card"><small>${esc(c[0])}</small><strong>${esc(c[1])}</strong>${c[2]?`<span class="badge ${c[2].cls}">${c[2].label}</span>`:''}</div>`).join('')}
        </div>
      </section>

      <section class="panel">
        <h2>Últimos registros</h2>
        ${metrics.d.length?`
          <div class="tableWrap"><table>
            <thead><tr>
              <th>Fecha</th><th>Turno</th><th>Producto</th>
              <th>Programada</th><th>Producida</th><th>Merma</th><th>OEE</th><th>Acciones</th>
            </tr></thead>
            <tbody>
              ${metrics.d.slice(-20).reverse().map(r=>`
                <tr>
                  <td>${esc(r.fecha)}</td>
                  <td>${esc(r.turno)}</td>
                  <td>${esc(r.producto)}</td>
                  <td>${n(r.programada).toLocaleString()}</td>
                  <td>${n(r.producida).toLocaleString()}</td>
                  <td>${pct(r.merma)}</td>
                  <td>${pct(r.oee)}</td>
                  <td>
                    <div style="display:flex;gap:6px;flex-wrap:wrap">
                      <button type="button" data-view-id="${esc(r.id)}">👁 Visualizar</button>
                      <button type="button" data-edit-daily="${esc(r.id)}">✏️ Editar</button>
                      <button type="button" data-delete-id="${esc(r.id)}">🗑 Eliminar</button>
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table></div>`
          :`<div class="empty">Todavía no hay registros. Ve a <b>Registro Diario</b> para ingresar el primero.</div>`}
      </section>
    </main>`;

document.querySelectorAll(‘[data-view-id]’).forEach(b=>{
b.onclick=()=>viewRecord(b.dataset.viewId); });
document.querySelectorAll(‘[data-edit-daily]’).forEach(b=>{
b.onclick=()=>editDailyRecord(b.dataset.editDaily); });
document.querySelectorAll(‘[data-delete-id]’).forEach(b=>{
b.onclick=()=>deleteRecord(b.dataset.deleteId); }); }

/* ========================================================= VISUALIZAR
/ EDITAR / ELIMINAR DIARIO
========================================================= */

function viewRecord(id){ const
row=rows.find(r=>String(r.id)===String(id)); if(!row){alert(‘No se
encontró el registro.’);return;} const r=derive(row); alert(`REGISTRO
DIARIO

Fecha: ${r.fecha||’‘} Turno: ${r.turno||’‘} Producto: ${r.producto||’Sin
producto’}

PRODUCCIÓN Programada: ${n(r.programada).toLocaleString()} Producida:
${n(r.producida).toLocaleString()} Materia prima:
${n(r.mp).toLocaleString()} Merma:
${n(r.mermaCantidad).toLocaleString()}

KPI Cumplimiento: ${pct(r.cumplimiento)} Yield: ${pct(r.yieldRate)}
Merma: ${pct(r.merma)} Disponibilidad: ${pct(r.disponibilidad)}
Asistencia: ${pct(r.asistencia)} Rechazo: ${pct(r.rechazo)} OEE:
${pct(r.oee)} OTIF: ${pct(r.otif)}

OPERACIÓN Horas de turno: ${n(r.horas_turno)} Horas de parada:
${n(r.horas_paradas)} Personal programado: ${n(r.personal_programado)}
Personal presente: ${n(r.personal_presente)}

COSTOS Costo producción: S/ ${n(r.costo_produccion).toLocaleString()}
Energía: ${n(r.energia).toLocaleString()} kWh Costo mantenimiento: S/
${n(r.costo_mantenimiento).toLocaleString()}

CALIDAD / SSOMA Rechazadas: ${n(r.rechazadas)} Reproceso:
${n(r.reproceso)} No conformidades: ${n(r.no_conformidades)} Incidentes:
${n(r.incidentes)}

Observaciones: ${r.observaciones||‘Sin observaciones’}`); }

function editDailyRecord(id){ const
row=rows.find(r=>String(r.id)===String(id)); if(!row){alert(‘No se
encontró el registro.’);return;} editingDailyId=row.id; tab=‘registro’;
render(); requestAnimationFrame(()=>{ fields.forEach(([key])=>{ const
el=document.getElementById(‘f_’+key); if(el)el.value=row[key]??’‘; });
window.scrollTo({top:0,behavior:’smooth’}); }); }

async function deleteRecord(id){ const
row=rows.find(r=>String(r.id)===String(id)); if(!row){alert(‘No se
encontró el registro.’);return;}
if(!confirm(¿Eliminar ${row.fecha} · ${row.turno} · ${row.producto||'Sin producto'}?\n\nEsta acción no se puede deshacer.))return;
const {error}=await
supabase.from(‘daily_records’).delete().eq(‘id’,id).eq(‘user_id’,user.id);
if(error){alert(‘No se pudo eliminar:’+error.message);return;} await
load(); render(); }

/* ========================================================= FORMULARIO
DIARIO ========================================================= */

function control([key,label,type],r){ let input; if(type===‘select’){
input=<select id="f_${key}">       <option ${r[key]==='Mañana'?'selected':''}>Mañana</option>       <option ${r[key]==='Tarde'?'selected':''}>Tarde</option>       <option ${r[key]==='Noche'?'selected':''}>Noche</option>     </select>;
}else if(type===‘textarea’){
input=<textarea id="f_${key}">${esc(r[key]||'')}</textarea>; }else{
input=<input id="f_${key}" type="${type}" value="${esc(r[key]??'')}" ${type==='number'?'step="any" min="0"':''}>;
} return <label>${esc(label)}${input}</label>; }

function renderForm(){ const row=editingDailyId
?rows.find(r=>String(r.id)===String(editingDailyId)) :null; const
r=row||empty();

document.getElementById(‘content’).innerHTML=`
        <div>
          <h1>${editingDailyId?'Editar Registro Diario':'Registro Diario'}</h1>
          <p>Ingresa los datos del turno. Los KPI se calculan automáticamente.</p>
        </div>
        ${editingDailyId?'<span class="badge warn">MODO EDICIÓN</span>':''}
      </div>

      <form id="daily" class="formGrid">
        <section><h2>Producción</h2>${fields.slice(0,7).map(f=>control(f,r)).join('')}</section>
        <section><h2>Operación y personal</h2>${fields.slice(7,12).map(f=>control(f,r)).join('')}</section>
        <section><h2>Costos y energía</h2>${fields.slice(12,15).map(f=>control(f,r)).join('')}</section>
        <section><h2>Despacho y SSOMA</h2>${fields.slice(15).map(f=>control(f,r)).join('')}</section>
        <div id="saveMsg" class="msg full"></div>
        <div class="full" style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="primary" type="submit">${editingDailyId?'Actualizar registro diario':'Guardar registro diario'}</button>
          ${editingDailyId?'<button id="cancelDailyEdit" type="button">Cancelar edición</button>':''}
        </div>
      </form>
    </main>`;

document.getElementById(‘daily’).onsubmit=saveDailyRecord;
document.getElementById(‘cancelDailyEdit’)?.addEventListener(‘click’,()=>{
editingDailyId=null; renderForm(); }); }

async function saveDailyRecord(e){ e.preventDefault(); const
payload={user_id:user.id};

fields.forEach(([key,,type])=>{ const
el=document.getElementById(‘f_’+key); if(!el)return;
payload[key]=type===‘number’ ?(el.value===’’?null:n(el.value))
:el.value; });

if(!payload.fecha){msg(‘saveMsg’,‘Debes ingresar la fecha.’);return;}
if(payload.programada!==null&&payload.programada<0){msg(‘saveMsg’,‘La
cantidad programada no puede ser negativa.’);return;}
if(payload.producida!==null&&payload.producida<0){msg(‘saveMsg’,‘La
cantidad producida no puede ser negativa.’);return;}
if(payload.mp!==null&&payload.mp<0){msg(‘saveMsg’,‘La materia prima no
puede ser negativa.’);return;}

msg(‘saveMsg’,editingDailyId?‘Actualizando registro…’:‘Guardando
registro…’);

const result=editingDailyId ?await
supabase.from(‘daily_records’).update(payload).eq(‘id’,editingDailyId).eq(‘user_id’,user.id)
:await supabase.from(‘daily_records’).insert(payload);

if(result.error){msg(‘saveMsg’,‘Error:’+result.error.message);return;}

editingDailyId=null; await load(); msg(‘saveMsg’,‘Registro guardado
correctamente.’); setTimeout(()=>render(),400); }

/* ========================================================= RESUMEN
EJECUTIVO ========================================================= */

function renderResumen(){ const m=aggregateMetrics(rows); const
mantenimientoSup=maintenanceRows.reduce((s,r)=>s+n(r.costo),0); const
mantenimientoDiario=rows.reduce((s,r)=>s+n(r.costo_mantenimiento),0);
const
mantenimiento=mantenimientoSup>0?mantenimientoSup:mantenimientoDiario;
const kpis=[ [‘Cumplimiento’,m.cumplimiento,metas.cumplimiento],
[‘Yield’,m.yieldRate,metas.yield], [‘Merma’,m.merma,metas.merma,true],
[‘Disponibilidad’,m.disponibilidad,metas.disponibilidad],
[‘Asistencia’,m.asistencia,metas.asistencia],
[‘Rechazo’,m.rechazo,metas.rechazo,true], [‘OEE’,m.oee,.80],
[‘OTIF’,m.otif,metas.otif] ];

document.getElementById(‘content’).innerHTML=`
Resumen Ejecutivo
Visión consolidada del desempeño de la planta.
Indicadores principales
        <div class="cards">${kpis.map(k=>{
          const s=status(k[1],k[2],k[3]||false);
          return `<div class="card"><small>${k[0]}</small><strong>${pct(k[1])}</strong><span class="badge ${s.cls}">${s.label}</span></div>`;
        }).join('')}</div>
      </section>

      <section class="panel"><h2>Producción</h2><div class="cards">
        <div class="card"><small>Producción programada</small><strong>${m.programada.toLocaleString()}</strong></div>
        <div class="card"><small>Producción real</small><strong>${m.producida.toLocaleString()}</strong></div>
        <div class="card"><small>Materia prima consumida</small><strong>${m.mp.toLocaleString()}</strong></div>
        <div class="card"><small>Merma</small><strong>${m.mermaCantidad.toLocaleString()}</strong></div>
        <div class="card"><small>Horas de turno</small><strong>${m.horas.toFixed(1)}</strong></div>
        <div class="card"><small>Horas de parada</small><strong>${m.paradas.toFixed(2)}</strong></div>
      </div></section>

      <section class="panel"><h2>Costos y eficiencia</h2><div class="cards">
        <div class="card"><small>Costo producción</small><strong>S/ ${m.costo.toLocaleString()}</strong></div>
        <div class="card"><small>Costo mantenimiento</small><strong>S/ ${mantenimiento.toLocaleString()}</strong></div>
        <div class="card"><small>Costo unitario</small><strong>${m.costoUnitario===null?'—':'S/ '+m.costoUnitario.toFixed(3)}</strong></div>
        <div class="card"><small>Energía total</small><strong>${m.energiaTotal.toLocaleString()} kWh</strong></div>
        <div class="card"><small>Energía por unidad</small><strong>${m.energia===null?'—':m.energia.toFixed(3)+' kWh/unidad'}</strong></div>
      </div></section>

      <section class="panel"><h2>Mantenimiento</h2><div class="cards">
        <div class="card"><small>Mantenimientos registrados</small><strong>${maintenanceRows.length}</strong></div>
        <div class="card"><small>Programados</small><strong>${maintenanceRows.filter(r=>String(r.estado||'').toLowerCase()==='programado').length}</strong></div>
        <div class="card"><small>Abiertos / En proceso</small><strong>${maintenanceRows.filter(r=>['abierto','en proceso'].includes(String(r.estado||'').toLowerCase())).length}</strong></div>
        <div class="card"><small>Cerrados</small><strong>${maintenanceRows.filter(r=>String(r.estado||'').toLowerCase()==='cerrado').length}</strong></div>
        <div class="card"><small>Horas de parada</small><strong>${maintenanceRows.reduce((s,r)=>s+n(r.horas_parada),0).toFixed(2)} h</strong></div>
      </div></section>

      <section class="panel"><h2>Calidad, personal y despacho</h2><div class="cards">
        <div class="card"><small>Personal programado</small><strong>${m.pp}</strong></div>
        <div class="card"><small>Personal presente</small><strong>${m.pa}</strong></div>
        <div class="card"><small>Unidades rechazadas</small><strong>${m.rechazadas}</strong></div>
        <div class="card"><small>Reproceso</small><strong>${rows.reduce((s,r)=>s+n(r.reproceso),0)}</strong></div>
        <div class="card"><small>No conformidades</small><strong>${rows.reduce((s,r)=>s+n(r.no_conformidades),0)}</strong></div>
        <div class="card"><small>Pedidos programados</small><strong>${m.ped}</strong></div>
        <div class="card"><small>Pedidos a tiempo</small><strong>${m.pedidosTiempo}</strong></div>
        <div class="card"><small>Incidentes SSOMA</small><strong>${ssomaRows.length}</strong></div>
      </div></section>
    </main>`;

}

/* ========================================================= COMPONENTES
CRUD GENÉRICOS Inventario / Personal / SSOMA / Mantenimiento
========================================================= */

/* ——————– MANTENIMIENTO ——————– */

function renderMaintenance(){ const total=maintenanceRows.length; const
programados=maintenanceRows.filter(r=>String(r.estado||’‘).toLowerCase()===’programado’).length;
const pendientes=maintenanceRows.filter(r=>[‘abierto’,‘en
proceso’].includes(String(r.estado||’‘).toLowerCase())).length; const
cerrados=maintenanceRows.filter(r=>String(r.estado||’‘).toLowerCase()===’cerrado’).length;
const horas=maintenanceRows.reduce((s,r)=>s+n(r.horas_parada),0); const
costo=maintenanceRows.reduce((s,r)=>s+n(r.costo),0);

document.getElementById(‘content’).innerHTML=`
Gestión de Mantenimiento
Registro, seguimiento y control del mantenimiento de equipos de la
planta.

● EN LÍNEA

        <div class="card"><small>Mantenimientos registrados</small><strong>${total}</strong></div>
        <div class="card"><small>Programados</small><strong>${programados}</strong><span class="badge ok">PROGRAMADO</span></div>
        <div class="card"><small>Abiertos / En proceso</small><strong>${pendientes}</strong><span class="badge ${pendientes?'warn':'ok'}">${pendientes?'PENDIENTE':'OK'}</span></div>
        <div class="card"><small>Cerrados</small><strong>${cerrados}</strong></div>
        <div class="card"><small>Horas de parada</small><strong>${horas.toFixed(2)} horas</strong></div>
        <div class="card"><small>Costo total</small><strong>S/ ${costo.toFixed(2)}</strong></div>
      </div>

      <section class="panel"><h2>${editingMaintenanceId?'Editar mantenimiento':'Registrar mantenimiento'}</h2>
        <form id="maintenanceForm" class="formGrid">
          <section><h2>Identificación</h2>
            <label>Fecha<input id="mt_fecha" type="date" value="${today}" required></label>
            <label>Equipo<input id="mt_equipo" type="text" required></label>
            <label>Código de equipo<input id="mt_codigo_equipo" type="text"></label>
            <label>Tipo<select id="mt_tipo"><option>Preventivo</option><option>Correctivo</option><option>Predictivo</option><option>Inspección</option><option>Emergencia</option><option>Otro</option></select></label>
            <label>Causa<input id="mt_causa" type="text"></label>
          </section>
          <section><h2>Intervención</h2>
            <label>Descripción<textarea id="mt_descripcion" required></textarea></label>
            <label>Horas de parada<input id="mt_horas_parada" type="number" step="0.01" min="0" value="0"></label>
            <label>Costo (S/)<input id="mt_costo" type="number" step="0.01" min="0" value="0"></label>
            <label>Responsable<input id="mt_responsable" type="text"></label>
          </section>
          <section><h2>Programación y estado</h2>
            <label>Estado<select id="mt_estado"><option>Programado</option><option>Abierto</option><option>En proceso</option><option>Cerrado</option><option>Cancelado</option></select></label>
            <label>Fecha programada<input id="mt_fecha_programada" type="date"></label>
            <label>Fecha de cierre<input id="mt_fecha_cierre" type="date"></label>
            <label>Observaciones<textarea id="mt_observaciones"></textarea></label>
          </section>
          <div id="maintenanceMsg" class="msg full"></div>
          <div class="full" style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="primary" type="submit">${editingMaintenanceId?'Actualizar mantenimiento':'Guardar mantenimiento'}</button>
            ${editingMaintenanceId?'<button id="cancelMaintenance" type="button">Cancelar edición</button>':''}
          </div>
        </form>
      </section>

      <section class="panel"><h2>Mantenimientos registrados</h2>
        ${maintenanceRows.length?`<div class="tableWrap"><table>
          <thead><tr><th>Fecha</th><th>Equipo</th><th>Tipo</th><th>Horas parada</th><th>Causa</th><th>Costo</th><th>Responsable</th><th>Estado</th><th>Próximo</th><th>Acciones</th></tr></thead>
          <tbody>${maintenanceRows.map(r=>`
            <tr>
              <td>${esc(r.fecha)}</td><td><strong>${esc(r.equipo)}</strong>${r.codigo_equipo?'<br><small>'+esc(r.codigo_equipo)+'</small>':''}</td>
              <td>${esc(r.tipo)}</td><td>${n(r.horas_parada).toFixed(2)}</td><td>${esc(r.causa||'')}</td><td>S/ ${n(r.costo).toFixed(2)}</td><td>${esc(r.responsable||'')}</td>
              <td><span class="badge ${String(r.estado||'').toLowerCase()==='cerrado'?'ok':String(r.estado||'').toLowerCase()==='cancelado'?'critical':String(r.estado||'').toLowerCase()==='programado'?'ok':'warn'}">${esc(r.estado)}</span></td>
              <td>${esc(r.fecha_programada||'')}</td>
              <td><button data-edit-maintenance="${esc(r.id)}">Editar</button><button data-delete-maintenance="${esc(r.id)}">Eliminar</button></td>
            </tr>`).join('')}</tbody>
        </table></div>`:'<div class="empty">Todavía no hay mantenimientos registrados.</div>'}
      </section>
    </main>`;

document.getElementById(‘maintenanceForm’).onsubmit=saveMaintenance;
document.querySelectorAll(‘[data-edit-maintenance]’).forEach(b=>b.onclick=()=>editMaintenance(b.dataset.editMaintenance));
document.querySelectorAll(‘[data-delete-maintenance]’).forEach(b=>b.onclick=()=>deleteMaintenance(b.dataset.deleteMaintenance));
document.getElementById(‘cancelMaintenance’)?.addEventListener(‘click’,()=>{editingMaintenanceId=null;renderMaintenance();});
}

async function saveMaintenance(e){ e.preventDefault(); const
g=id=>document.getElementById(id).value; const payload={
user_id:user.id,fecha:g(‘mt_fecha’),equipo:g(‘mt_equipo’).trim(),
codigo_equipo:g(‘mt_codigo_equipo’).trim()||null,tipo:g(‘mt_tipo’),
causa:g(‘mt_causa’).trim()||null,descripcion:g(‘mt_descripcion’).trim(),
horas_parada:n(g(‘mt_horas_parada’)),costo:n(g(‘mt_costo’)),
responsable:g(‘mt_responsable’).trim()||null,estado:g(‘mt_estado’),
fecha_programada:g(‘mt_fecha_programada’)||null,
fecha_cierre:g(‘mt_fecha_cierre’)||null,observaciones:g(‘mt_observaciones’).trim()||null
};
if(!payload.fecha||!payload.equipo||!payload.descripcion){msg(‘maintenanceMsg’,‘Completa
fecha, equipo y descripción.’);return;} msg(‘maintenanceMsg’,‘Guardando
mantenimiento…’); const result=editingMaintenanceId ?await
supabase.from(‘maintenance’).update(payload).eq(‘id’,editingMaintenanceId).eq(‘user_id’,user.id)
:await supabase.from(‘maintenance’).insert(payload);
if(result.error){msg(‘maintenanceMsg’,‘Error:’+result.error.message);return;}
editingMaintenanceId=null;await loadMaintenance();renderMaintenance(); }

function editMaintenance(id){ const
r=maintenanceRows.find(x=>String(x.id)===String(id)); if(!r){alert(‘No
se encontró el mantenimiento.’);return;}
editingMaintenanceId=r.id;renderMaintenance(); const vals={
mt_fecha:r.fecha||today,mt_equipo:r.equipo||’‘,mt_codigo_equipo:r.codigo_equipo||’‘,
mt_tipo:r.tipo||’Preventivo’,mt_causa:r.causa||’‘,mt_descripcion:r.descripcion||’‘,
mt_horas_parada:n(r.horas_parada),mt_costo:n(r.costo),mt_responsable:r.responsable||’‘,
mt_estado:r.estado||’Abierto’,mt_fecha_programada:r.fecha_programada||’‘,
mt_fecha_cierre:r.fecha_cierre||’‘,mt_observaciones:r.observaciones||’’
}; Object.entries(vals).forEach(([id,v])=>{const
el=document.getElementById(id);if(el)el.value=v;});
window.scrollTo({top:0,behavior:‘smooth’}); }

async function deleteMaintenance(id){ const
r=maintenanceRows.find(x=>String(x.id)===String(id)); if(!r)return;
if(!confirm(¿Eliminar el mantenimiento de "${r.equipo}"?))return; const
{error}=await
supabase.from(‘maintenance’).delete().eq(‘id’,id).eq(‘user_id’,user.id);
if(error){alert(‘No se pudo eliminar:’+error.message);return;} await
loadMaintenance();renderMaintenance(); }

/* ——————– INVENTARIO ——————– */

function renderInventory(){ const low=inventoryRows.filter(r=>{ const
stock=n(r.stock_inicial)+n(r.entradas)-n(r.salidas); return
n(r.stock_minimo)>0&&stock<=n(r.stock_minimo); }).length;

document.getElementById(‘content’).innerHTML=`
Control de Inventario
Registra entradas, salidas y stock de materiales y productos.
        <div class="card"><small>Ítems registrados</small><strong>${inventoryRows.length}</strong></div>
        <div class="card"><small>Stock bajo</small><strong>${low}</strong><span class="badge ${low?'critical':'ok'}">${low?'REVISAR':'OK'}</span></div>
      </div>

      <section class="panel"><h2>${editingInventoryId?'Editar inventario':'Registrar inventario'}</h2>
        <form id="inventoryForm" class="formGrid">
          <section><h2>Identificación</h2>
            <label>Fecha<input id="inv_fecha" type="date" value="${today}" required></label>
            <label>Código<input id="inv_codigo" type="text"></label>
            <label>Material / Producto<input id="inv_material" type="text" required></label>
            <label>Categoría<select id="inv_categoria"><option value="">Seleccionar</option><option>Materia prima</option><option>Producto terminado</option><option>Insumo</option><option>Repuesto</option><option>Envase / embalaje</option><option>Otro</option></select></label>
            <label>Unidad<select id="inv_unidad"><option>kg</option><option>t</option><option>g</option><option>litros</option><option>unidades</option><option>cajas</option><option>bolsas</option><option>otros</option></select></label>
          </section>
          <section><h2>Movimiento</h2>
            <label>Stock inicial<input id="inv_stock_inicial" type="number" step="any" min="0" value="0"></label>
            <label>Entradas<input id="inv_entradas" type="number" step="any" min="0" value="0"></label>
            <label>Salidas<input id="inv_salidas" type="number" step="any" min="0" value="0"></label>
            <label>Stock mínimo<input id="inv_stock_minimo" type="number" step="any" min="0" value="0"></label>
            <div class="panel"><small>STOCK ACTUAL</small><strong id="inv_stock_actual" style="display:block;font-size:28px;margin-top:8px">0</strong></div>
          </section>
          <section><h2>Observaciones</h2><label><textarea id="inv_observaciones"></textarea></label></section>
          <div id="inventoryMsg" class="msg full"></div>
          <div class="full"><button class="primary" type="submit">${editingInventoryId?'Actualizar inventario':'Guardar inventario'}</button>${editingInventoryId?'<button id="cancelInventory" type="button">Cancelar edición</button>':''}</div>
        </form>
      </section>

      <section class="panel"><h2>Inventario registrado</h2>
        ${inventoryRows.length?`<div class="tableWrap"><table>
          <thead><tr><th>Fecha</th><th>Código</th><th>Material</th><th>Categoría</th><th>Unidad</th><th>Inicial</th><th>Entradas</th><th>Salidas</th><th>Stock</th><th>Mínimo</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>${inventoryRows.map(r=>{
            const stock=n(r.stock_inicial)+n(r.entradas)-n(r.salidas);
            const isLow=n(r.stock_minimo)>0&&stock<=n(r.stock_minimo);
            return `<tr>
              <td>${esc(r.fecha)}</td><td>${esc(r.codigo||'')}</td><td>${esc(r.material)}</td><td>${esc(r.categoria||'')}</td><td>${esc(r.unidad)}</td>
              <td>${n(r.stock_inicial)}</td><td>${n(r.entradas)}</td><td>${n(r.salidas)}</td><td><strong>${stock}</strong></td><td>${n(r.stock_minimo)}</td>
              <td><span class="badge ${isLow?'critical':'ok'}">${isLow?'STOCK BAJO':'OK'}</span></td>
              <td><button data-edit-inventory="${esc(r.id)}">Editar</button><button data-delete-inventory="${esc(r.id)}">Eliminar</button></td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>`:'<div class="empty">Todavía no hay inventario registrado.</div>'}
      </section>
    </main>`;

updateInventoryStockPreview();
[‘inv_stock_inicial’,‘inv_entradas’,‘inv_salidas’].forEach(id=>document.getElementById(id)?.addEventListener(‘input’,updateInventoryStockPreview));
document.getElementById(‘inventoryForm’).onsubmit=saveInventory;
document.querySelectorAll(‘[data-edit-inventory]’).forEach(b=>b.onclick=()=>editInventory(b.dataset.editInventory));
document.querySelectorAll(‘[data-delete-inventory]’).forEach(b=>b.onclick=()=>deleteInventory(b.dataset.deleteInventory));
document.getElementById(‘cancelInventory’)?.addEventListener(‘click’,()=>{editingInventoryId=null;renderInventory();});
}

function updateInventoryStockPreview(){ const
stock=n(document.getElementById(‘inv_stock_inicial’)?.value)+
n(document.getElementById(‘inv_entradas’)?.value)-
n(document.getElementById(‘inv_salidas’)?.value); const
el=document.getElementById(‘inv_stock_actual’);
if(el)el.textContent=stock; }

async function saveInventory(e){ e.preventDefault(); const
g=id=>document.getElementById(id).value; const payload={
user_id:user.id,fecha:g(‘inv_fecha’),codigo:g(‘inv_codigo’).trim()||null,
material:g(‘inv_material’).trim(),categoria:g(‘inv_categoria’)||null,unidad:g(‘inv_unidad’),
stock_inicial:n(g(‘inv_stock_inicial’)),entradas:n(g(‘inv_entradas’)),
salidas:n(g(‘inv_salidas’)),stock_minimo:n(g(‘inv_stock_minimo’)),
observaciones:g(‘inv_observaciones’).trim()||null };
if(!payload.material){msg(‘inventoryMsg’,‘Debes ingresar el
material/producto.’);return;} msg(‘inventoryMsg’,‘Guardando
inventario…’); const result=editingInventoryId ?await
supabase.from(‘inventory’).update(payload).eq(‘id’,editingInventoryId).eq(‘user_id’,user.id)
:await supabase.from(‘inventory’).insert(payload);
if(result.error){msg(‘inventoryMsg’,‘Error:’+result.error.message);return;}
editingInventoryId=null;await loadInventory();renderInventory(); }

function editInventory(id){ const
r=inventoryRows.find(x=>String(x.id)===String(id)); if(!r){alert(‘No se
encontró el registro.’);return;}
editingInventoryId=r.id;renderInventory(); const vals={
inv_fecha:r.fecha||today,inv_codigo:r.codigo||’‘,inv_material:r.material||’‘,
inv_categoria:r.categoria||’‘,inv_unidad:r.unidad||’kg’,
inv_stock_inicial:n(r.stock_inicial),inv_entradas:n(r.entradas),
inv_salidas:n(r.salidas),inv_stock_minimo:n(r.stock_minimo),
inv_observaciones:r.observaciones||’’ };
Object.entries(vals).forEach(([id,v])=>{const
el=document.getElementById(id);if(el)el.value=v;});
updateInventoryStockPreview();
window.scrollTo({top:0,behavior:‘smooth’}); }

async function deleteInventory(id){ const
r=inventoryRows.find(x=>String(x.id)===String(id)); if(!r)return;
if(!confirm(¿Eliminar "${r.material}"?))return; const {error}=await
supabase.from(‘inventory’).delete().eq(‘id’,id).eq(‘user_id’,user.id);
if(error){alert(‘No se pudo eliminar:’+error.message);return;} await
loadInventory();renderInventory(); }

/* ——————– PERSONAL ——————– */

function renderPersonal(){ const
activos=personalRows.filter(r=>String(r.estado||’‘).toLowerCase()===’activo’).length;
const areas=new Set(personalRows.map(r=>r.area).filter(Boolean)).size;

document.getElementById(‘content’).innerHTML=`
Gestión de Personal
Registro y control del personal de la planta.

● EN LÍNEA

        <div class="card"><small>Personal registrado</small><strong>${personalRows.length}</strong></div>
        <div class="card"><small>Personal activo</small><strong>${activos}</strong><span class="badge ok">ACTIVO</span></div>
        <div class="card"><small>Personal inactivo</small><strong>${personalRows.length-activos}</strong></div>
        <div class="card"><small>Áreas</small><strong>${areas}</strong></div>
      </div>

      <section class="panel"><h2>${editingPersonalId?'Editar trabajador':'Registrar trabajador'}</h2>
        <form id="personalForm" class="formGrid">
          <section><h2>Identificación</h2>
            <label>DNI<input id="per_dni" type="text" inputmode="numeric" maxlength="20" required></label>
            <label>Nombre completo<input id="per_nombre" type="text" required></label>
            <label>Fecha de ingreso<input id="per_fecha_ingreso" type="date" value="${today}" required></label>
          </section>
          <section><h2>Puesto</h2>
            <label>Cargo<input id="per_cargo" type="text" required></label>
            <label>Área<input id="per_area" type="text" required></label>
            <label>Turno<select id="per_turno"><option>Mañana</option><option>Tarde</option><option>Noche</option></select></label>
            <label>Estado<select id="per_estado"><option>Activo</option><option>Inactivo</option></select></label>
          </section>
          <section><h2>Observaciones</h2><label><textarea id="per_observaciones"></textarea></label></section>
          <div id="personalMsg" class="msg full"></div>
          <div class="full"><button class="primary" type="submit">${editingPersonalId?'Actualizar trabajador':'Guardar trabajador'}</button>${editingPersonalId?'<button id="cancelPersonal" type="button">Cancelar edición</button>':''}</div>
        </form>
      </section>

      <section class="panel"><h2>Personal registrado</h2>
        ${personalRows.length?`<div class="tableWrap"><table>
          <thead><tr><th>DNI</th><th>Nombre</th><th>Cargo</th><th>Área</th><th>Turno</th><th>Ingreso</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>${personalRows.map(r=>`
            <tr><td>${esc(r.dni)}</td><td><strong>${esc(r.nombre)}</strong></td><td>${esc(r.cargo)}</td><td>${esc(r.area)}</td><td>${esc(r.turno)}</td><td>${esc(r.fecha_ingreso)}</td>
            <td><span class="badge ${r.estado==='Activo'?'ok':'warn'}">${esc(r.estado)}</span></td>
            <td><button data-edit-personal="${esc(r.id)}">Editar</button><button data-delete-personal="${esc(r.id)}">Eliminar</button></td></tr>`).join('')}
          </tbody>
        </table></div>`:'<div class="empty">Todavía no hay personal registrado.</div>'}
      </section>
    </main>`;

document.getElementById(‘personalForm’).onsubmit=savePersonal;
document.querySelectorAll(‘[data-edit-personal]’).forEach(b=>b.onclick=()=>editPersonal(b.dataset.editPersonal));
document.querySelectorAll(‘[data-delete-personal]’).forEach(b=>b.onclick=()=>deletePersonal(b.dataset.deletePersonal));
document.getElementById(‘cancelPersonal’)?.addEventListener(‘click’,()=>{editingPersonalId=null;renderPersonal();});
}

async function savePersonal(e){ e.preventDefault(); const
g=id=>document.getElementById(id).value; const payload={
user_id:user.id,dni:g(‘per_dni’).trim(),nombre:g(‘per_nombre’).trim(),
fecha_ingreso:g(‘per_fecha_ingreso’),cargo:g(‘per_cargo’).trim(),
area:g(‘per_area’).trim(),turno:g(‘per_turno’),estado:g(‘per_estado’),
observaciones:g(‘per_observaciones’).trim()||null };
if(!payload.dni||!payload.nombre||!payload.cargo||!payload.area||!payload.fecha_ingreso){
msg(‘personalMsg’,‘Completa los campos obligatorios.’);return; }
msg(‘personalMsg’,‘Guardando trabajador…’); const
result=editingPersonalId ?await
supabase.from(‘personal’).update(payload).eq(‘id’,editingPersonalId).eq(‘user_id’,user.id)
:await supabase.from(‘personal’).insert(payload); if(result.error){
msg(‘personalMsg’,result.error.code===‘23505’?‘Ya existe un trabajador
con ese DNI.’:‘Error:’+result.error.message); return; }
editingPersonalId=null;await loadPersonal();renderPersonal(); }

function editPersonal(id){ const
r=personalRows.find(x=>String(x.id)===String(id)); if(!r){alert(‘No se
encontró el trabajador.’);return;}
editingPersonalId=r.id;renderPersonal(); const vals={
per_dni:r.dni||’‘,per_nombre:r.nombre||’‘,per_fecha_ingreso:r.fecha_ingreso||today,
per_cargo:r.cargo||’‘,per_area:r.area||’‘,per_turno:r.turno||’Mañana’,
per_estado:r.estado||‘Activo’,per_observaciones:r.observaciones||’’ };
Object.entries(vals).forEach(([id,v])=>{const
el=document.getElementById(id);if(el)el.value=v;});
window.scrollTo({top:0,behavior:‘smooth’}); }

async function deletePersonal(id){ const
r=personalRows.find(x=>String(x.id)===String(id)); if(!r)return;
if(!confirm(¿Eliminar a "${r.nombre}"?))return; const {error}=await
supabase.from(‘personal’).delete().eq(‘id’,id).eq(‘user_id’,user.id);
if(error){alert(‘No se pudo eliminar:’+error.message);return;} await
loadPersonal();renderPersonal(); }

/* ——————– SSOMA ——————– */

function renderSsoma(){ const
abiertos=ssomaRows.filter(r=>String(r.estado||’‘).toLowerCase()!==’cerrado’).length;
document.getElementById(‘content’).innerHTML=`
SSOMA
Registro y seguimiento de incidentes de Seguridad, Salud Ocupacional y
Medio Ambiente.
        <div class="card"><small>Incidentes registrados</small><strong>${ssomaRows.length}</strong></div>
        <div class="card"><small>Incidentes abiertos</small><strong>${abiertos}</strong></div>
      </div>

      <section class="panel"><h2>${editingSsomaId?'Editar incidente':'Registrar incidente'}</h2>
        <form id="ssomaForm" class="formGrid">
          <section><h2>Identificación</h2>
            <label>Fecha<input id="ss_fecha" type="date" value="${today}" required></label>
            <label>Tipo de incidente<select id="ss_tipo" required><option value="">Seleccionar</option><option>Accidente</option><option>Incidente</option><option>Casi accidente</option><option>Condición insegura</option><option>Acto inseguro</option><option>Ambiental</option><option>Salud ocupacional</option><option>Otro</option></select></label>
            <label>Lugar<input id="ss_lugar" type="text" required></label>
            <label>Gravedad<select id="ss_gravedad" required><option value="">Seleccionar</option><option>Leve</option><option>Moderada</option><option>Grave</option><option>Crítica</option></select></label>
            <label>Estado<select id="ss_estado"><option>Abierto</option><option>En investigación</option><option>En seguimiento</option><option>Cerrado</option></select></label>
          </section>
          <section><h2>Detalle</h2>
            <label>Hechos<textarea id="ss_hechos" required></textarea></label>
            <label>Acciones tomadas<textarea id="ss_acciones" required></textarea></label>
            <label>Personas involucradas<textarea id="ss_personas"></textarea></label>
          </section>
          <section><h2>Observaciones</h2><label><textarea id="ss_observaciones"></textarea></label></section>
          <div id="ssomaMsg" class="msg full"></div>
          <div class="full"><button class="primary" type="submit">${editingSsomaId?'Actualizar incidente':'Guardar incidente'}</button>${editingSsomaId?'<button id="cancelSsoma" type="button">Cancelar edición</button>':''}</div>
        </form>
      </section>

      <section class="panel"><h2>Incidentes registrados</h2>
        ${ssomaRows.length?`<div class="tableWrap"><table>
          <thead><tr><th>Fecha</th><th>Tipo</th><th>Lugar</th><th>Gravedad</th><th>Estado</th><th>Hechos</th><th>Acciones</th></tr></thead>
          <tbody>${ssomaRows.map(r=>`
            <tr><td>${esc(r.fecha)}</td><td>${esc(r.tipo||'')}</td><td>${esc(r.lugar||'')}</td><td>${esc(r.gravedad||'')}</td><td>${esc(r.estado||'')}</td><td>${esc(r.hechos||'')}</td>
            <td><button data-edit-ssoma="${esc(r.id)}">Editar</button><button data-delete-ssoma="${esc(r.id)}">Eliminar</button></td></tr>`).join('')}
          </tbody>
        </table></div>`:'<div class="empty">Todavía no hay incidentes registrados.</div>'}
      </section>
    </main>`;

document.getElementById(‘ssomaForm’).onsubmit=saveSsoma;
document.querySelectorAll(‘[data-edit-ssoma]’).forEach(b=>b.onclick=()=>editSsoma(b.dataset.editSsoma));
document.querySelectorAll(‘[data-delete-ssoma]’).forEach(b=>b.onclick=()=>deleteSsoma(b.dataset.deleteSsoma));
document.getElementById(‘cancelSsoma’)?.addEventListener(‘click’,()=>{editingSsomaId=null;renderSsoma();});
}

async function saveSsoma(e){ e.preventDefault(); const
g=id=>document.getElementById(id).value; const payload={
user_id:user.id,fecha:g(‘ss_fecha’),tipo:g(‘ss_tipo’),hechos:g(‘ss_hechos’).trim(),
lugar:g(‘ss_lugar’).trim(),acciones_tomadas:g(‘ss_acciones’).trim(),
personas_involucradas:g(‘ss_personas’).trim()||null,gravedad:g(‘ss_gravedad’),
estado:g(‘ss_estado’),observaciones:g(‘ss_observaciones’).trim()||null
};
if(!payload.fecha||!payload.tipo||!payload.lugar||!payload.hechos||!payload.acciones_tomadas||!payload.gravedad){
msg(‘ssomaMsg’,‘Completa los campos obligatorios.’);return; }
msg(‘ssomaMsg’,‘Guardando incidente…’); const result=editingSsomaId
?await
supabase.from(‘ssoma_incidents’).update(payload).eq(‘id’,editingSsomaId).eq(‘user_id’,user.id)
:await supabase.from(‘ssoma_incidents’).insert(payload);
if(result.error){msg(‘ssomaMsg’,‘Error:’+result.error.message);return;}
editingSsomaId=null;await loadSsoma();renderSsoma(); }

function editSsoma(id){ const
r=ssomaRows.find(x=>String(x.id)===String(id)); if(!r){alert(‘No se
encontró el incidente.’);return;} editingSsomaId=r.id;renderSsoma();
const vals={
ss_fecha:r.fecha||today,ss_tipo:r.tipo||’‘,ss_hechos:r.hechos||’‘,ss_lugar:r.lugar||’‘,
ss_acciones:r.acciones_tomadas||’‘,ss_personas:r.personas_involucradas||’‘,
ss_gravedad:r.gravedad||’‘,ss_estado:r.estado||’Abierto’,ss_observaciones:r.observaciones||’’
}; Object.entries(vals).forEach(([id,v])=>{const
el=document.getElementById(id);if(el)el.value=v;});
window.scrollTo({top:0,behavior:‘smooth’}); }

async function deleteSsoma(id){ const
r=ssomaRows.find(x=>String(x.id)===String(id)); if(!r)return;
if(!confirm(¿Eliminar el incidente del ${r.fecha}?))return; const
{error}=await
supabase.from(‘ssoma_incidents’).delete().eq(‘id’,id).eq(‘user_id’,user.id);
if(error){alert(‘No se pudo eliminar:’+error.message);return;} await
loadSsoma();renderSsoma(); }

/* ========================================================= CARGA DE
DATOS ========================================================= */

async function load(){ if(!user?.id)return;

const r=await supabase.from(‘daily_records’).select(’*‘)
.eq(’user_id’,user.id).order(‘fecha’,{ascending:true});
rows=r.error?[]:(r.data||[]); if(r.error)console.error(‘Error
daily_records:’,r.error);

const s=await
supabase.from(‘app_settings’).select(’*’).limit(1).maybeSingle();
if(s.data){ metas={ …metas,
cumplimiento:Number.isFinite(Number(s.data.meta_cumplimiento))?Number(s.data.meta_cumplimiento):metas.cumplimiento,
merma:Number.isFinite(Number(s.data.meta_merma))?Number(s.data.meta_merma):metas.merma,
yield:Number.isFinite(Number(s.data.meta_yield))?Number(s.data.meta_yield):metas.yield,
disponibilidad:Number.isFinite(Number(s.data.meta_disponibilidad))?Number(s.data.meta_disponibilidad):metas.disponibilidad,
asistencia:Number.isFinite(Number(s.data.meta_asistencia))?Number(s.data.meta_asistencia):metas.asistencia,
rechazo:Number.isFinite(Number(s.data.meta_rechazo))?Number(s.data.meta_rechazo):metas.rechazo,
otif:Number.isFinite(Number(s.data.meta_entregas))?Number(s.data.meta_entregas):metas.otif,
incidentes:Number.isFinite(Number(s.data.meta_incidentes))?Number(s.data.meta_incidentes):metas.incidentes
}; }

await loadInventory();await loadSsoma();await loadPersonal();await
loadMaintenance(); }

async function loadInventory(){ if(!user?.id)return; const r=await
supabase.from(‘inventory’).select(’*‘).eq(’user_id’,user.id)
.order(‘fecha’,{ascending:false}).order(‘created_at’,{ascending:false});
inventoryRows=r.error?[]:(r.data||[]); if(r.error)console.error(‘Error
inventario:’,r.error); }

async function loadSsoma(){ if(!user?.id)return; const r=await
supabase.from(‘ssoma_incidents’).select(’*‘).eq(’user_id’,user.id)
.order(‘fecha’,{ascending:false}).order(‘created_at’,{ascending:false});
ssomaRows=r.error?[]:(r.data||[]); if(r.error)console.error(‘Error
SSOMA:’,r.error); }

async function loadPersonal(){ if(!user?.id)return; const r=await
supabase.from(‘personal’).select(’*‘).eq(’user_id’,user.id)
.order(‘estado’,{ascending:true}).order(‘nombre’,{ascending:true});
personalRows=r.error?[]:(r.data||[]); if(r.error)console.error(‘Error
personal:’,r.error); }

async function loadMaintenance(){ if(!user?.id)return; const r=await
supabase.from(‘maintenance’).select(’*‘).eq(’user_id’,user.id)
.order(‘fecha’,{ascending:false}).order(‘created_at’,{ascending:false});
maintenanceRows=r.error?[]:(r.data||[]); if(r.error)console.error(‘Error
mantenimiento:’,r.error); }

function renderPlaceholder(title){
document.getElementById(‘content’).innerHTML=<main><h1>${esc(title)}</h1><section class="panel">       <p>Este módulo está preparado para enlazarse con su tabla correspondiente.</p>       <span class="badge ok">Módulo preparado</span>     </section></main>;
}

/* ========================================================= INICIO Y
SESIÓN ========================================================= */

async function init(){ if(!app){ console.error(‘QUIMFLUX: no se encontró
#app en index.html’); return; } try{ const {data,error}=await
supabase.auth.getSession(); if(error){console.error(‘Error obteniendo
sesión:’,error);renderAuth();return;} user=data.session?.user||null;
if(user)await load(); render(); }catch(error){ console.error(‘Error
inicializando QUIMFLUX:’,error); renderAuth(); } }

supabase.auth.onAuthStateChange((_event,session)=>{
user=session?.user||null; if(!user){
rows=[];inventoryRows=[];ssomaRows=[];personalRows=[];maintenanceRows=[];
editingDailyId=null;editingInventoryId=null;editingSsomaId=null;
editingPersonalId=null;editingMaintenanceId=null; } render(); });

init();
