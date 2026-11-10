import { useState } from 'react';
import { Chip, HintList, Scale, Stepper } from '../components/ui';
import { addDays, fmt, today, weekday, weekOf } from '../lib/dates';
import { hints } from '../lib/rules';
import { total } from '../lib/stats';
import { emptyCheckin } from '../seed';
import { useStore } from '../store';
import { FLAGS, SCALES, ZONES, type Checkin, type Step } from '../types';

export function Today() {
  const st = useStore();
  const now = today();
  const [date, setDate] = useState(now);
  const saved = st.checkins.find((c) => c.date === date);
  const c = saved ?? emptyCheckin(date);
  const set = (patch: Partial<Checkin>) => st.saveCheckin({ ...c, ...patch });
  const week = weekOf(st.settings.startDate, date);
  const prev = st.checkins.filter((x) => x.date < date).sort((a, b) => b.date.localeCompare(a.date))[0];

  const steps = (key: 'am' | 'pm', list: Step[]) =>
    list.map((s) => (
      <Chip
        key={s.id}
        on={c[key].includes(s.id)}
        onChange={(on) => set({ [key]: on ? [...c[key], s.id] : c[key].filter((id) => id !== s.id) })}
      >
        {s.label}
      </Chip>
    ));

  return (
    <div className="page">
      <header className="datebar">
        <button type="button" onClick={() => setDate(addDays(date, -1))} aria-label="Предыдущий день">
          ‹
        </button>
        <label>
          <b>{date === now ? 'Сегодня' : weekday(date)}, {fmt(date)}</b>
          <small>{week >= 1 ? `${week}-я неделя курса` : 'до начала курса'} · {saved ? 'сохранено' : 'нет записи'}</small>
          <input type="date" value={date} max={now} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Выбрать дату" />
        </label>
        <button type="button" onClick={() => setDate(addDays(date, 1))} disabled={date >= now} aria-label="Следующий день">
          ›
        </button>
      </header>

      {date === now && <HintList items={hints(st.checkins, st.products, st.settings, st.photoDates, now)} />}

      <section className="card">
        <h2>Утро</h2>
        <div className="chips">{steps('am', st.settings.amSteps)}</div>
      </section>

      <section className="card">
        <h2>Вечер</h2>
        <div className="chips">{steps('pm', st.settings.pmSteps)}</div>
        <button type="button" className={'big-toggle' + (c.klenzit ? ' on' : '')} aria-pressed={c.klenzit} onClick={() => set({ klenzit: !c.klenzit })}>
          <span className="mark" aria-hidden>
            {c.klenzit ? '✓' : ''}
          </span>
          Клензит {c.klenzit ? 'нанесён' : 'не нанесён'}
        </button>
      </section>

      <section className="card">
        <h2>Реакция кожи <small>0 — нет, 10 — очень сильно</small></h2>
        {SCALES.map(([k, label]) => (
          <Scale key={k} label={label} value={c[k]} onChange={(v) => set({ [k]: v })} />
        ))}
      </section>

      <section className="card">
        <h2>
          Воспалённые элементы <small>всего {total(c)}</small>
        </h2>
        <div className="grid2">
          {ZONES.map(([z, label]) => (
            <Stepper key={z} label={label} value={c.zones[z]} onChange={(v) => set({ zones: { ...c.zones, [z]: v ?? 0 } })} />
          ))}
        </div>
        {prev && total(c) === 0 && total(prev) > 0 && (
          <button type="button" className="link" onClick={() => set({ zones: { ...prev.zones } })}>
            Как в прошлой записи ({fmt(prev.date)}: {total(prev)})
          </button>
        )}
        <div className="chips">
          <Chip on={c.nodules} onChange={(v) => set({ nodules: v })}>
            Болезненные узлы или кисты
          </Chip>
          <Chip on={c.noseRed} onChange={(v) => set({ noseRed: v })}>
            Краснота носа
          </Chip>
        </div>
      </section>

      <section className="card">
        <h2>Триггеры</h2>
        <div className="chips">
          {FLAGS.map(([k, label]) => (
            <Chip key={k} on={c.flags[k]} onChange={(v) => set({ flags: { ...c.flags, [k]: v } })}>
              {label}
            </Chip>
          ))}
        </div>
        <div className="grid2">
          <Stepper label="Вода" unit="л" step={0.25} start={1.5} max={6} nullable value={c.water} onChange={(v) => set({ water: v })} />
          <Stepper label="Сон" unit="ч" step={0.5} start={7.5} max={16} nullable value={c.sleep} onChange={(v) => set({ sleep: v })} />
        </div>
      </section>

      <section className="card">
        <h2>Заметка</h2>
        <textarea rows={3} value={c.note} placeholder="Что изменилось, новые средства, самочувствие…" onChange={(e) => set({ note: e.target.value })} />
      </section>
    </div>
  );
}
