import type { Data } from '../db';
import type { Photo } from '../types';
import { ANGLES } from '../types';
import { isIso } from './dates';

const APP = 'skin-cleaner';

interface PhotoJson {
  date: string;
  angle: Photo['angle'];
  dataUrl: string;
}

const toDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

function fromDataUrl(url: string): Blob {
  const [head, body] = url.split(',');
  const type = /^data:([^;]+);base64$/.exec(head)?.[1];
  if (!type || !type.startsWith('image/') || !body) throw new Error('Повреждённое фото в файле');
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

/** photos === undefined — бэкап без фото */
export async function exportJson(data: Data, photos?: Photo[]): Promise<string> {
  const out: Record<string, unknown> = { app: APP, version: 1, exportedAt: new Date().toISOString(), ...data };
  if (photos) {
    const list: PhotoJson[] = [];
    for (const p of photos) list.push({ date: p.date, angle: p.angle, dataUrl: await toDataUrl(p.blob) });
    out.photos = list;
  }
  return JSON.stringify(out);
}

/** Разбирает файл бэкапа. Бросает Error с понятным текстом, если файл не подходит. */
export function parseBackup(text: string): { data: Data; photos?: Photo[] } {
  let j: any;
  try {
    j = JSON.parse(text);
  } catch {
    throw new Error('Это не JSON-файл');
  }
  if (j?.app !== APP || j.version !== 1) throw new Error('Файл не похож на бэкап этого приложения');
  const s = j.settings;
  if (
    !s || !isIso(s.startDate) || !Array.isArray(s.periods) || !Array.isArray(s.phases) ||
    !Array.isArray(s.amSteps) || !Array.isArray(s.pmSteps) ||
    !Array.isArray(j.checkins) || !Array.isArray(j.products)
  ) {
    throw new Error('В файле не хватает данных');
  }
  if (j.checkins.some((c: any) => !isIso(c?.date) || !c.zones || !c.flags)) throw new Error('В файле повреждены записи дневника');
  if (j.products.some((p: any) => typeof p?.id !== 'string' || typeof p.name !== 'string')) throw new Error('В файле повреждён список средств');

  let photos: Photo[] | undefined;
  if (Array.isArray(j.photos)) {
    const angles = ANGLES.map((a) => a[0]) as string[];
    photos = j.photos.map((p: PhotoJson) => {
      if (!isIso(p?.date) || !angles.includes(p.angle)) throw new Error('В файле повреждены фото');
      return { id: `${p.date}_${p.angle}`, date: p.date, angle: p.angle, blob: fromDataUrl(p.dataUrl) };
    });
  }
  return { data: { settings: s, checkins: j.checkins, products: j.products }, photos };
}
