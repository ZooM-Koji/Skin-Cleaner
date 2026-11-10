import type { Checkin, Product, Settings } from '../types';
import { FLAGS, SCALES, ZONES } from '../types';
import { addDays, fmt, weekOf } from './dates';
import { hints } from './rules';
import { avg, num, periodFor, total } from './stats';

const pick = (cs: Checkin[], from: string, to: string) =>
  cs.filter((c) => c.date >= from && c.date <= to).sort((a, b) => a.date.localeCompare(b.date));

/** Текст отчёта за 7 дней, заканчивающихся датой end */
export function weeklyReport(
  checkins: Checkin[],
  products: Product[],
  s: Settings,
  photoDates: string[],
  end: string,
): string {
  const from = addDays(end, -6);
  const cs = pick(checkins, from, end);
  const prev = pick(checkins, addDays(from, -7), addDays(from, -1));
  const L: string[] = [];

  L.push(`ОТЧЁТ ПО КОЖЕ за ${fmt(from)}–${fmt(end)}`);
  L.push(`Курс: Клензит (адапален 0,1%) с ${fmt(s.startDate)}, идёт ${weekOf(s.startDate, end)}-я неделя.`);
  const plan = periodFor(s.periods, end);
  if (plan) L.push(`Плановая частота: ${plan.label.toLowerCase()}.`);
  L.push(`Дней с записями: ${cs.length} из 7.`);

  if (!cs.length) {
    L.push('', 'За эту неделю записей нет.');
  } else {
    const applied = cs.filter((c) => c.klenzit);
    L.push('', 'КЛЕНЗИТ');
    L.push(`Нанесён ${applied.length} раз за ${cs.length} дн. с записями` + (applied.length ? `: ${applied.map((c) => fmt(c.date).slice(0, 5)).join(', ')}.` : '.'));

    L.push('', 'РЕАКЦИЯ КОЖИ (0–10, среднее / максимум)');
    for (const [k, label] of SCALES) {
      const xs = cs.map((c) => c[k]);
      const p = avg(prev.map((c) => c[k]));
      L.push(`${label}: ${num(avg(xs))} / ${Math.max(...xs)}` + (p != null ? ` (неделей раньше: ${num(p)})` : ''));
    }

    L.push('', 'ВОСПАЛЁННЫЕ ЭЛЕМЕНТЫ');
    const tot = cs.map(total);
    const pt = avg(prev.map(total));
    L.push(`В среднем за день: ${num(avg(tot))} (мин. ${Math.min(...tot)}, макс. ${Math.max(...tot)})` + (pt != null ? `; неделей раньше: ${num(pt)}` : '') + '.');
    L.push(`Первая запись (${fmt(cs[0].date)}): ${tot[0]}; последняя (${fmt(cs.at(-1)!.date)}): ${tot.at(-1)}.`);
    L.push('По зонам (среднее): ' + ZONES.map(([z, label]) => `${label.toLowerCase()} ${num(avg(cs.map((c) => c.zones[z])))}`).join(', ') + '.');
    const nod = cs.filter((c) => c.nodules).length;
    const nose = cs.filter((c) => c.noseRed).length;
    if (nod) L.push(`Болезненные узлы или кисты отмечены в ${nod} дн.`);
    if (nose) L.push(`Краснота носа отмечена в ${nose} дн.`);

    L.push('', 'УХОД');
    const done = (key: 'am' | 'pm', steps: { id: string }[]) =>
      steps.length ? cs.filter((c) => steps.every((st) => c[key].includes(st.id))).length : 0;
    L.push(`Утренний уход полностью: ${done('am', s.amSteps)} из ${cs.length} дн.; вечерний: ${done('pm', s.pmSteps)} из ${cs.length} дн.`);

    L.push('', 'ТРИГГЕРЫ (дней из ' + cs.length + ')');
    L.push(FLAGS.map(([k, label]) => `${label.toLowerCase()} ${cs.filter((c) => c.flags[k]).length}`).join(', ') + '.');
    const water = cs.filter((c) => c.water != null).map((c) => c.water!);
    const sleep = cs.filter((c) => c.sleep != null).map((c) => c.sleep!);
    L.push(`Вода: ${water.length ? num(avg(water)) + ' л в день' : 'нет данных'}; сон: ${sleep.length ? num(avg(sleep)) + ' ч' : 'нет данных'}.`);

    const notes = cs.filter((c) => c.note.trim());
    if (notes.length) {
      L.push('', 'ЗАМЕТКИ');
      for (const c of notes) L.push(`${fmt(c.date)}: ${c.note.trim()}`);
    }
  }

  L.push('', 'СРЕДСТВА');
  const names = (st: Product['status']) => products.filter((p) => p.status === st).map((p) => p.name).join(', ') || 'нет';
  L.push(`Используются: ${names('used')}.`);
  L.push(`К покупке: ${names('buy')}.`);

  const ph = photoDates.filter((d) => d >= from && d <= end);
  L.push('', 'ФОТО');
  L.push(ph.length ? `Сняты: ${ph.map(fmt).join(', ')}.` : `За неделю не снимались. Последняя съёмка: ${photoDates.at(-1) ? fmt(photoDates.at(-1)!) : 'нет'}.`);

  const hs = hints(checkins, products, s, photoDates, end);
  if (hs.length) {
    L.push('', 'ПОДСКАЗКИ ПРИЛОЖЕНИЯ (простые правила, не диагноз)');
    for (const h of hs) L.push(`- ${h.title}`);
  }

  return L.join('\n');
}
