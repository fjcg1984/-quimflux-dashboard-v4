create table if not exists public.qf_import_batches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  source_file_name text not null,
  source_file_sha256 text not null,
  source_workbook_sheet text,
  status text not null default 'staged',
  row_count integer not null default 0,
  total_quantity numeric not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text,
  unique(owner_id, source_file_sha256)
);

create table if not exists public.qf_import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.qf_import_batches(id) on delete cascade,
  owner_id uuid not null,
  source_sheet text not null,
  source_row integer not null,
  event_type text not null check (event_type in ('entrada', 'salida')),
  event_date date,
  document_no text,
  supplier_name text,
  customer_name text,
  product_code text,
  category text,
  product_name text,
  unit text,
  comment text,
  quantity numeric,
  source_key text not null,
  created_at timestamptz not null default now(),
  unique(batch_id, source_sheet, source_row)
);

create index if not exists idx_qf_import_rows_batch on public.qf_import_rows(batch_id);
create index if not exists idx_qf_import_rows_owner on public.qf_import_rows(owner_id);
create index if not exists idx_qf_import_rows_code on public.qf_import_rows(batch_id, product_code);

alter table public.qf_import_batches enable row level security;
alter table public.qf_import_rows enable row level security;
