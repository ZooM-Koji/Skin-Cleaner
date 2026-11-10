import { describe, expect, it } from 'vitest';
import { emptyCheckin, seedProducts, seedSettings } from '../seed';
import type { Checkin } from '../types';
import { exportJson, parseBackup } from './backup';
import { addDays, diffDays, fmt, today, weekOf } from './dates';
import { weeklyReport } from './report';
import { hints } from './rules';
import { plannedForWeek, triggerTable, weekly } from './stats';

const s = seedSettings();
const products = seedProducts();
const day = (date: string, patch: Partial<Checkin> = {}): Checkin => ({ ...emptyCheckin(date), ...patch });
const ids = (cs: Checkin[], date: string, photos = [date], prods = products) => hints(cs, prods, s, photos, date).map((h) => h.id);

describe('даты', () => {
  it('считает сегодняшний день по Москве', () => {
    expect(today(new Date('2026-11-10T21:30:00Z'))).toBe('2026-11-11');
    expect(today(new Date('2026-11-10T20:59:00Z'))).toBe('2026-11-10');
  });
  it('форматирует и складывает', () => {
    expect(fmt('2026-09-20')).toBe('20.09.2026');
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(diffDays('2026-09-20', '2026-11-10')).toBe(51);
  });
  it('номер недели курса', () => {
    expect(weekOf('2026-09-20', '2026-09-20')).toBe(1);
    expect(weekOf('2026-09-20', '2026-09-27')).toBe(2);
    expect(weekOf('2026-09-20', '2026-11-10')).toBe(8);
    expect(weekOf('2026-09-20', '2026-12-06')).toBe(12);
  });
});

describe('подсказки', () => {
  it('без поводов подсказок нет', () => {
    expect(ids([day('2026-11-10')], '2026-11-10')).toEqual([]);
  });
  it('жжение 6+ два дня подряд', () => {
    expect(ids([day('2026-11-09', { burning: 6 }), day('2026-11-10', { burning: 7 })], '2026-11-10')).toContain('burning');
    expect(ids([day('2026-11-08', { burning: 6 }), day('2026-11-09', { burning: 6 })], '2026-11-10')).toContain('burning');
    expect(ids([day('2026-11-08', { burning: 9 }), day('2026-11-10', { burning: 9 })], '2026-11-10')).not.toContain('burning');
    expect(ids([day('2026-11-09', { burning: 5 }), day('2026-11-10', { burning: 9 })], '2026-11-10')).not.toContain('burning');
  });
  it('шелушение 7+', () => {
    expect(ids([day('2026-11-10', { peeling: 7 })], '2026-11-10')).toContain('peeling');
    expect(ids([day('2026-11-10', { peeling: 6 })], '2026-11-10')).not.toContain('peeling');
  });
  it('новый актив не раньше 10 дней', () => {
    const withAzelik = products.map((p) => (p.id === 'azelik' ? { ...p, status: 'used' as const, startDate: '2026-11-05' } : p));
    expect(ids([], '2026-11-10', ['2026-11-10'], withAzelik)).toContain('active-azelik');
    expect(ids([], '2026-11-15', ['2026-11-15'], withAzelik)).not.toContain('active-azelik');
  });
  it('фото раз в 14 дней', () => {
    expect(ids([], '2026-11-10', [])).toContain('photo');
    expect(ids([], '2026-11-10', ['2026-10-27'])).toContain('photo');
    expect(ids([], '2026-11-10', ['2026-10-28'])).not.toContain('photo');
  });
  it('узлы и кисты — к дерматологу', () => {
    expect(ids([day('2026-11-06', { nodules: true })], '2026-11-10')).toContain('nodules');
    expect(ids([day('2026-11-01', { nodules: true })], '2026-11-10')).not.toContain('nodules');
  });
  it('краснота носа дольше 3 недель', () => {
    const run = (n: number) => Array.from({ length: n }, (_, i) => day(addDays('2026-11-10', -i), { noseRed: true }));
    expect(ids(run(22), '2026-11-10')).toContain('nose');
    expect(ids(run(15), '2026-11-10')).not.toContain('nose');
    const broken = run(22).map((c) => (c.date === '2026-11-01' ? { ...c, noseRed: false } : c));
    expect(ids(broken, '2026-11-10')).not.toContain('nose');
  });
  it('контрольная точка на 12-й неделе', () => {
    expect(ids([], '2026-12-06')).toContain('checkpoint');
    expect(ids([], '2026-11-10')).not.toContain('checkpoint');
  });
});

describe('статистика', () => {
  it('план по периодам', () => {
    expect(plannedForWeek(s.periods, '2026-09-20')).toBeCloseTo(2.5);
    expect(plannedForWeek(s.periods, '2026-11-01')).toBeCloseTo(7);
    // 18–24.10: два дня по 2,5/7, четыре дня перерыва, один день 5/7
    expect(plannedForWeek(s.periods, '2026-10-18')).toBeCloseTo((2 * 2.5 + 5) / 7);
  });
  it('недели курса', () => {
    const w = weekly([day('2026-11-08', { klenzit: true }), day('2026-11-09')], s, '2026-11-10');
    expect(w).toHaveLength(8);
    expect(w[7]).toMatchObject({ from: '2026-11-08', applied: 1, days: 2 });
    expect(w[0].applied).toBeNull();
  });
  it('триггеры сравниваются по следующим двум дням', () => {
    const zones = (n: number) => ({ ...emptyCheckin('x').zones, forehead: n });
    const flags = { ...emptyCheckin('x').flags, sweets: true };
    const cs = [day('2026-11-01', { flags }), day('2026-11-02', { zones: zones(4) }), day('2026-11-03', { zones: zones(2) })];
    const row = triggerTable(cs).find((r) => r.label === 'Сладкое')!;
    expect(row.withAvg).toBe(3);
    expect(row.withN).toBe(1);
    expect(row.withoutAvg).toBe(2);
  });
});

describe('отчёт и бэкап', () => {
  it('отчёт содержит цифры недели', () => {
    const cs = [day('2026-11-09', { klenzit: true, burning: 4 }), day('2026-11-10', { klenzit: true, burning: 6, note: 'сухо' })];
    const t = weeklyReport(cs, products, s, [], '2026-11-10');
    expect(t).toContain('за 04.11.2026–10.11.2026');
    expect(t).toContain('8-я неделя');
    expect(t).toContain('Нанесён 2 раз');
    expect(t).toContain('Жжение: 5 / 6');
    expect(t).toContain('10.11.2026: сухо');
  });
  it('бэкап читается обратно, чужой файл отклоняется', async () => {
    const data = { settings: s, checkins: [day('2026-11-10')], products };
    expect(parseBackup(await exportJson(data)).data).toEqual(data);
    expect(() => parseBackup('{"a":1}')).toThrow();
    expect(() => parseBackup('не json')).toThrow();
  });
});
