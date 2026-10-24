-- Dossier clinique : d'abord le niveau 1 (à voir avant tout soin), puis les vaccins et les rendez-vous.

create table allergie (
  id            bigint generated always as identity primary key,
  personne_cle  uuid not null references personne,
  substance     text not null,
  reaction      text not null,
  gravite       text not null check (gravite in ('grave', 'moderee', 'legere')),
  certitude     text not null check (certitude in ('confirmee', 'soupconnee')),
  inscrite_par  text not null,
  inscrite_le   timestamptz not null default now()
);

create table medicament (
  id            bigint generated always as identity primary key,
  personne_cle  uuid not null references personne,
  nom           text not null,
  posologie     text not null,
  moments       text[] not null default '{}' check (moments <@ array['matin', 'midi', 'soir', 'coucher']),
  mise_en_garde text,
  source        text not null,
  actif         boolean not null default true
);

create table besoin_adaptation (
  id            bigint generated always as identity primary key,
  personne_cle  uuid not null references personne,
  titre         text not null,
  detail        text not null
);

create table maladie (
  id            bigint generated always as identity primary key,
  personne_cle  uuid not null references personne,
  libelle       text not null,
  dispositif    boolean not null default false,
  depuis        date,
  note          text
);

create table volonte (
  personne_cle    uuid primary key references personne,
  niveau_soins    text check (niveau_soins in ('A', 'B', 'C', 'D')),
  directives      boolean not null default false,
  don_organes     boolean,
  mise_a_jour_le  timestamptz not null default now()
);

create table vaccin (
  id            bigint generated always as identity primary key,
  personne_cle  uuid not null references personne,
  donne_le      date not null,
  produit       text not null,
  lieu          text not null,
  note          text
);

create table rendez_vous (
  id            bigint generated always as identity primary key,
  personne_cle  uuid not null references personne,
  objet         text not null,
  lieu          text not null,
  adresse       text not null,
  debut         timestamptz not null,
  statut        text not null check (statut in ('propose', 'confirme', 'annule')),
  note          text,
  modifie_le    timestamptz not null default now()
);
create index rendez_vous_personne on rendez_vous (personne_cle, debut);
