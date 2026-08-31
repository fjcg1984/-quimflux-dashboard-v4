-- QUIMFLUX V5
-- CORRECCIÓN DEL ERROR: permission denied for table personal
-- Y PREPARACIÓN PARA CONTROL DE PERMISOS, VACACIONES Y FALTAS
--
-- Ejecutar este archivo en Supabase > SQL Editor.
-- IMPORTANTE: estas políticas asumen que la tabla public.personal
-- tiene una columna user_id de tipo uuid que identifica al usuario
-- autenticado que creó/gestiona el registro.

begin;

-- ============================================================
-- 1. CORREGIR RLS DE LA TABLA PERSONAL
-- ============================================================

alter table public.personal enable row level security;

drop policy if exists "personal_select_authenticated" on public.personal;
drop policy if exists "personal_insert_authenticated" on public.personal;
drop policy if exists "personal_update_authenticated" on public.personal;
drop policy if exists "personal_delete_authenticated" on public.personal;

create policy "personal_select_authenticated"
on public.personal
for select
to authenticated
using (user_id = auth.uid());

create policy "personal_insert_authenticated"
on public.personal
for insert
to authenticated
with check (user_id = auth.uid());

create policy "personal_update_authenticated"
on public.personal
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "personal_delete_authenticated"
on public.personal
for delete
to authenticated
using (user_id = auth.uid());


-- ============================================================
-- 2. TABLA PARA PERMISOS, VACACIONES Y FALTAS
-- ============================================================
-- Se utiliza DNI como vínculo para no depender de la estructura
-- interna de la tabla personal. Esto permite conservar los datos
-- existentes y llevar un historial independiente de novedades.

create table if not exists public.personal_novedades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,

  dni text not null,
  tipo text not null
    check (tipo in ('PERMISO','VACACIONES','FALTA','DESCANSO_MEDICO','OTRO')),

  fecha_inicio date not null,
  fecha_fin date not null,

  motivo text,
  estado text not null default 'REGISTRADO'
    check (estado in ('REGISTRADO','APROBADO','RECHAZADO','CERRADO')),

  observaciones text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint personal_novedades_fechas_validas
    check (fecha_fin >= fecha_inicio)
);

create index if not exists idx_personal_novedades_user
  on public.personal_novedades(user_id);

create index if not exists idx_personal_novedades_dni
  on public.personal_novedades(dni);

create index if not exists idx_personal_novedades_fecha
  on public.personal_novedades(fecha_inicio, fecha_fin);

alter table public.personal_novedades enable row level security;

drop policy if exists "personal_novedades_select_authenticated"
  on public.personal_novedades;
drop policy if exists "personal_novedades_insert_authenticated"
  on public.personal_novedades;
drop policy if exists "personal_novedades_update_authenticated"
  on public.personal_novedades;
drop policy if exists "personal_novedades_delete_authenticated"
  on public.personal_novedades;

create policy "personal_novedades_select_authenticated"
on public.personal_novedades
for select
to authenticated
using (user_id = auth.uid());

create policy "personal_novedades_insert_authenticated"
on public.personal_novedades
for insert
to authenticated
with check (user_id = auth.uid());

create policy "personal_novedades_update_authenticated"
on public.personal_novedades
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "personal_novedades_delete_authenticated"
on public.personal_novedades
for delete
to authenticated
using (user_id = auth.uid());


-- ============================================================
-- 3. VISTA DE RESUMEN PARA EL CONTROL DE PERSONAL
-- ============================================================
-- Permite obtener rápidamente días registrados por trabajador.
-- La aplicación podrá usarla después para mostrar:
-- - permisos
-- - vacaciones
-- - faltas
-- - otros eventos
--
-- No sustituye a la tabla de historial.

create or replace view public.personal_resumen_novedades
with (dni, permisos, vacaciones, faltas, otros)
as
select
  dni,
  count(*) filter (where tipo = 'PERMISO') as permisos,
  count(*) filter (where tipo = 'VACACIONES') as vacaciones,
  count(*) filter (where tipo = 'FALTA') as faltas,
  count(*) filter (
    where tipo not in ('PERMISO','VACACIONES','FALTA')
  ) as otros
from public.personal_novedades
where user_id = auth.uid()
group by dni;


-- ============================================================
-- 4. NOTA SOBRE user_id
-- ============================================================
-- Si la tabla personal NO tiene user_id, primero hay que agregarlo
-- antes de crear las políticas anteriores:
--
-- alter table public.personal
-- add column if not exists user_id uuid references auth.users(id);
--
-- Después, los registros existentes deben asociarse al usuario
-- correspondiente antes de activar las políticas restrictivas.
--
-- NO ejecutar esa parte a ciegas si personal ya utiliza otra
-- estructura de propietario/usuario.

commit;


-- ============================================================
-- DISEÑO DEL MÓDULO PERSONAL V5
-- ============================================================
--
-- Mantener:
--   DNI
--   Nombre completo
--   Fecha de ingreso
--   Cargo
--   Área
--   Turno
--   Estado
--   Observaciones
--
-- Añadir una sección "Control de asistencia y novedades":
--
-- Tipo:
--   Permiso
--   Vacaciones
--   Falta
--   Descanso médico
--   Otro
--
-- Fecha inicio
-- Fecha fin
-- Motivo
-- Estado:
--   Registrado
--   Aprobado
--   Rechazado
--   Cerrado
-- Observaciones
--
-- Y mostrar por trabajador:
--   Permisos
--   Días de vacaciones
--   Faltas
--   Otros eventos
--
-- IMPORTANTE:
-- El código JavaScript de la aplicación V5 debe usar:
--
--   supabase.from('personal')
--
-- para el maestro de trabajadores, y:
--
--   supabase.from('personal_novedades')
--
-- para permisos/vacaciones/faltas.
--
-- Esto evita mezclar la ficha del trabajador con su historial.
