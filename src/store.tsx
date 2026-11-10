import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import * as db from './db';
import type { Checkin, Product, Settings } from './types';

interface Store extends db.Data {
  /** даты, за которые есть фото */
  photoDates: string[];
  saveCheckin(c: Checkin): void;
  saveSettings(s: Settings): void;
  saveProduct(p: Product): void;
  removeProduct(id: string): void;
  refreshPhotos(): Promise<void>;
  reload(): Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider не подключён');
  return s;
}

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<db.Data | null>(null);
  const [photoDates, setPhotoDates] = useState<string[]>([]);
  const [error, setError] = useState('');

  const fail = (e: unknown) => setError(e instanceof Error ? e.message : String(e));
  const refreshPhotos = useCallback(async () => setPhotoDates(await db.getPhotoDates()), []);
  const reload = useCallback(async () => {
    setData(await db.loadAll());
    await refreshPhotos();
  }, [refreshPhotos]);

  useEffect(() => {
    reload().catch(fail);
    // Просим браузер не вычищать хранилище при нехватке места
    navigator.storage?.persist?.().catch(() => {});
  }, [reload]);

  if (error) {
    return (
      <div className="page">
        <div className="card">
          <h2>Не удалось открыть хранилище</h2>
          <p>{error}</p>
          <p className="muted">Приложению нужен IndexedDB. В приватном режиме некоторых браузеров он недоступен.</p>
        </div>
      </div>
    );
  }
  if (!data) return <div className="page muted">Загрузка…</div>;

  const store: Store = {
    ...data,
    photoDates,
    refreshPhotos,
    reload,
    saveCheckin(c) {
      const next = { ...c, updatedAt: Date.now() };
      setData({ ...data, checkins: [...data.checkins.filter((x) => x.date !== c.date), next] });
      db.putCheckin(next).catch(fail);
    },
    saveSettings(settings) {
      setData({ ...data, settings });
      db.putSettings(settings).catch(fail);
    },
    saveProduct(p) {
      const exists = data.products.some((x) => x.id === p.id);
      setData({ ...data, products: exists ? data.products.map((x) => (x.id === p.id ? p : x)) : [...data.products, p] });
      db.putProduct(p).catch(fail);
    },
    removeProduct(id) {
      setData({ ...data, products: data.products.filter((x) => x.id !== id) });
      db.deleteProduct(id).catch(fail);
    },
  };
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
