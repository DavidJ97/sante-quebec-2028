/**
 * Accès à PostgreSQL.
 * - Production : un vrai serveur PostgreSQL (variable DATABASE_URL), pilote `pg`.
 * - Développement et tests : PGlite, PostgreSQL compilé en WebAssembly, même SQL, sans serveur à installer.
 */

import { mkdirSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';

export interface Executeur {
  requete<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

export interface Base extends Executeur {
  transaction<T>(travail: (tx: Executeur) => Promise<T>): Promise<T>;
  script(sql: string): Promise<void>;
  fermer(): Promise<void>;
}

export function basePGlite(dossier?: string): Base {
  if (dossier) mkdirSync(dossier, { recursive: true });
  const db = new PGlite(dossier);
  const exec = (q: Pick<PGlite, 'query'>): Executeur => ({
    async requete<T>(sql: string, params: unknown[] = []) {
      return (await q.query<T>(sql, params)).rows;
    },
  });
  return {
    ...exec(db),
    async transaction<T>(travail: (tx: Executeur) => Promise<T>): Promise<T> {
      return (await db.transaction((tx) => travail(exec(tx)))) as T;
    },
    script: async (sql) => { await db.exec(sql); },
    fermer: () => db.close(),
  };
}

export function basePostgres(url: string): Base {
  const pool = new pg.Pool({ connectionString: url, max: 10 });
  const exec = (c: pg.Pool | pg.PoolClient): Executeur => ({
    async requete<T>(sql: string, params: unknown[] = []) {
      return (await c.query(sql, params)).rows as T[];
    },
  });
  return {
    ...exec(pool),
    async transaction(travail) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const r = await travail(exec(client));
        await client.query('commit');
        return r;
      } catch (e) {
        await client.query('rollback');
        throw e;
      } finally {
        client.release();
      }
    },
    script: async (sql) => { await pool.query(sql); },
    fermer: () => pool.end(),
  };
}

const DOSSIER_MIGRATIONS = fileURLToPath(new URL('../db/migrations/', import.meta.url));

/** Applique dans l'ordre les migrations pas encore appliquées. */
export async function migrer(base: Base): Promise<string[]> {
  await base.script('create table if not exists schema_migration (nom text primary key, appliquee_le timestamptz not null default now())');
  const faites = new Set((await base.requete<{ nom: string }>('select nom from schema_migration')).map((r) => r.nom));
  const fichiers = (await readdir(DOSSIER_MIGRATIONS)).filter((f) => f.endsWith('.sql')).sort();
  const appliquees: string[] = [];
  for (const f of fichiers) {
    if (faites.has(f)) continue;
    const sql = await readFile(join(DOSSIER_MIGRATIONS, f), 'utf8');
    await base.script(`begin;\n${sql}\ninsert into schema_migration (nom) values ('${f.replace(/'/g, "''")}');\ncommit;`);
    appliquees.push(f);
  }
  return appliquees;
}

export function ouvrirBase(): Base {
  const url = process.env.DATABASE_URL;
  if (url) return basePostgres(url);
  return basePGlite(process.env.SANTE_DONNEES ?? new URL('../../../.donnees/pglite', import.meta.url).pathname);
}
