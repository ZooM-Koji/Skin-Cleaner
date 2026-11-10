import type { ReactNode } from 'react';
import { fmt } from '../lib/dates';
import { num } from '../lib/stats';
import type { Hint } from '../lib/rules';

/** Кнопка-переключатель: шаг ухода, триггер и т. п. */
export function Chip({ on, onChange, children }: { on: boolean; onChange(v: boolean): void; children: ReactNode }) {
  return (
    <button type="button" className={'chip' + (on ? ' on' : '')} aria-pressed={on} onClick={() => onChange(!on)}>
      <span className="mark" aria-hidden>
        {on ? '✓' : ''}
      </span>
      {children}
    </button>
  );
}

/** Шкала 0–10 */
export function Scale({ label, value, onChange }: { label: string; value: number; onChange(v: number): void }) {
  return (
    <label className="scale">
      <span>
        {label}
        <b>{value}</b>
      </span>
      <input type="range" min={0} max={10} step={1} value={value} onChange={(e) => onChange(+e.target.value)} />
    </label>
  );
}

/** Счётчик с кнопками − и +; value === null — «не указано» */
export function Stepper(props: {
  label: string;
  value: number | null;
  onChange(v: number | null): void;
  step?: number;
  max?: number;
  unit?: string;
  /** с какого значения начинать, если ещё не указано */
  start?: number;
  nullable?: boolean;
}) {
  const { label, value, onChange, step = 1, max = 99, unit = '', start = 0, nullable } = props;
  const dec = () => {
    if (value == null) return;
    if (value - step < 0 || (nullable && value - step <= 0)) return onChange(nullable ? null : 0);
    onChange(+(value - step).toFixed(2));
  };
  const inc = () => onChange(value == null ? start || step : Math.min(max, +(value + step).toFixed(2)));
  return (
    <div className="stepper">
      <span className="lbl">{label}</span>
      <button type="button" onClick={dec} disabled={value == null || (!nullable && value <= 0)} aria-label={`${label}: меньше`}>
        −
      </button>
      <output>{value == null ? '—' : num(value, 2) + (unit ? ' ' + unit : '')}</output>
      <button type="button" onClick={inc} disabled={value != null && value >= max} aria-label={`${label}: больше`}>
        +
      </button>
    </div>
  );
}

export function Seg<T extends string>({ value, onChange, options }: { value: T; onChange(v: T): void; options: readonly (readonly [T, string])[] }) {
  return (
    <div className="seg" role="tablist">
      {options.map(([k, label]) => (
        <button key={k} type="button" role="tab" aria-selected={k === value} className={k === value ? 'on' : ''} onClick={() => onChange(k)}>
          {label}
        </button>
      ))}
    </div>
  );
}

const KIND = { info: 'Напоминание', care: 'Уход', doctor: 'К врачу' } as const;

export function HintList({ items }: { items: Hint[] }) {
  if (!items.length) return null;
  return (
    <div className="hints">
      {items.map((h) => (
        <div key={h.id} className={'hint ' + h.kind}>
          <span className="tag">{KIND[h.kind]}</span>
          <b>{h.title}</b>
          <p>{h.text}</p>
        </div>
      ))}
    </div>
  );
}

/** Поле даты: всегда показывает ДД.ММ.ГГГГ, по нажатию открывает системный календарь */
export function DateField({ label, value, onChange, max, allowEmpty }: { label: string; value: string; onChange(v: string): void; max?: string; allowEmpty?: boolean }) {
  return (
    <label className="field">
      {label}
      <span className="datefield">
        {value ? fmt(value) : 'не задано'}
        <input type="date" value={value} max={max} onChange={(e) => (e.target.value || allowEmpty) && onChange(e.target.value)} />
      </span>
    </label>
  );
}
