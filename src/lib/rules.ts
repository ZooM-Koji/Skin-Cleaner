import type { Checkin, Product, Settings } from '../types';
import { addDays, diffDays, fmt, weekOf } from './dates';

export interface Hint {
  id: string;
  /** info — напоминание, care — стоит скорректировать уход, doctor — повод показаться врачу */
  kind: 'info' | 'care' | 'doctor';
  title: string;
  text: string;
}

export const ACTIVE_GAP_DAYS = 10;
export const PHOTO_GAP_DAYS = 14;
const NOSE_RED_DAYS = 21;

/** Активы в использовании, которым меньше 10 дней: до какой даты лучше не вводить новый */
export function recentActives(products: Product[], date: string) {
  return products
    .filter((p) => p.active && p.status === 'used' && p.startDate)
    .map((p) => ({ product: p, age: diffDays(p.startDate, date) }))
    .filter((x) => x.age >= 0 && x.age < ACTIVE_GAP_DAYS)
    .map((x) => ({ ...x, until: addDays(x.product.startDate, ACTIVE_GAP_DAYS) }));
}

/** Подсказки на простых правилах. Это не диагноз и не назначение. */
export function hints(
  checkins: Checkin[],
  products: Product[],
  s: Settings,
  photoDates: string[],
  date: string,
): Hint[] {
  const out: Hint[] = [];
  const byDate = new Map(checkins.map((c) => [c.date, c]));
  const recent = (n: number) => checkins.filter((c) => c.date <= date && diffDays(c.date, date) < n);

  // Болезненные узлы или кисты за последнюю неделю
  if (recent(7).some((c) => c.nodules)) {
    out.push({
      id: 'nodules',
      kind: 'doctor',
      title: 'Болезненные узлы или кисты',
      text: 'Такие элементы лучше показать дерматологу: домашним уходом их обычно не решить, а врач подберёт лечение и поможет избежать следов.',
    });
  }

  // Краснота носа держится дольше трёх недель: непрерывная серия отметок от последних дней назад
  const sorted = checkins.filter((c) => c.date <= date).sort((a, b) => b.date.localeCompare(a.date));
  if (sorted[0]?.noseRed && diffDays(sorted[0].date, date) <= 3) {
    let first = sorted[0].date;
    for (const c of sorted) {
      if (!c.noseRed) break;
      first = c.date;
    }
    if (diffDays(first, date) >= NOSE_RED_DAYS) {
      out.push({
        id: 'nose',
        kind: 'doctor',
        title: 'Краснота носа держится больше 3 недель',
        text: `Отмечается с ${fmt(first)}. Стойкую красноту стоит показать дерматологу: у неё бывают причины, не связанные с акне.`,
      });
    }
  }

  // Жжение 6+ два дня подряд (сегодня и вчера либо вчера и позавчера)
  for (const end of [date, addDays(date, -1)]) {
    const a = byDate.get(end);
    const b = byDate.get(addDays(end, -1));
    if (a && b && a.burning >= 6 && b.burning >= 6) {
      out.push({
        id: 'burning',
        kind: 'care',
        title: 'Жжение 6+ два дня подряд',
        text: 'Коже может понадобиться передышка. Можно сделать паузу на пару дней или перейти на нанесение через день, а когда жжение стихнет — вернуться к прежней частоте.',
      });
      break;
    }
  }

  // Шелушение 7+ в последней записи (не старше вчерашней)
  const lastPeel = byDate.get(date) ?? byDate.get(addDays(date, -1));
  if (lastPeel && lastPeel.peeling >= 7) {
    out.push({
      id: 'peeling',
      kind: 'care',
      title: 'Сильное шелушение',
      text: 'Можно вернуться на 4–5 нанесений в неделю и добавить больше увлажнения, пока шелушение не уменьшится.',
    });
  }

  // Новый актив — не раньше, чем через 10 дней после предыдущего
  for (const r of recentActives(products, date)) {
    out.push({
      id: `active-${r.product.id}`,
      kind: 'care',
      title: 'Пока без новых активов',
      text: `«${r.product.name}» в схеме ${r.age} дн. Новое активное средство лучше не вводить до ${fmt(r.until)}: так будет понятно, на что реагирует кожа.`,
    });
  }

  // Фото раз в 14 дней
  const lastPhoto = photoDates.filter((d) => d <= date).at(-1);
  if (!lastPhoto || diffDays(lastPhoto, date) >= PHOTO_GAP_DAYS) {
    out.push({
      id: 'photo',
      kind: 'info',
      title: 'Пора сделать фото',
      text: lastPhoto
        ? `Последняя съёмка была ${fmt(lastPhoto)}. Три ракурса при дневном свете, без вспышки, с того же расстояния.`
        : 'Фото ещё нет. Снимите три ракурса при дневном свете, без вспышки, с одного расстояния — будет с чем сравнивать.',
    });
  }

  // Контрольная точка курса
  const week = weekOf(s.startDate, date);
  if (week >= s.checkpointWeek && week <= s.checkpointWeek + 1) {
    out.push({
      id: 'checkpoint',
      kind: 'info',
      title: `Контрольная точка: ${s.checkpointWeek}-я неделя`,
      text: 'Хороший момент сравнить фото с началом курса, собрать отчёт и обсудить результат с врачом.',
    });
  }

  return out;
}
