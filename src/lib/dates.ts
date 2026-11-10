// Все даты приложения — строки ГГГГ-ММ-ДД в часовом поясе Europe/Moscow.
// Арифметика идёт через UTC, чтобы пояс устройства ни на что не влиял.

const MSK = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Moscow',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function today(now: Date = new Date()): string {
  return MSK.format(now);
}

const toMs = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

export function addDays(iso: string, n: number): string {
  return new Date(toMs(iso) + n * 86400000).toISOString().slice(0, 10);
}

/** Сколько дней от a до b (b − a) */
export function diffDays(a: string, b: string): number {
  return Math.round((toMs(b) - toMs(a)) / 86400000);
}

/** ДД.ММ.ГГГГ */
export function fmt(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

/** ДД.ММ */
export function fmtShort(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}.${m}`;
}

const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
export function weekday(iso: string): string {
  return WEEKDAYS[new Date(toMs(iso)).getUTCDay()];
}

/** Номер недели курса: день старта — неделя 1 */
export function weekOf(start: string, iso: string): number {
  return Math.floor(diffDays(start, iso) / 7) + 1;
}

/** Первый день недели курса с номером n */
export function weekStart(start: string, n: number): string {
  return addDays(start, (n - 1) * 7);
}

export function isIso(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(toMs(s));
}
