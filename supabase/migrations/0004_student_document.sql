-- EQUIdata — tipo + número de documento de identidad, obligatorio.
--
-- Ya existen cuentas reales sin este dato (se registraron antes de este
-- cambio). Para que `NOT NULL` no rompa la migración ni les impida seguir
-- usando la app, se les asigna un valor centinela temporal
-- (`document_number` empezando en 'PENDIENTE-') — la propia app detecta ese
-- centinela y les muestra la ventana de "completa tus datos" la próxima vez
-- que entren (ver `src/lib/student/profileCompletion.ts`).

alter table public.student_profiles rename column cedula to document_number;
alter table public.student_profiles add column document_type text;

update public.student_profiles set document_type = 'CC' where document_type is null;
update public.student_profiles
  set document_number = 'PENDIENTE-' || user_id::text
  where document_number is null or document_number = '';

alter table public.student_profiles alter column document_type set not null;
alter table public.student_profiles alter column document_number set not null;

alter table public.student_profiles add constraint document_type_valido
  check (document_type in ('CC','TI','RC','CE','PA','PPT','PEP','CD','DE','SC','NIT'));
