# Importador QUIMFLUX — Control Inventarios Refractarios

Este procedimiento carga primero el histórico del Excel en tablas de **staging**. No modifica `qf_receipts`, `qf_receipt_items`, `qf_shipments`, `qf_shipment_items` ni `inventory`.

## Fuente

Archivo: `Control Inventarios Refractarios.xlsm`

- `Entradas`: 488 filas / 45,741 unidades
- `Salidas`: 904 filas / 43,747 unidades
- Total: 1,392 filas
- Conciliación histórica esperada: 45,741 - 43,747 = 1,994 unidades netas

`INV INICIAL` se conserva como filas de `Entradas`. No se suma por separado.

## Preparación

1. Instalar dependencias:

```bash
npm install
```

2. Definir variables de entorno. **Nunca** guardar la service role key en GitHub ni en el código:

```text
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
QUIMFLUX_OWNER_ID=<owner-uuid>
```

Para este proyecto, el `QUIMFLUX_OWNER_ID` de la cuenta operativa es el UUID del usuario de Supabase correspondiente a la sesión de QUIMFLUX.

## Paso 1 — Validar sin escribir

```bash
npm run import:refractarios -- --file "./Control Inventarios Refractarios.xlsm" --mode validate
```

Debe terminar con:

```text
Entradas: 488
Salidas: 904
VALIDACIÓN OK. No se escribió nada en Supabase.
```

## Paso 2 — Cargar staging

Solo después de que el paso 1 sea correcto:

```bash
npm run import:refractarios -- --file "./Control Inventarios Refractarios.xlsm" --mode stage
```

El importador:

- calcula SHA-256 del archivo;
- crea/reutiliza un `qf_import_batches` para ese archivo;
- carga las 1,392 filas en bloques de 250;
- identifica cada fila por `batch_id + hoja + fila Excel`;
- evita duplicar filas si se vuelve a ejecutar el mismo archivo;
- verifica después de cargar que coincidan filas y cantidades con el Excel;
- marca el lote como `verified` únicamente si la verificación coincide.

## Importante

Esta fase es deliberadamente de solo **staging**. La promoción a recepciones, despachos y movimientos se hará después de revisar el lote verificado y construir las reglas de conciliación.
