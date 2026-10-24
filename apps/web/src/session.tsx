import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ErreurApi, type Moi } from './api';

interface Session {
  moi: Moi | null;
  pret: boolean;
  recharger: () => Promise<void>;
  deconnecter: () => Promise<void>;
  expiree: boolean;
}

const Ctx = createContext<Session | null>(null);

export function FournisseurSession({ children }: { children: ReactNode }) {
  const [moi, setMoi] = useState<Moi | null>(null);
  const [pret, setPret] = useState(false);
  const [expiree, setExpiree] = useState(false);

  const recharger = useCallback(async () => {
    try {
      setMoi(await api.get<Moi>('/moi'));
      setExpiree(false);
    } catch (e) {
      if (!(e instanceof ErreurApi && e.statut === 401)) throw e;
      setMoi(null);
    } finally {
      setPret(true);
    }
  }, []);

  const deconnecter = useCallback(async () => {
    await api.delete('/connexion').catch(() => {});
    setMoi(null);
  }, []);

  useEffect(() => { recharger().catch(() => setPret(true)); }, [recharger]);

  useEffect(() => {
    const surExpiration = () => {
      setMoi((m) => {
        if (m) setExpiree(true);
        return null;
      });
    };
    window.addEventListener('session-expiree', surExpiration);
    return () => window.removeEventListener('session-expiree', surExpiration);
  }, []);

  return <Ctx.Provider value={{ moi, pret, recharger, deconnecter, expiree }}>{children}</Ctx.Provider>;
}

export function useSession(): Session {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSession hors du fournisseur');
  return s;
}
