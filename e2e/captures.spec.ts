/**
 * Captures d'écran pour la documentation et les présentations : npm run captures
 * Les images sont écrites dans docs/captures/.
 */
import { test, type Page } from '@playwright/test';
import { baseNeuve, connecterCitoyen, connecterPersonnel, NUMEROS } from './outils';

baseNeuve();

const DOSSIER = 'docs/captures';
const TELEPHONE = { width: 390, height: 844 };
const ORDINATEUR = { width: 1280, height: 860 };

async function capturer(page: Page, nom: string) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${DOSSIER}/${nom}.png`, fullPage: true });
}

test('parcours citoyen', async ({ page }) => {
  await page.setViewportSize(TELEPHONE);
  await page.goto('/connexion');
  await capturer(page, '01-connexion-telephone');
  await connecterCitoyen(page, NUMEROS.gisele);
  await capturer(page, '02-accueil-telephone');
  await page.goto('/rendez-vous');
  await capturer(page, '03-rendez-vous-telephone');
  await page.goto('/medicaments');
  await capturer(page, '04-medicaments-telephone');
  await page.setViewportSize(ORDINATEUR);
  await page.goto('/resume');
  await capturer(page, '05-resume-ordinateur');
  await page.goto('/vaccins');
  await capturer(page, '06-vaccins-ordinateur');
  await page.goto('/qui-a-vu');
  await capturer(page, '07-qui-a-vu-ordinateur');
});

test('aidante', async ({ page }) => {
  await page.setViewportSize(TELEPHONE);
  await connecterCitoyen(page, NUMEROS.nadia);
  await page.getByRole('link', { name: /Gisèle Tremblay/ }).click();
  await capturer(page, '08-aidante-telephone');
});

test('clinique', async ({ page }) => {
  await page.setViewportSize(ORDINATEUR);
  await connecterPersonnel(page, 'aouellet');
  await page.getByLabel('Numéro QC ou NAM').fill('TREG 3955 0211');
  await page.getByRole('button', { name: 'Rechercher' }).click();
  await page.getByText('Vous n\'avez pas de lien de soins').waitFor();
  await capturer(page, '09-clinique-acces-urgence');
  await page.getByLabel('Patient inapte à consentir, aucun représentant joignable').check();
  await page.getByLabel(/Précision/).fill('Patiente confuse après une chute, arrivée en ambulance');
  await page.getByRole('button', { name: 'Ouvrir l\'accès d\'urgence' }).click();
  await page.locator('.statut-acces').waitFor();
  await capturer(page, '10-clinique-fiche');
  await page.emulateMedia({ colorScheme: 'dark' });
  await capturer(page, '11-clinique-fiche-sombre');
});
