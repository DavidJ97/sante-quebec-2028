-- Registre des personnes, filiation, procurations, liens de soins, journal des accès.
-- Règle générale : on ne supprime rien. Les changements de statut sont historisés.

create table personne (
  cle             uuid primary key default gen_random_uuid(),
  prenom          text,
  nom             text,
  date_naissance  date,
  date_prevue     date,
  sexe_naissance  text check (sexe_naissance in ('F', 'M', 'X')),
  lieu_naissance  text,
  date_deces      date,
  cree_le         timestamptz not null default now(),
  check (date_naissance is not null or date_prevue is not null or prenom is null)
);

create table numero_qc (
  numero        char(11) primary key check (numero ~ '^[1-9][0-9]{10}$'),
  personne_cle  uuid not null references personne,
  statut        text not null check (statut in ('reserve', 'actif', 'temporaire', 'decede', 'fusionne', 'remplace', 'annule')),
  renvoie_vers  char(11) references numero_qc deferrable initially deferred,
  cree_le       timestamptz not null default now(),
  check ((statut in ('fusionne', 'remplace')) = (renvoie_vers is not null))
);
-- Une personne a au plus un numéro en vigueur à la fois.
create unique index numero_en_vigueur_unique on numero_qc (personne_cle) where statut in ('reserve', 'actif', 'temporaire', 'decede');

create table numero_historique (
  id        bigint generated always as identity primary key,
  numero    char(11) not null references numero_qc,
  de        text,
  a         text not null,
  motif     text not null,
  par       text not null,
  le        timestamptz not null default now()
);

create table correspondance_nam (
  nam           char(12) primary key check (nam ~ '^[A-Z]{4}[0-9]{8}$'),
  personne_cle  uuid not null references personne
);

-- Seul lien familial stocké. Source : déclaration de l'État civil, jamais un test biologique.
create table filiation (
  enfant_cle  uuid not null references personne,
  parent_cle  uuid not null references personne,
  source      text not null default 'etat_civil' check (source = 'etat_civil'),
  inscrit_le  timestamptz not null default now(),
  primary key (enfant_cle, parent_cle),
  check (enfant_cle <> parent_cle)
);

-- Avant la naissance : qui gère le profil réservé (la mère d'abord).
create table gestionnaire_prenatal (
  enfant_cle  uuid not null references personne,
  parent_cle  uuid not null references personne,
  primary key (enfant_cle, parent_cle)
);

create table coordonnees (
  personne_cle     uuid primary key references personne,
  adresse          text,
  ville            text,
  code_postal      text,
  telephone        text,
  courriel         text,
  langue           text not null default 'fr',
  mode_simplifie   boolean not null default false
);

create table procuration (
  id               bigint generated always as identity primary key,
  mandant_cle      uuid not null references personne,
  mandataire_cle   uuid not null references personne,
  niveau           smallint not null check (niveau between 1 and 4),
  debut            date not null default current_date,
  fin              date,
  revoquee_le      timestamptz,
  check (mandant_cle <> mandataire_cle)
);
create index procuration_mandant on procuration (mandant_cle);
create index procuration_mandataire on procuration (mandataire_cle);

create table employe (
  id             text primary key,
  nom            text not null,
  role           text not null,
  porte          text not null check (porte in ('clinique', 'bureaucratie', 'admintech')),
  etablissement  text not null,
  telephone      text not null,
  actif          boolean not null default true
);

create table lien_soins (
  id            bigint generated always as identity primary key,
  employe_id    text not null references employe,
  personne_cle  uuid not null references personne,
  contexte      text not null,
  urgence       boolean not null default false,
  motif         text,
  debut         timestamptz not null default now(),
  fin           timestamptz,
  check (not urgence or (motif is not null and length(motif) >= 10 and fin is not null))
);
create index lien_soins_personne on lien_soins (personne_cle, employe_id);

-- Journal des accès : chaque entrée porte l'empreinte SHA-256 de la précédente.
create table journal_acces (
  no               bigint primary key,
  le               timestamptz not null,
  demandeur_type   text not null,
  demandeur_id     text not null,
  sujet            char(11),
  donnee           text not null,
  action           text not null,
  motif            text not null default '',
  decision         text not null check (decision in ('permis', 'refuse')),
  raison           text not null,
  urgence          boolean not null default false,
  precedente       char(64) not null,
  empreinte        char(64) not null unique
);
create index journal_sujet on journal_acces (sujet, no desc);

-- Personne, pas même un administrateur de l'application, ne peut modifier ou effacer une entrée.
create function journal_refuser_modification() returns trigger language plpgsql as $$
begin
  raise exception 'Le journal des accès ne peut être ni modifié ni effacé';
end $$;
create trigger journal_inalterable before update or delete on journal_acces
  for each row execute function journal_refuser_modification();
create trigger journal_pas_de_vidage before truncate on journal_acces
  for each statement execute function journal_refuser_modification();

-- Signalements faits par les personnes depuis « Qui a vu mon dossier ».
create table signalement (
  id            bigint generated always as identity primary key,
  journal_no    bigint not null references journal_acces,
  personne_cle  uuid not null references personne,
  le            timestamptz not null default now(),
  traite_le     timestamptz,
  unique (journal_no, personne_cle)
);

-- Connexion par code à usage unique, puis session.
create table code_connexion (
  id          bigint generated always as identity primary key,
  cible_type  text not null check (cible_type in ('citoyen', 'employe')),
  cible_id    text not null,
  code_hash   char(64) not null,
  expire_le   timestamptz not null,
  essais      smallint not null default 0,
  utilise_le  timestamptz
);
create index code_connexion_cible on code_connexion (cible_type, cible_id);

create table session (
  jeton_hash  char(64) primary key,
  type        text not null check (type in ('citoyen', 'employe')),
  sujet_id    text not null,
  cree_le     timestamptz not null default now(),
  expire_le   timestamptz not null
);
