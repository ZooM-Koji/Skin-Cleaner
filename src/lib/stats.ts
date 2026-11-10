import type { Checkin, FlagKey, Period, Settings } from '../types';
import { FLAGS } from '../types';
import { addDays, weekOf, weekStart } from './dates';

export const total = (c: Checkin) => Object.values(c.zones).reduce((a, b) => a + b, 0);

export const avg = (xs: number[]): number | null =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;

/** 1,5 → «1,5»; 2 → «2»; null → «—» */
export const num = (x: number | null | undefined, digits = 1): string =>
  x == null ? '—' : (Math.round(x * 10 ** digits) / 10 ** digits).toString().replace('.', ',');

export function periodFor(periods: Period[], date: string): Period | undefined {
  return periods.find((p) => p.from <= date && (!p.to || date <= p.to));
}

/** Плановое число нанесений за 7 дней, начиная с from */
export function plannedForWeek(periods: Period[], from: string): number {
  let sum = 0;
  for (let i = 0; i < 7; i++) sum += (periodFor(periods, addDays(from, i))?.perWeek ?? 0) / 7;
  return sum;
}

export interface WeekStat {
  n: number;
  from: string;
  to: string;
  /** сколько дней с чек-ином */
  days: number;
  inflamed: number | null;
  burning: number | null;
  peeling: number | null;
  /** фактические нанесения по чек-инам; null — чек-инов за неделю нет */
  applied: number | null;
  planned: number;
}

/** Статистика по неделям курса от старта до недели, в которую попадает upTo */
export function weekly(checkins: Checkin[], s: Settings, upTo: string): WeekStat[] {
  const last = Math.max(1, weekOf(s.startDate, upTo));
  const out: WeekStat[] = [];
  for (let n = 1; n <= last; n++) {
    const from = weekStart(s.startDate, n);
    const to = addDays(from, 6);
    const cs = checkins.filter((c) => c.date >= from && c.date <= to);
    out.push({
      n,
      from,
      to,
      days: cs.length,
      inflamed: avg(cs.map(total)),
      burning: avg(cs.map((c) => c.burning)),
      peeling: avg(cs.map((c) => c.peeling)),
      applied: cs.length ? cs.filter((c) => c.klenzit).length : null,
      planned: plannedForWeek(s.periods, from),
    });
  }
  return out;
}

export interface TriggerRow {
  label: string;
  withAvg: number | null;
  withoutAvg: number | null;
  withN: number;
  withoutN: number;
}

export const MIN_DAYS = 3;

/**
 * Простое сопоставление: среднее число воспалений в следующие два дня
 * после дней с триггером и без него. Это не доказательство причины.
 */
export function triggerTable(checkins: Checkin[]): TriggerRow[] {
  const byDate = new Map(checkins.map((c) => [c.date, c]));
  const after = (c: Checkin) => {
    const next = [1, 2].map((i) => byDate.get(addDays(c.date, i))).filter((x): x is Checkin => !!x);
    return avg(next.map(total));
  };
  const row = (label: string, test: (c: Checkin) => boolean | null): TriggerRow => {
    const yes: number[] = [];
    const no: number[] = [];
    for (const c of checkins) {
      const t = test(c);
      const a = after(c);
      if (t == null || a == null) continue;
      (t ? yes : no).push(a);
    }
    return { label, withAvg: avg(yes), withoutAvg: avg(no), withN: yes.length, withoutN: no.length };
  };
  return [
    ...FLAGS.map(([k, label]) => row(label, (c) => c.flags[k as FlagKey])),
    row('Вода меньше 1,5 л', (c) => (c.water == null ? null : c.water < 1.5)),
    row('Сон меньше 7 ч', (c) => (c.sleep == null ? null : c.sleep < 7)),
  ];
}
