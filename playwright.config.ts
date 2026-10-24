import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * Tests de bout en bout : une API neuve (base de développement re-semée) et l'application construite.
 * Ports dédiés pour ne pas déranger un environnement de développement en cours.
 */
const API = 'http://127.0.0.1:3199';
const WEB = 'http://127.0.0.1:4199';
const DONNEES = resolve('.donnees/e2e');

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: WEB, locale: 'fr-CA', timezoneId: 'America/Toronto', trace: 'retain-on-failure' },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testIgnore: /captures/ },
    { name: 'ordinateur', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } }, testIgnore: /captures/ },
    { name: 'captures', testMatch: /captures/, use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'npm run seed -w apps/api && npx tsx apps/api/src/serveur.ts',
      url: `${API}/api/sante`,
      env: { SANTE_MODE: 'developpement', SANTE_DONNEES: DONNEES, PORT: '3199' },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'npm run build -w apps/web && npx vite preview apps/web --port 4199 --strictPort --host 127.0.0.1',
      url: WEB,
      env: { API_URL: API },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
