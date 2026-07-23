-- Adds 'dead' as a third lifecycle terminus alongside 'sold'/'butchered'.
-- Both CHECK constraints were left unnamed in 0005_animals.sql, so Postgres
-- auto-named them using its standard {table}_{column}_check convention.
alter table public.animals drop constraint animals_status_check;
alter table public.animals add constraint animals_status_check
  check (status in ('active', 'sold', 'butchered', 'dead'));

alter table public.animal_events drop constraint animal_events_type_check;
alter table public.animal_events add constraint animal_events_type_check
  check (type in ('born', 'tag', 'weight', 'vax', 'note', 'sold', 'butchered', 'dead'));
