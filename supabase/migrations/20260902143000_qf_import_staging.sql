create table public.qf_import_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  source_file_name text not null,
  source_file_hash text not null,
  source_format text not null default 'xlsm',
  expected_entry_rows integer not null default 488,
  expected_entry_quantity numeric not null default 45741,
  expected_exit_rows integer not null default 904,
  expected_exit_quantity numeric not null default 43747,
  expected_product_count integer not null default 33,
  source_totals jsonb not null default '{}'::jsonb,
  status text not null default 'analyzed' check (status in ('analyzed','staged','validated','posted','failed')),
  created_at timestamptz not null default now(),
  validated_at timestamptz,
  posted_at timestamptz,
  created_by uuid not null references auth.users(id),
  unique (owner_id, source_file_hash)
);

create table public.qf_import_staging_rows (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid not null references public.qf_import_runs(id) on delete restrict,
  source_sheet text not null,
  source_row_number integer not null check (source_row_number > 0),
  source_row_key text not null,
  movement_direction text not null check (movement_direction in ('ENTRY','EXIT','INITIAL')),
  original_document text,
  original_supplier text,
  original_customer text,
  original_product_code text,
  original_product_name text,
  original_quantity numeric,
  original_unit text,
  original_date text,
  raw_payload jsonb not null,
  normalized_payload jsonb not null,
  resolved_product_id uuid,
  resolved_supplier_id uuid,
  resolved_customer_id uuid,
  validation_status text not null default 'pending' check (validation_status in ('pending','valid','warning','error')),
  created_at timestamptz not null default now(),
  unique (import_run_id, source_sheet, source_row_number),
  unique (source_row_key)
);

create table public.qf_import_product_map (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid not null references public.qf_import_runs(id) on delete restrict,
  source_product_code text,
  source_product_name text not null,
  normalized_match_key text not null,
  target_product_id uuid,
  mapping_status text not null check (mapping_status in ('matched','ambiguous','unmatched','approved')),
  mapping_note text,
  created_at timestamptz not null default now(),
  unique (import_run_id, normalized_match_key)
);

create table public.qf_import_validation_results (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid not null references public.qf_import_runs(id) on delete restrict,
  staging_row_id uuid references public.qf_import_staging_rows(id) on delete restrict,
  severity text not null check (severity in ('info','warning','error')),
  validation_code text not null,
  dedupe_key text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (import_run_id, dedupe_key)
);

create index qf_import_staging_rows_run_idx on public.qf_import_staging_rows (import_run_id, movement_direction);
create index qf_import_staging_rows_product_idx on public.qf_import_staging_rows (import_run_id, resolved_product_id);
create index qf_import_validation_results_run_idx on public.qf_import_validation_results (import_run_id, severity);

alter table public.qf_import_runs enable row level security;
alter table public.qf_import_staging_rows enable row level security;
alter table public.qf_import_product_map enable row level security;
alter table public.qf_import_validation_results enable row level security;

create policy qf_import_runs_owner_select on public.qf_import_runs for select to authenticated using (owner_id = auth.uid());
create policy qf_import_runs_owner_insert on public.qf_import_runs for insert to authenticated with check (owner_id = auth.uid() and created_by = auth.uid());
create policy qf_import_runs_owner_update on public.qf_import_runs for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy qf_import_staging_owner_select on public.qf_import_staging_rows for select to authenticated using (exists (select 1 from public.qf_import_runs r where r.id = import_run_id and r.owner_id = auth.uid()));
create policy qf_import_staging_owner_insert on public.qf_import_staging_rows for insert to authenticated with check (exists (select 1 from public.qf_import_runs r where r.id = import_run_id and r.owner_id = auth.uid()));
create policy qf_import_staging_owner_update on public.qf_import_staging_rows for update to authenticated using (exists (select 1 from public.qf_import_runs r where r.id = import_run_id and r.owner_id = auth.uid())) with check (exists (select 1 from public.qf_import_runs r where r.id = import_run_id and r.owner_id = auth.uid()));

create policy qf_import_product_map_owner_select on public.qf_import_product_map for select to authenticated using (exists (select 1 from public.qf_import_runs r where r.id = import_run_id and r.owner_id = auth.uid()));
create policy qf_import_product_map_owner_insert on public.qf_import_product_map for insert to authenticated with check (exists (select 1 from public.qf_import_runs r where r.id = import_run_id and r.owner_id = auth.uid()));
create policy qf_import_product_map_owner_update on public.qf_import_product_map for update to authenticated using (exists (select 1 from public.qf_import_runs r where r.id = import_run_id and r.owner_id = auth.uid())) with check (exists (select 1 from public.qf_import_runs r where r.id = import_run_id and r.owner_id = auth.uid()));

create policy qf_import_validation_owner_select on public.qf_import_validation_results for select to authenticated using (exists (select 1 from public.qf_import_runs r where r.id = import_run_id and r.owner_id = auth.uid()));
create policy qf_import_validation_owner_insert on public.qf_import_validation_results for insert to authenticated with check (exists (select 1 from public.qf_import_runs r where r.id = import_run_id and r.owner_id = auth.uid()));
