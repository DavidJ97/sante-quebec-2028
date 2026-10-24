-- Photo d'identification : prise en point de service (citoyens) ou par l'établissement (personnel).
-- Elle sert à reconnaître la personne, à l'urgence comme au comptoir. Aucune reconnaissance faciale.
create table photo (
  id            bigint generated always as identity primary key,
  personne_cle  uuid references personne,
  employe_id    text references employe,
  image         bytea not null,
  type_mime     text not null check (type_mime in ('image/jpeg', 'image/png', 'image/webp')),
  prise_le      date not null,
  source        text not null check (source in ('point_de_service', 'etablissement', 'depot_initial')),
  check ((personne_cle is null) <> (employe_id is null)),
  check (octet_length(image) <= 2000000)
);
create index photo_personne on photo (personne_cle, prise_le desc);
create index photo_employe on photo (employe_id, prise_le desc);
