import { useState } from 'react';
import { SAMUEL, PROCHES, GROUPES, VACCINS, RENCONTRES, RESULTATS, ETAPES } from '../parcours.js';

const dateFr = (iso) => new Date(iso + 'T12:00').toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });
function ageA(naissance, date) {
  const n = new Date(naissance), d = new Date(date);
  let a = d.getFullYear() - n.getFullYear();
  if (d.getMonth() < n.getMonth() || (d.getMonth() === n.getMonth() && d.getDate() < n.getDate())) a -= 1;
  if (a >= 1) return `${a} an${a > 1 ? 's' : ''}`;
  const mois = (d.getFullYear() - n.getFullYear()) * 12 + d.getMonth() - n.getMonth() - (d.getDate() < n.getDate() ? 1 : 0);
  return mois >= 1 ? `${mois} mois` : 'nouveau-né';
}

export default function Parcours() {
  const [id, setId] = useState('moins1m');
  const e = ETAPES.find((x) => x.id === id);
  const avant = (d) => d <= e.date;
  const vaccins = VACCINS.filter(([d]) => avant(d));
  const rencontres = RENCONTRES.filter(([d]) => avant(d)).slice(-6).reverse();
  const resultats = RESULTATS.filter(([d]) => avant(d)).slice(-5).reverse();

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h1 style={{ fontSize: 28 }}>La fiche de {SAMUEL.nom}, toute une vie</h1>
        <p className="discret">Une personne fictive, le même numéro de la réservation à la vieillesse. Choisissez un moment.</p>
      </div>
      <nav className="rangee" aria-label="Moment de la vie">
        {ETAPES.map((x) => (
          <button key={x.id} type="button" className={`btn ${x.id === id ? 'plein' : 'neutre'}`} style={{ minHeight: 44 }} aria-pressed={x.id === id} onClick={() => setId(x.id)}>{x.court}</button>
        ))}
      </nav>

      <section className="carte" style={{ borderColor: 'var(--accent)', borderWidth: 2 }}>
        <p className="discret">{dateFr(e.date)}</p>
        <h2 style={{ fontSize: 26 }}>{e.titre}</h2>
        <p style={{ fontSize: 18 }}>{e.resume}</p>
      </section>

      <div className="grille">
        <Bloc titre="Identité">
          <Lignes lignes={e.identite} />
        </Bloc>
        <Bloc titre="Qui voit quoi">
          <Lignes lignes={e.acces} />
        </Bloc>
      </div>

      <h2 style={{ fontSize: 20, color: 'var(--secondaire)' }}>Niveau 1 · à voir avant tout soin</h2>
      {e.vide1 ? <div className="carte"><p>{e.vide1}</p></div> : (
        <div className="grille">
          <Bloc titre="Allergies" critique={e.niveau1.allergies.some((a) => Array.isArray(a) && a[2])}><Items items={e.niveau1.allergies} vide="Aucune connue" /></Bloc>
          <Bloc titre="Médicaments"><Items items={e.niveau1.medicaments} vide="Aucun" /></Bloc>
          <Bloc titre="Besoins d'adaptation"><Items items={e.niveau1.adaptation} vide="Aucun" /></Bloc>
          <Bloc titre="Maladies et dispositifs à risque"><Items items={e.niveau1.maladies} vide="Aucun" /></Bloc>
          <Bloc titre="Volontés"><Items items={e.niveau1.volontes} vide="Aucune inscrite" /></Bloc>
          {e.soinsNaissance && <Bloc titre="Soins à la naissance"><Lignes lignes={e.soinsNaissance} /></Bloc>}
        </div>
      )}
      {e.choix && <Bloc titre="Choix prénataux faits par la mère"><Lignes lignes={e.choix} /></Bloc>}
      {e.confidentiel && <div className="carte" style={{ borderStyle: 'dashed' }}><span className="etiq avert" style={{ alignSelf: 'flex-start' }}>Confidentiel</span><p>{e.confidentiel}</p></div>}

      <h2 style={{ fontSize: 20, color: 'var(--secondaire)' }}>Famille · calculée à partir des liens parent-enfant</h2>
      <div className="grille">
        {GROUPES.map(([g, titre]) => {
          const membres = PROCHES.filter((p) => p.rel === g && p.naissance <= e.date && (!p.depuis || p.depuis <= e.date));
          if (!membres.length) return null;
          return (
            <Bloc key={g} titre={titre}>
              {membres.map((p) => {
                const mort = p.deces && p.deces <= e.date;
                return (
                  <div key={p.numero}>
                    <p><strong>{p.nom}</strong> · {p.lien}</p>
                    <p className="discret petit"><span className="num">{p.numero}</span> · {mort ? <span className="etiq">Décédé·e en {p.deces.slice(0, 4)} · numéro archivé</span> : ageA(p.naissance, e.date)}</p>
                  </div>
                );
              })}
            </Bloc>
          );
        })}
      </div>

      {e.aCharge.length > 0 && <>
        <h2 style={{ fontSize: 20, color: 'var(--secondaire)' }}>Personnes dont Samuel s'occupe</h2>
        <div className="grille">
          {e.aCharge.map((p) => (
            <Bloc key={p.nom} titre={p.nom}>
              <p className="discret">{p.lien}</p>
              <p><strong>Pourquoi :</strong> {p.base}</p>
              <p><strong>Ce qu'il voit :</strong> {p.voit}</p>
              <p>{p.detail}</p>
            </Bloc>
          ))}
        </div>
      </>}

      <div className="grille">
        <Bloc titre={`Carnet vaccinal · ${vaccins.length} inscription${vaccins.length > 1 ? 's' : ''}`}>
          {vaccins.length ? vaccins.map(([d, n, ou, note]) => <p key={d + n}><span className="num discret">{d}</span> · <strong>{n}</strong><br /><span className="discret petit">{ou}{note && ` · ${note}`}</span></p>) : <p>Rien encore</p>}
        </Bloc>
        <Bloc titre="Dernières rencontres">
          {rencontres.length ? rencontres.map(([d, qui, quoi]) => <p key={d + qui}><span className="num discret">{d}</span> · <strong>{qui}</strong><br /><span className="discret petit">{quoi}</span></p>) : <p>Aucune</p>}
        </Bloc>
        <Bloc titre="Derniers résultats">
          {resultats.length ? resultats.map(([d, t, r]) => <p key={d + t}><span className="num discret">{d}</span> · {t} : <strong>{r}</strong></p>) : <p>Aucun</p>}
        </Bloc>
        <Bloc titre="Rendez-vous à venir">
          {e.rendezvous.map(([d, q, ou]) => <p key={d + q}><span className="num discret">{d}</span> · <strong>{q}</strong><br /><span className="discret petit">{ou}</span></p>)}
        </Bloc>
        {e.administration && <Bloc titre="Médicaments donnés aujourd'hui"><Lignes lignes={e.administration.map(([m, q, s]) => [m, `${q} — ${s}`])} /></Bloc>}
        <Bloc titre="Procurations données par Samuel">
          {e.procurations.length ? e.procurations.map(([qui, niv, fin]) => <p key={qui}><strong>{qui}</strong> · {niv}<br /><span className="discret petit">{fin}</span></p>) : <p>Aucune{e.id === 'a1' || e.id === 'a10' || e.id === 'j0' || e.id === 'moins1m' ? ' : il est mineur, ce sont ses parents qui gèrent' : ''}</p>}
        </Bloc>
        <Bloc titre="Qui a vu le dossier récemment">
          {e.journal.map(([qui, quoi]) => <p key={qui + quoi}><strong>{qui}</strong><br /><span className="discret petit">{quoi}</span></p>)}
        </Bloc>
        <Bloc titre="Ce qui change à cette étape">
          {e.changements.map((c) => <p key={c}>• {c}</p>)}
        </Bloc>
      </div>
      <p className="discret petit">Vaccins des enfants : calendrier du Programme d'immunisation du Québec publié en 2026. Les étapes après 2026 sont imaginées.</p>
    </>
  );
}

function Bloc({ titre, children, critique }) {
  return <section className={`carte ${critique ? 'critique' : ''}`}><h3 style={{ fontSize: 19 }}>{titre}</h3>{children}</section>;
}
function Lignes({ lignes }) {
  return <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>{lignes.map(([k, v]) => <div key={k}><dt className="discret petit">{k}</dt><dd style={{ margin: 0 }}>{v}</dd></div>)}</dl>;
}
function Items({ items, vide }) {
  if (!items.length) return <p>{vide}</p>;
  return items.map((it) => (Array.isArray(it) ? <p key={it[0]}><strong>{it[0]}</strong> · {it[1]}</p> : <p key={it}>{it}</p>));
}
