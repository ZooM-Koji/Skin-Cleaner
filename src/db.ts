import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Checkin, Photo, Product, Settings } from './types';
import { seedProducts, seedSettings } from './seed';

interface Schema extends DBSchema {
  checkins: { key: string; value: Checkin };
  photos: { key: string; value: Photo };
  products: { key: string; value: Product };
  kv: { key: string; value: unknown };
}

let dbp: Promise<IDBPDatabase<Schema>> | undefined;

function db() {
  dbp ??= openDB<Schema>('skin-cleaner', 1, {
    upgrade(d) {
      d.createObjectStore('checkins', { keyPath: 'date' });
      d.createObjectStore('photos', { keyPath: 'id' });
      d.createObjectStore('products', { keyPath: 'id' });
      d.createObjectStore('kv');
    },
  });
  return dbp;
}

export interface Data {
  settings: Settings;
  checkins: Checkin[];
  products: Product[];
}

/** Читает всё, кроме фото. При первом запуске записывает начальные данные. */
export async function loadAll(): Promise<Data> {
  const d = await db();
  let settings = (await d.get('kv', 'settings')) as Settings | undefined;
  if (!settings) {
    settings = seedSettings();
    const tx = d.transaction(['kv', 'products'], 'readwrite');
    tx.objectStore('kv').put(settings, 'settings');
    for (const p of seedProducts()) tx.objectStore('products').put(p);
    await tx.done;
  }
  return { settings, checkins: await d.getAll('checkins'), products: await d.getAll('products') };
}

export const putCheckin = async (c: Checkin) => void (await (await db()).put('checkins', c));
export const deleteCheckin = async (date: string) => (await db()).delete('checkins', date);
export const putSettings = async (s: Settings) => void (await (await db()).put('kv', s, 'settings'));
export const putProduct = async (p: Product) => void (await (await db()).put('products', p));
export const deleteProduct = async (id: string) => (await db()).delete('products', id);

export const getPhotos = async () => (await db()).getAll('photos');
export const putPhoto = async (p: Photo) => void (await (await db()).put('photos', p));
export const deletePhoto = async (id: string) => (await db()).delete('photos', id);
/** Даты, за которые есть хотя бы одно фото (без чтения самих снимков) */
export async function getPhotoDates(): Promise<string[]> {
  const keys = await (await db()).getAllKeys('photos');
  return [...new Set(keys.map((k) => k.split('_')[0]))].sort();
}

/** Полная замена содержимого базы (импорт бэкапа). photos === undefined — фото не трогаем. */
export async function replaceAll(data: Data, photos?: Photo[]) {
  const d = await db();
  const tx = d.transaction(['kv', 'checkins', 'products', 'photos'], 'readwrite');
  tx.objectStore('kv').put(data.settings, 'settings');
  await tx.objectStore('checkins').clear();
  for (const c of data.checkins) tx.objectStore('checkins').put(c);
  await tx.objectStore('products').clear();
  for (const p of data.products) tx.objectStore('products').put(p);
  if (photos) {
    await tx.objectStore('photos').clear();
    for (const p of photos) tx.objectStore('photos').put(p);
  }
  await tx.done;
}
