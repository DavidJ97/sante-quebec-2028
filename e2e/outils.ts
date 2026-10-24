import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** Chaque test part d'une base neuve. */
export function baseNeuve() {
  test.beforeEach(async ({ request }) => {
    const r = await request.post('/api/developpement/reinitialiser');
    expect(r.status()).toBe(204);
  });
}

export const NUMEROS = {
  gisele: '4829 1357 066',
  nadia: '3061 8429 756',
  sarah: '5196 4037 286',
  kevin: '8152 7304 965',
} as const;

/** Connexion citoyen : le code de développement s'affiche à l'écran (jamais en production). */
export async function connecterCitoyen(page: Page, numero: string) {
  await page.goto('/connexion');
  await page.getByLabel('Votre numéro QC').fill(numero);
  await page.getByRole('button', { name: 'Continuer' }).click();
  const code = await page.locator('.note-dev strong.chiffres').textContent();
  await page.getByLabel('Code de sécurité').fill(code!);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /^Bonjour/ })).toBeVisible();
}

export async function connecterPersonnel(page: Page, identifiant: string) {
  await page.goto('/connexion');
  await page.getByRole('button', { name: 'Connexion du personnel' }).click();
  await page.getByLabel('Votre identifiant').fill(identifiant);
  await page.getByRole('button', { name: 'Continuer' }).click();
  const code = await page.locator('.note-dev strong.chiffres').textContent();
  await page.getByLabel('Code de sécurité').fill(code!);
  await page.getByRole('button', { name: 'Se connecter' }).click();
}

/** Aucune violation WCAG 2.1 A ou AA détectable automatiquement. */
export async function verifierAccessibilite(page: Page) {
  await page.waitForLoadState('networkidle');
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const resume = r.violations.map((v) => `${v.id} (${v.impact}) : ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
  expect(resume, resume.join('\n')).toEqual([]);
}
