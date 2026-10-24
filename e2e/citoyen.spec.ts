import { expect, test } from '@playwright/test';
import { connecterCitoyen, NUMEROS, verifierAccessibilite, baseNeuve } from './outils';

baseNeuve();


test('connexion : une faute de frappe est expliquée, en haut et sur le champ', async ({ page }) => {
  await page.goto('/connexion');
  await expect(page).toHaveTitle('Se connecter – Mon dossier santé – Santé Québec');
  await verifierAccessibilite(page);
  await page.getByLabel('Votre numéro QC').fill('4829 1357 060');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Il y a un problème' })).toBeFocused();
  await expect(page.locator('.message-erreur')).toContainText('Vérifiez chaque chiffre');
  await expect(page).toHaveTitle(/^Erreur\s:/);
  await verifierAccessibilite(page);
});

test('Gisèle confirme un rendez-vous puis en déplace un autre', async ({ page }) => {
  await connecterCitoyen(page, NUMEROS.gisele);
  await expect(page.getByRole('heading', { name: 'Un rendez-vous attend votre réponse' })).toBeVisible();
  await verifierAccessibilite(page);
  await page.emulateMedia({ colorScheme: 'dark' });
  await verifierAccessibilite(page);
  await page.emulateMedia({ colorScheme: 'light' });

  await page.getByRole('main').getByRole('link', { name: 'Répondre' }).click();
  await expect(page).toHaveTitle('Mes rendez-vous – Mon dossier santé – Santé Québec');
  await page.getByRole('button', { name: 'Confirmer ma présence' }).click();
  await expect(page.getByRole('status')).toContainText('votre présence est confirmée');
  await verifierAccessibilite(page);

  await page.getByRole('button', { name: 'Choisir une autre date' }).first().click();
  await page.getByRole('group', { name: 'Choisissez une nouvelle date' }).getByRole('button').nth(1).click();
  await expect(page.getByRole('status')).toContainText('déplacé au');
});

test('résumé de santé : allergie grave mise en évidence', async ({ page }) => {
  await connecterCitoyen(page, NUMEROS.gisele);
  await page.getByRole('main').getByRole('link', { name: /Résumé de santé/ }).click();
  const allergies = page.getByRole('region', { name: 'Allergies' });
  await expect(allergies).toHaveClass(/alerte/);
  await expect(allergies).toContainText('Pénicilline');
  await expect(allergies).toContainText('Grave');
  await verifierAccessibilite(page);
});

test('médicaments et vaccins', async ({ page }) => {
  await connecterCitoyen(page, NUMEROS.gisele);
  await page.getByRole('main').getByRole('link', { name: 'Tous mes médicaments' }).click();
  await expect(page.getByRole('region', { name: 'Le matin' })).toContainText('Apixaban 5 mg');
  await verifierAccessibilite(page);
  await page.goto('/vaccins');
  await expect(page.getByRole('region', { name: /doses inscrites/ })).toContainText('Zona, 2e dose');
  await verifierAccessibilite(page);
});

test('qui a consulté mon dossier : l\'historique est là et on peut signaler', async ({ page }) => {
  await connecterCitoyen(page, NUMEROS.gisele);
  await page.getByRole('main').getByRole('link', { name: 'Historique' }).click();
  await expect(page.getByText('Julie Lemire').first()).toBeVisible();
  await expect(page.getByText('Dr Pierre Roy').first()).toBeVisible();
  await verifierAccessibilite(page);
  await page.getByRole('button', { name: 'Je ne reconnais pas cet accès' }).first().click();
  await expect(page.getByText('Signalé · une personne va vérifier')).toBeVisible();
});

test('Sarah : « aucune allergie connue » est un constat signé', async ({ page }) => {
  await connecterCitoyen(page, NUMEROS.sarah);
  await page.goto('/resume');
  const allergies = page.getByRole('region', { name: 'Allergies' });
  await expect(allergies).toContainText('Aucune allergie connue');
  await expect(allergies).toContainText('Sophie Dubé');
});

test('Kevin : allergies jamais vérifiées, affiché comme tel', async ({ page }) => {
  await connecterCitoyen(page, NUMEROS.kevin);
  await page.goto('/resume');
  await expect(page.getByRole('region', { name: 'Allergies' })).toContainText('Non documenté');
});

test('Nadia s\'occupe de sa mère : rendez-vous oui, médicaments non', async ({ page }) => {
  await connecterCitoyen(page, NUMEROS.nadia);
  await page.getByRole('main').getByRole('link', { name: /Gisèle Tremblay/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Gisèle Tremblay' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: /Rendez-vous/ })).toBeVisible();
  const prive = page.getByRole('region', { name: 'Ce qui reste privé' });
  await expect(prive).toContainText('médicaments');
  await expect(prive).toContainText('Organiser');
  await verifierAccessibilite(page);
  await page.getByRole('main').getByRole('link', { name: /Rendez-vous/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Rendez-vous' })).toBeVisible();
});
