import { useParams } from 'react-router-dom';
import { Corps, TetePage, useTitre } from '../composants/Gabarit';
import type { NomIllustration } from '../composants/Illustration';

const PAGES: Record<string, { titre: string; illustration: NomIllustration; chapeau: string; contenu: { titre: string; texte: string[] }[] }> = {
  accessibilite: {
    titre: 'Accessibilité',
    illustration: 'adaptation',
    chapeau: 'Ce service est conçu d\'abord pour les personnes âgées et pour celles qui vivent avec un handicap.',
    contenu: [
      { titre: 'Ce que nous visons', texte: ['Le niveau AA des Règles pour l\'accessibilité des contenus Web (WCAG 2.1), comme l\'exige le standard gouvernemental québécois sur l\'accessibilité du Web.'] },
      { titre: 'Ce qui est déjà en place', texte: [
        'Texte de 18 pixels au minimum, contrastes vérifiés, cibles tactiles d\'au moins 48 pixels.',
        'Navigation complète au clavier, focus très visible, lien pour passer au contenu principal.',
        'Erreurs de formulaire annoncées aux lecteurs d\'écran et résumées en haut de la page.',
        'Aucune information n\'est donnée par la couleur seule. Les illustrations sont décoratives.',
        'Des tests automatiques d\'accessibilité vérifient chaque page à chaque modification.',
      ] },
      { titre: 'Ce qui reste à faire', texte: ['Des essais avec des personnes âgées, des personnes aveugles ou malvoyantes et des personnes sourdes, avant toute mise en service.'] },
    ],
  },
  confidentialite: {
    titre: 'Confidentialité',
    illustration: 'journal',
    chapeau: 'Vos renseignements de santé ne sont montrés qu\'aux personnes qui en ont besoin pour vous soigner, ou à qui vous l\'avez permis.',
    contenu: [
      { titre: 'Qui peut voir quoi', texte: [
        'Vous voyez tout votre dossier. Avant 14 ans, ce sont vos parents ; entre 14 et 17 ans, vos soins confidentiels restent les vôtres.',
        'Une professionnelle ou un professionnel de la santé doit avoir un lien de soins avec vous. Sinon, l\'accès est refusé.',
        'Le personnel administratif voit votre identité et vos rendez-vous, jamais le contenu clinique. L\'équipe technique ne voit aucun contenu.',
      ] },
      { titre: 'Les personnes de confiance', texte: ['Vous pouvez donner une procuration à un proche, à l\'un des quatre niveaux : être averti, organiser, consulter, représenter.'] },
    ],
  },
  journal: {
    titre: 'Comment vos accès sont protégés',
    illustration: 'journal',
    chapeau: 'Chaque consultation de votre dossier est inscrite. Vous pouvez voir qui l\'a consulté, quand, et pourquoi.',
    contenu: [
      { titre: 'Un journal qu\'on ne peut pas effacer', texte: [
        'Chaque inscription contient une empreinte numérique de la précédente. Modifier ou retirer une seule ligne briserait la chaîne et serait détecté.',
        'La base de données refuse toute modification ou suppression du journal, même à un administrateur de l\'application.',
      ] },
      { titre: 'Les accès d\'urgence', texte: ['En cas d\'urgence, un soignant peut ouvrir votre dossier sans lien de soins. Il doit choisir un motif, l\'accès dure 12 heures, vous le voyez et une équipe le revoit.'] },
    ],
  },
};

export default function APropos() {
  const { page = '' } = useParams();
  const p = PAGES[page] ?? PAGES.accessibilite!;
  useTitre(p.titre, 'Santé Québec');
  return (
    <main id="contenu" tabIndex={-1}>
      <TetePage illustration={p.illustration} fil={[{ vers: '/', texte: 'Accueil' }]} titre={p.titre} chapeau={p.chapeau} />
      <Corps etroit>
        {p.contenu.map((s) => (
          <section key={s.titre} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2>{s.titre}</h2>
            {s.texte.length > 1 ? <ul style={{ margin: 0, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>{s.texte.map((t) => <li key={t}>{t}</li>)}</ul> : <p>{s.texte[0]}</p>}
          </section>
        ))}
      </Corps>
    </main>
  );
}
