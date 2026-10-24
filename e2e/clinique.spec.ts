import { expect, test } from '@playwright/test';
import { connecterPersonnel, verifierAccessibilite, baseNeuve } from './outils';

baseNeuve();

test('médecin d\'urgence : refus, accès d\'urgence motivé, puis fiche de niveau 1', async ({ page }) => {
  await connecterPersonnel(page, 'aouellet');
  await expect(page.getByRole('heading', { level: 1, name: 'Trouver un patient' })).toBeVisible();
  await verifierAccessibilite(page);

  await page.getByLabel('Numéro QC ou NAM').fill('TREG 3955 0211');
  await page.getByRole('button', { name: 'Rechercher' }).click();

  const bandeau = page.getByRole('region', { name: 'Patient' });
  await expect(bandeau).toContainText('TREMBLAY');
  await expect(bandeau).toContainText('2 mai 1939');
  await expect(page.getByText('Vous n\'avez pas de lien de soins avec cette personne.')).toBeVisible();
  await verifierAccessibilite(page);

  // Sans motif : erreur
  await page.getByRole('button', { name: 'Ouvrir l\'accès d\'urgence' }).click();
  await expect(page.getByRole('heading', { name: 'Il y a un problème' })).toBeVisible();

  await page.getByLabel('Patient inapte à consentir, aucun représentant joignable').check();
  await page.getByLabel(/Précision/).fill('Patiente confuse après une chute, arrivée en ambulance');
  await page.getByRole('button', { name: 'Ouvrir l\'accès d\'urgence' }).click();

  await expect(page.locator('.statut-acces')).toContainText('Accès d\'urgence');
  await expect(page.locator('.statut-acces')).toContainText('Expire à');
  await expect(page.getByRole('region', { name: 'Allergies' })).toContainText('Pénicilline');
  await expect(bandeau).toContainText('Allergies : Pénicilline, Arachides');
  await expect(page.getByRole('region', { name: 'Volontés' })).toContainText('Assurer le confort en priorité');
  await verifierAccessibilite(page);
  // Le thème sombre doit respecter les mêmes contrastes
  await page.emulateMedia({ colorScheme: 'dark' });
  await verifierAccessibilite(page);
});

test('médecin de famille : accès direct par le lien de soins', async ({ page }) => {
  await connecterPersonnel(page, 'proy');
  await page.getByLabel('Numéro QC ou NAM').fill('4829 1357 066');
  await page.getByRole('button', { name: 'Rechercher' }).click();
  await expect(page.locator('.statut-acces')).toContainText('Lien de soins : Médecin de famille');
});
