/* =========================================================
   ALERTAS QUIMFLUX
   SIN DATOS NO ES IGUAL A 0%
========================================================= */

function renderAlerts() {

  const content =
    document.getElementById('content');

  if (!content) return;


  /* -------------------------------------------------------
     SI NO EXISTEN REGISTROS
     NO GENERAR ALERTAS CRÍTICAS
  ------------------------------------------------------- */

  if (!rows || rows.length === 0) {

    content.innerHTML = `

      <main>

        <div class="titleRow">

          <div>

            <h1>
              🚨 Alertas QUIMFLUX
            </h1>

            <p>
              Desviaciones que requieren atención.
            </p>

          </div>

          <span class="online">
            ● EN LÍNEA
          </span>

        </div>


        <section class="panel">

          <div
            style="
              padding:30px;
              text-align:center;
            "
          >

            <div
              style="
                font-size:48px;
                margin-bottom:15px;
              "
            >
              ℹ️
            </div>

            <h2>
              SIN DATOS OPERATIVOS
            </h2>

            <p>
              Todavía no existen registros
              de producción para evaluar
              los indicadores.
            </p>

            <p>
              QUIMFLUX no generará alertas
              críticas hasta que existan
              datos reales.
            </p>

            <span class="badge ok">
              0 CRÍTICAS
            </span>

          </div>

        </section>


        <section class="panel">

          <h2>
            ¿Qué ocurrirá cuando ingreses datos?
          </h2>

          <div class="cards">

            <div class="card">

              <small>
                Cumplimiento
              </small>

              <strong>
                Se calculará automáticamente
              </strong>

            </div>


            <div class="card">

              <small>
                Yield
              </small>

              <strong>
                Se calculará automáticamente
              </strong>

            </div>


            <div class="card">

              <small>
                Disponibilidad
              </small>

              <strong>
                Se calculará automáticamente
              </strong>

            </div>


            <div class="card">

              <small>
                Asistencia
              </small>

              <strong>
                Se calculará automáticamente
              </strong>

            </div>


            <div class="card">

              <small>
                OTIF
              </small>

              <strong>
                Se calculará automáticamente
              </strong>

            </div>


            <div class="card">

              <small>
                OEE
              </small>

              <strong>
                Se calculará automáticamente
              </strong>

            </div>

          </div>

        </section>

      </main>

    `;

    return;
  }


  /* -------------------------------------------------------
     EXISTEN DATOS
  ------------------------------------------------------- */

  const d =
    rows.map(derive);


  const sum = key =>
    d.reduce(
      (total, r) =>
        total + n(r[key]),
      0
    );


  const programada =
    sum('programada');

  const producida =
    sum('producida');

  const mp =
    sum('mp');

  const merma =
    sum('merma');

  const horas =
    sum('horas_turno');

  const paradasDiarias =
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


  /* -------------------------------------------------------
     KPI
  ------------------------------------------------------- */

  const cumplimiento =
    programada > 0
      ? producida / programada
      : null;


  const yieldRate =
    mp > 0
      ? producida / mp
      : null;


  const mermaRate =
    mp > 0
      ? merma / mp
      : null;


  const horasParadaMantenimiento =
    maintenanceRows.reduce(
      (total, r) =>
        total + n(r.horas_parada),
      0
    );


  const paradas =
    horasParadaMantenimiento > 0
      ? horasParadaMantenimiento
      : paradasDiarias;


  const disponibilidad =
    horas > 0
      ? Math.max(
          0,
          (horas - paradas) / horas
        )
      : null;


  const asistencia =
    personalProgramado > 0
      ? personalPresente /
        personalProgramado
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

      ? disponibilidadeSegura(
          disponibilidad,
          cumplimiento,
          rechazo
        )

      : null;


  /* -------------------------------------------------------
     GENERADOR DE ALERTAS
  ------------------------------------------------------- */

  const alerts = [];


  function addAlert(
    nombre,
    valor,
    meta,
    invert = false
  ) {

    /* SIN DATOS = NO ALERTA */

    if (
      valor === null ||
      valor === undefined ||
      !Number.isFinite(valor)
    ) {

      return;

    }


    const s =
      status(
        valor,
        meta,
        invert
      );


    if (
      s.label === 'CRÍTICO'
    ) {

      alerts.push({

        tipo: 'CRÍTICO',

        nombre,

        valor,

        meta,

        invert

      });

    }

  }


  addAlert(
    'Cumplimiento',
    cumplimiento,
    metas.cumplimiento
  );


  addAlert(
    'Yield',
    yieldRate,
    metas.yield
  );


  addAlert(
    'Merma',
    mermaRate,
    metas.merma,
    true
  );


  addAlert(
    'Disponibilidad',
    disponibilidad,
    metas.disponibilidad
  );


  addAlert(
    'Asistencia',
    asistencia,
    metas.asistencia
  );


  addAlert(
    'Rechazo',
    rechazo,
    metas.rechazo,
    true
  );


  addAlert(
    'OTIF',
    otif,
    metas.otif
  );


  addAlert(
    'OEE',
    oee,
    0.80
  );


  /* -------------------------------------------------------
     PRODUCCIÓN TOTAL
  ------------------------------------------------------- */

  const produccionTotal =
    producida;


  /* -------------------------------------------------------
     RENDER
  ------------------------------------------------------- */

  content.innerHTML = `

    <main>

      <div class="titleRow">

        <div>

          <h1>
            🚨 Alertas QUIMFLUX
          </h1>

          <p>
            Desviaciones que requieren atención.
          </p>

        </div>

        <span class="online">
          ● EN LÍNEA
        </span>

      </div>


      <div
        class="badge ${
          alerts.length
            ? 'critical'
            : 'ok'
        }"
        style="
          display:inline-block;
          margin-bottom:20px;
          font-size:18px;
        "
      >

        ${
          alerts.length
            ? `${alerts.length} CRÍTICAS`
            : '0 CRÍTICAS'
        }

      </div>


      ${
        alerts.length

          ? alerts.map(a => `

              <section
                class="panel"
                style="
                  border:2px solid;
                  margin-bottom:20px;
                "
              >

                <div
                  style="
                    display:flex;
                    gap:20px;
                    align-items:center;
                    flex-wrap:wrap;
                  "
                >

                  <span
                    class="badge critical"
                  >
                    CRÍTICO
                  </span>


                  <div>

                    <h2
                      style="
                        margin:0 0 8px 0;
                      "
                    >
                      ${esc(a.nombre)}
                      en nivel crítico
                    </h2>


                    <div>

                      ${
                        pct(a.valor)
                      }

                      · Meta

                      ${
                        pct(a.meta)
                      }

                    </div>

                  </div>

                </div>

              </section>

            `).join('')


          : `

              <section class="panel">

                <div
                  style="
                    padding:25px;
                    text-align:center;
                  "
                >

                  <div
                    style="
                      font-size:42px;
                      margin-bottom:10px;
                    "
                  >
                    🟢
                  </div>

                  <h2>
                    No existen alertas críticas
                  </h2>

                  <p>
                    Los indicadores disponibles
                    no presentan una desviación
                    crítica.
                  </p>

                  <span class="badge ok">
                    TODO CONTROLADO
                  </span>

                </div>

              </section>

            `
      }


      <section class="panel">

        <h2>
          Resumen operativo
        </h2>


        <div class="cards">

          <div class="card">

            <small>
              Producción total
            </small>

            <strong>
              ${produccionTotal.toLocaleString()}
            </strong>

          </div>


          ${alertCard(
            'Cumplimiento',
            cumplimiento,
            metas.cumplimiento
          )}


          ${alertCard(
            'Yield',
            yieldRate,
            metas.yield
          )}


          ${alertCard(
            'Disponibilidad',
            disponibilidad,
            metas.disponibilidad
          )}


          ${alertCard(
            'Asistencia',
            asistencia,
            metas.asistencia
          )}


          ${alertCard(
            'OTIF',
            otif,
            metas.otif
          )}


          ${alertCard(
            'OEE',
            oee,
            0.80
          )}

        </div>

      </section>

    </main>

  `;

}


/* =========================================================
   OEE SEGURO
========================================================= */

function disponibilidadeSegura(
  disponibilidad,
  cumplimiento,
  rechazo
) {

  if (
    disponibilidad === null ||
    cumplimiento === null ||
    rechazo === null
  ) {

    return null;

  }


  return (
    disponibilidad *
    cumplimiento *
    Math.max(
      0,
      1 - rechazo
    )
  );

}


/* =========================================================
   TARJETA KPI DE ALERTAS
========================================================= */

function alertCard(
  nombre,
  valor,
  meta
) {

  if (
    valor === null ||
    valor === undefined ||
    !Number.isFinite(valor)
  ) {

    return `

      <div class="card">

        <small>
          ${esc(nombre)}
        </small>

        <strong>
          —
        </strong>

        <span class="badge ok">
          SIN DATOS
        </span>

      </div>

    `;

  }


  const s =
    status(
      valor,
      meta
    );


  return `

    <div class="card">

      <small>
        ${esc(nombre)}
      </small>

      <strong>
        ${pct(valor)}
      </strong>

      <span
        class="badge ${s.cls}"
      >
        ${s.label}
      </span>

    </div>

  `;

}