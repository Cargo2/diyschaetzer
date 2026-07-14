-- Aufgabe X1: XRechnung nur für Firmen mit Sitz in Deutschland
--
-- Nicht in Deutschland ansässige Betriebe müssen keine XRechnung liefern und sollen
-- nicht mit Pflichtfeld-Warnungen gegängelt werden. Dafür braucht das Firmenprofil ein
-- Verkäuferland. Additiv: Bestandszeilen erhalten den Default 'DE' (unverändertes
-- Verhalten für alle bisherigen Profile).

alter table public.company_profiles
  add column if not exists country_code text not null default 'DE';

-- Format-Absicherung (zweistelliges Großbuchstaben-Länderkürzel, ISO 3166-1 alpha-2 –
-- nicht gegen die tatsächliche Codeliste geprüft). Idempotent über Drop-Guard.
alter table public.company_profiles
  drop constraint if exists company_profiles_country_code_check;
alter table public.company_profiles
  add constraint company_profiles_country_code_check
    check (country_code ~ '^[A-Z]{2}$');
