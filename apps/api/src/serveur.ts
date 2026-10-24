import { construireApp } from './app.js';
import { migrer, ouvrirBase } from './db.js';

const developpement = process.env.SANTE_MODE === 'developpement';
if (!developpement && !process.env.SANTE_SECRET) {
  throw new Error('SANTE_SECRET est obligatoire hors développement');
}

const base = ouvrirBase();
const appliquees = await migrer(base);
const app = construireApp({ base, developpement, journaliser: true });
if (appliquees.length) app.log.info({ appliquees }, 'migrations appliquées');

const port = Number(process.env.PORT ?? 3100);
await app.listen({ port, host: process.env.HOST ?? '127.0.0.1' });

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await app.close();
    await base.fermer();
    process.exit(0);
  });
}
