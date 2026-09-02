import fs from 'node:fs';
import crypto from 'node:crypto';
import process from 'node:process';
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const EXPECTED = { Entradas: 488, Salidas: 904 };
const SHEET_NAMES = ['Entradas', 'Salidas'];
const CHUNK_SIZE = 250;

function arg(name, fallback = undefined) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function required(value, label) {
  if (!value) throw new Error(`Falta ${label}.`);
  return value;
}

function normalizeText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
}

function normalizeQuantity(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

function excelDateToISO(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = XLSX.SSF.parse_date_code(value);
    if (d?.y && d?.m && d?.d) {
      return `${String(d.y).padStart(4, '0')}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    }
  }
  const text = normalizeText(value);
  if (!text) return null;
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  const m = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

function sha256(path) {
  return crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
}

function parseWorkbook(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: true, raw: true });
  const missing = SHEET_NAMES.filter((name) => !workbook.SheetNames.includes(name));
  if (missing.length) throw new Error(`Faltan hojas requeridas: ${missing.join(', ')}`);

  const rows = [];
  const errors = [];

  for (const sheetName of SHEET_NAMES) {
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
    const startIndex = 9; // Excel row 10; row 9 is the table header.

    for (let i = startIndex; i < matrix.length; i++) {
      const r = matrix[i] || [];
      const sourceRow = i + 1;
      const isEntrada = sheetName === 'Entradas';

      const eventDate = excelDateToISO(r[1]);
      const documentNo = normalizeText(r[2]);
      const party = normalizeText(r[3]);
      const productCode = normalizeText(r[4]);
      const category = normalizeText(r[5]);
      const productName = normalizeText(r[6]);
      const unit = normalizeText(r[7]);
      const comment = normalizeText(r[8]);
      const quantity = normalizeQuantity(r[9]);

      const allEmpty = [eventDate, documentNo, party, productCode, category, productName, unit, comment, quantity]
        .every((v) => v === null);
      if (allEmpty) continue;

      if (!eventDate || !documentNo || !party || !productCode || !productName || !unit || quantity === null) {
        errors.push(`${sheetName}!${sourceRow}: fila incompleta`);
        continue;
      }
      if (quantity < 0) {
        errors.push(`${sheetName}!${sourceRow}: cantidad negativa`);
        continue;
      }

      rows.push({
        source_sheet: sheetName,
        source_row: sourceRow,
        event_type: isEntrada ? 'entrada' : 'salida',
        event_date: eventDate,
        document_no: documentNo,
        supplier_name: isEntrada ? party : null,
        customer_name: isEntrada ? null : party,
        product_code: productCode,
        category,
        product_name: productName,
        unit,
        comment,
        quantity,
        source_key: `${sheetName}:${sourceRow}`,
      });
    }
  }

  const counts = Object.fromEntries(SHEET_NAMES.map((name) => [
    name,
    rows.filter((r) => r.source_sheet === name).length,
  ]));

  return { rows, counts, errors, workbookSheets: workbook.SheetNames };
}

async function main() {
  const filePath = required(arg('file', './Control Inventarios Refractarios.xlsm'), 'ruta del Excel (--file)');
  const mode = arg('mode', 'validate');
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ownerId = process.env.QUIMFLUX_OWNER_ID;

  if (!fs.existsSync(filePath)) throw new Error(`No existe el archivo: ${filePath}`);

  const parsed = parseWorkbook(filePath);
  const totalQuantity = parsed.rows.reduce((sum, r) => sum + (r.quantity ?? 0), 0);
  const entriesQuantity = parsed.rows.filter(r => r.event_type === 'entrada').reduce((s, r) => s + r.quantity, 0);
  const exitsQuantity = parsed.rows.filter(r => r.event_type === 'salida').reduce((s, r) => s + r.quantity, 0);

  console.log('QUIMFLUX · Importador Control Inventarios Refractarios');
  console.log(`Archivo: ${filePath}`);
  console.log(`SHA-256: ${sha256(filePath)}`);
  console.log(`Hojas encontradas: ${parsed.workbookSheets.join(', ')}`);
  console.log(`Entradas: ${parsed.counts.Entradas} (esperadas ${EXPECTED.Entradas}) · ${entriesQuantity} unidades`);
  console.log(`Salidas:  ${parsed.counts.Salidas} (esperadas ${EXPECTED.Salidas}) · ${exitsQuantity} unidades`);
  console.log(`Total filas: ${parsed.rows.length} · Total movimientos: ${totalQuantity}`);

  if (parsed.errors.length) {
    console.error(`VALIDACIÓN FALLIDA: ${parsed.errors.length} filas con errores.`);
    for (const error of parsed.errors.slice(0, 30)) console.error(`  - ${error}`);
    process.exitCode = 2;
    return;
  }

  if (parsed.counts.Entradas !== EXPECTED.Entradas || parsed.counts.Salidas !== EXPECTED.Salidas) {
    throw new Error(`Conteo inesperado. Se esperaban 488 Entradas y 904 Salidas.`);
  }

  if (mode === 'validate') {
    console.log('VALIDACIÓN OK. No se escribió nada en Supabase.');
    return;
  }

  if (mode !== 'stage') throw new Error(`Modo no válido: ${mode}. Use validate o stage.`);
  required(supabaseUrl, 'SUPABASE_URL');
  required(serviceKey, 'SUPABASE_SERVICE_ROLE_KEY');
  required(ownerId, 'QUIMFLUX_OWNER_ID');

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const fileHash = sha256(filePath);
  const fileName = filePath.split(/[\\/]/).pop();

  const { data: existingBatch, error: existingError } = await supabase
    .from('qf_import_batches')
    .select('id,status,row_count,total_quantity')
    .eq('owner_id', ownerId)
    .eq('source_file_sha256', fileHash)
    .maybeSingle();
  if (existingError) throw existingError;

  let batchId = existingBatch?.id;
  if (!batchId) {
    const { data, error } = await supabase
      .from('qf_import_batches')
      .insert({
        owner_id: ownerId,
        source_file_name: fileName,
        source_file_sha256: fileHash,
        source_workbook_sheet: 'Entradas,Salidas',
        status: 'staged',
        row_count: parsed.rows.length,
        total_quantity: totalQuantity,
      })
      .select('id')
      .single();
    if (error) throw error;
    batchId = data.id;
  } else {
    const { error } = await supabase
      .from('qf_import_batches')
      .update({ status: 'staged', row_count: parsed.rows.length, total_quantity: totalQuantity, error_message: null })
      .eq('id', batchId);
    if (error) throw error;
  }

  const payload = parsed.rows.map((r) => ({ ...r, batch_id: batchId, owner_id: ownerId }));
  for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
    const chunk = payload.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from('qf_import_rows')
      .upsert(chunk, { onConflict: 'batch_id,source_sheet,source_row' });
    if (error) throw error;
    console.log(`Staging: ${Math.min(i + chunk.length, payload.length)}/${payload.length}`);
  }

  const { data: verification, error: verifyError } = await supabase
    .from('qf_import_rows')
    .select('event_type,quantity')
    .eq('batch_id', batchId);
  if (verifyError) throw verifyError;

  const stagedEntries = verification.filter(r => r.event_type === 'entrada');
  const stagedExits = verification.filter(r => r.event_type === 'salida');
  const stagedEntryQty = stagedEntries.reduce((s, r) => s + Number(r.quantity || 0), 0);
  const stagedExitQty = stagedExits.reduce((s, r) => s + Number(r.quantity || 0), 0);

  if (verification.length !== parsed.rows.length || stagedEntryQty !== entriesQuantity || stagedExitQty !== exitsQuantity) {
    await supabase.from('qf_import_batches').update({ status: 'error', error_message: 'La verificación post-carga no coincide con el Excel.' }).eq('id', batchId);
    throw new Error(`Verificación post-carga fallida: ${verification.length} filas, ${stagedEntryQty} entradas, ${stagedExitQty} salidas.`);
  }

  await supabase.from('qf_import_batches').update({ status: 'verified', completed_at: new Date().toISOString() }).eq('id', batchId);
  console.log(`STAGING OK · batch ${batchId}`);
  console.log(`Verificado: ${verification.length} filas · ${stagedEntryQty} entradas · ${stagedExitQty} salidas.`);
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
});
