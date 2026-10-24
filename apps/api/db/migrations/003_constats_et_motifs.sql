-- 1. « Aucune allergie connue » doit être un constat explicite, daté et signé.
--    Une liste vide veut dire « non documenté », jamais « aucune ».
create table constat_absence (
  personne_cle  uuid not null references personne,
  domaine       text not null check (domaine in ('allergies')),
  verifie_le    timestamptz not null default now(),
  verifie_par   text not null references employe,
  primary key (personne_cle, domaine)
);

-- 2. Accès d'urgence : motif normalisé, précision obligatoire pour « autre ».
alter table lien_soins drop constraint if exists lien_soins_check;
alter table lien_soins add column motif_code text
  check (motif_code in ('inconscient', 'urgence_vitale', 'transfert', 'inapte', 'autre'));
alter table lien_soins add constraint lien_soins_urgence_motif check (
  not urgence or (
    fin is not null and motif_code is not null
    and (motif_code <> 'autre' or (motif is not null and length(motif) >= 10))
  )
);

-- 3. Revue des accès d'urgence par l'exploitation.
alter table lien_soins add column revu_le timestamptz;
alter table lien_soins add column revu_par text references employe;
alter table lien_soins add column revue_decision text check (revue_decision in ('justifie', 'enquete'));
