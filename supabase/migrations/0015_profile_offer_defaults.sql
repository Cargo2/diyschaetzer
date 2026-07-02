-- Phase 13 (Block: Profil-Textvorlagen + Material-Aufschlag-Default)
--
-- Profis hinterlegen im Firmenprofil Standard-Texte (Einleitung/Schluss) und einen
-- Default-Materialaufschlag. Diese füllen ein NEU erzeugtes Angebot vor; pro Angebot
-- bleibt alles überschreibbar. Additive Spalten mit Default → Altdaten unberührt.
-- Owner-scoped RLS der Tabelle (0006) deckt die Spalten ab, kein Policy-Update nötig.

alter table public.company_profiles
  add column if not exists offer_intro_text text not null default '',
  add column if not exists offer_outro_text text not null default '',
  add column if not exists material_surcharge_percent numeric not null default 0;
