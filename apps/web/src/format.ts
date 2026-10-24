const FUSEAU = 'America/Toronto';

export const jour = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', timeZone: FUSEAU });

export const jourAnnee = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: FUSEAU });

export const heure = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-CA', { hour: 'numeric', minute: '2-digit', timeZone: FUSEAU }).replace(':', ' h ').replace(' h 00', ' h');

export const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function age(dateNaissance: string | null): number | null {
  if (!dateNaissance) return null;
  const [a, m, j] = dateNaissance.split('-').map(Number) as [number, number, number];
  const n = new Date();
  let x = n.getFullYear() - a;
  if (n.getMonth() + 1 < m || (n.getMonth() + 1 === m && n.getDate() < j)) x -= 1;
  return x;
}

export const MOMENTS = { matin: 'Le matin', midi: 'Le midi', soir: 'Le soir', coucher: 'Au coucher' } as const;
export const GRAVITE = { grave: 'Grave', moderee: 'Modérée', legere: 'Légère' } as const;
export const CERTITUDE = { confirmee: 'confirmée', soupconnee: 'soupçonnée' } as const;
