import { useEffect, useMemo, useState } from 'react';
import { DateField, Seg } from '../components/ui';
import * as db from '../db';
import { diffDays, fmt, today } from '../lib/dates';
import { compress } from '../lib/image';
import { PHOTO_GAP_DAYS } from '../lib/rules';
import { useStore } from '../store';
import { ANGLES, type Angle, type Photo } from '../types';

/** Ссылки на снимки живут, пока открыт экран */
function useUrls(photos: Photo[]) {
  const urls = useMemo(() => new Map(photos.map((p) => [p.id, URL.createObjectURL(p.blob)])), [photos]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  return urls;
}

export function Photos() {
  const { photoDates, refreshPhotos } = useStore();
  const now = today();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [date, setDate] = useState(now);
  const [angle, setAngle] = useState<Angle>('front');
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [error, setError] = useState('');
  const urls = useUrls(photos);

  const load = async () => {
    setPhotos(await db.getPhotos());
    await refreshPhotos();
  };
  useEffect(() => void load().catch((e) => setError(String(e))), []);

  // По умолчанию сравниваем первую и последнюю съёмку
  const left = photoDates.includes(a) ? a : (photoDates[0] ?? '');
  const right = photoDates.includes(b) ? b : (photoDates.at(-1) ?? '');

  const add = async (ang: Angle, file?: File) => {
    if (!file) return;
    setError('');
    try {
      await db.putPhoto({ id: `${date}_${ang}`, date, angle: ang, blob: await compress(file) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить фото');
    }
  };
  const remove = async (id: string) => {
    if (!confirm('Удалить это фото?')) return;
    await db.deletePhoto(id);
    await load();
  };

  const last = photoDates.at(-1);
  const since = last ? diffDays(last, now) : null;
  const due = since == null || since >= PHOTO_GAP_DAYS;

  return (
    <div className="page">
      <h1>Фото-дневник</h1>

      <div className={'hint ' + (due ? 'info' : 'ok')}>
        <b>
          {since == null
            ? 'Фото ещё нет'
            : due
              ? `Пора снять: прошло ${since} дн.`
              : `Следующая съёмка через ${PHOTO_GAP_DAYS - since} дн.`}
        </b>
        <p>
          {last && `Последняя съёмка: ${fmt(last)}. `}Снимайте раз в 14 дней при дневном свете у окна, без вспышки, с одного
          расстояния и с тем же выражением лица.
        </p>
      </div>

      <section className="card">
        <h2>Съёмка</h2>
        <DateField label="Дата" value={date} max={now} onChange={setDate} />
        <div className="shots">
          {ANGLES.map(([ang, label]) => {
            const id = `${date}_${ang}`;
            const url = urls.get(id);
            return (
              <figure key={ang}>
                <label className="shot">
                  {url ? <img src={url} alt={`${label}, ${fmt(date)}`} /> : <span>+</span>}
                  <input type="file" accept="image/*" hidden onChange={(e) => (add(ang, e.target.files?.[0]), (e.target.value = ''))} />
                </label>
                <figcaption>
                  {label}
                  {url && (
                    <button type="button" className="link danger" onClick={() => remove(id)}>
                      Удалить
                    </button>
                  )}
                </figcaption>
              </figure>
            );
          })}
        </div>
        {error && <p className="error">{error}</p>}
        <p className="muted">Нажмите на рамку, чтобы снять или выбрать фото. Снимки хранятся только на этом устройстве.</p>
      </section>

      <section className="card">
        <h2>Сравнение</h2>
        {photoDates.length < 2 ? (
          <p className="muted">Сравнение появится, когда будут фото хотя бы за две даты.</p>
        ) : (
          <>
            <Seg<Angle> value={angle} onChange={setAngle} options={ANGLES} />
            <div className="compare">
              {(
                [
                  [left, setA],
                  [right, setB],
                ] as const
              ).map(([d, setD], i) => {
                const url = urls.get(`${d}_${angle}`);
                return (
                  <div key={i}>
                    <select value={d} onChange={(e) => setD(e.target.value)} aria-label={i ? 'Вторая дата' : 'Первая дата'}>
                      {photoDates.map((x) => (
                        <option key={x} value={x}>
                          {fmt(x)}
                        </option>
                      ))}
                    </select>
                    {url ? <img src={url} alt={fmt(d)} /> : <div className="noimg">Нет этого ракурса</div>}
                  </div>
                );
              })}
            </div>
            {left && right && left !== right && <p className="muted">Между съёмками {Math.abs(diffDays(left, right))} дн.</p>}
          </>
        )}
      </section>
    </div>
  );
}
