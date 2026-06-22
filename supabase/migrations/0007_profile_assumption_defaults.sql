-- Phase 13 (Block: Profil-Standardannahmen) – Standard-Preise je Profi
--
-- Profis können Default-Werte für die bearbeitbaren Annahmen (Profi-Einheits-
-- preise + Fliesen-Richtwert) hinterlegen. Diese ersetzen den System-Default im
-- Wizard; ein Raum-`user_override` hat weiterhin Vorrang
-- (Raum-Override > Profil-Default > System-Default).
--
-- Speicherung als partielle Map (assumption-pfad -> wert) im bestehenden
-- company_profiles-Datensatz. RLS der Tabelle (owner-scoped) deckt die Spalte ab.

alter table public.company_profiles
  add column if not exists assumption_defaults jsonb not null default '{}'::jsonb;
