import { DateField } from '../components/ui';
import { addDays, diffDays, fmt, today, weekOf } from '../lib/dates';
import { num, periodFor } from '../lib/stats';
import { newId, useStore } from '../store';
import type { Period, Phase, Settings } from '../types';
import { FrequencyChart } from './Analytics';

export function Course() {
  const { settings: s, saveSettings } = useStore();
  const now = today();
  const set = (patch: Partial<Settings>) => saveSettings({ ...s, ...patch });
  const week = weekOf(s.startDate, now);
  const checkpoint = addDays(s.startDate, (s.checkpointWeek - 1) * 7);
  const left = diffDays(now, checkpoint);
  const current = periodFor(s.periods, now);

  const setPeriod = (id: string, patch: Partial<Period>) => set({ periods: s.periods.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const setPhase = (id: string, patch: Partial<Phase>) => set({ phases: s.phases.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

  return (
    <div className="page">
      <h1>Курс лечения</h1>

      <section className="card">
        <h2>Клензит (адапален 0,1%)</h2>
        <div className="big">{week >= 1 ? `${week}-я неделя` : 'Курс ещё не начался'}</div>
        <div className="progress" aria-hidden>
          <i style={{ width: `${Math.max(0, Math.min(100, (diffDays(s.startDate, now) / ((s.checkpointWeek - 1) * 7 || 1)) * 100))}%` }} />
        </div>
        <p>
          Контрольная точка — {s.checkpointWeek}-я неделя, с {fmt(checkpoint)}
          {left > 0 ? ` (через ${left} дн.)` : left === 0 ? ' (сегодня)' : ' (уже наступила)'}.
        </p>
        <p className="muted">
          Результат ретиноидов обычно оценивают не раньше 12 недель. В контрольную точку удобно сравнить фото и собрать отчёт.
        </p>
        {current && <p>Сейчас по плану: {current.label.toLowerCase()}.</p>}
        <div className="row">
          <DateField label="Дата старта" value={s.startDate} max={now} onChange={(v) => set({ startDate: v })} />
          <label className="field">
            Контрольная неделя
            <input type="number" min={2} max={52} value={s.checkpointWeek} onChange={(e) => set({ checkpointWeek: Math.max(2, Math.min(52, Math.round(+e.target.value) || 12)) })} />
          </label>
        </div>
      </section>

      <section className="card">
        <h2>Фазы</h2>
        {s.phases.map((p) => (
          <details className="item" key={p.id}>
            <summary>
              <input type="checkbox" checked={p.done} onChange={(e) => setPhase(p.id, { done: e.target.checked })} aria-label={`${p.title}: выполнено`} />
              <span className="name">
                <b>{p.title}.</b> {p.text}
              </span>
              <span className="badge">изменить</span>
            </summary>
            <div className="body">
              <label className="field">
                Название
                <input type="text" value={p.title} onChange={(e) => setPhase(p.id, { title: e.target.value })} />
              </label>
              <label className="field">
                Что сделать
                <textarea rows={2} value={p.text} onChange={(e) => setPhase(p.id, { text: e.target.value })} />
              </label>
              <button type="button" className="link danger" onClick={() => confirm(`Удалить «${p.title}»?`) && set({ phases: s.phases.filter((x) => x.id !== p.id) })}>
                Удалить фазу
              </button>
            </div>
          </details>
        ))}
        <button type="button" className="btn" onClick={() => set({ phases: [...s.phases, { id: newId(), title: `Фаза ${s.phases.length + 1}`, text: '', done: false }] })}>
          Добавить фазу
        </button>
      </section>

      <section className="card">
        <h2>Частота нанесений по неделям</h2>
        <FrequencyChart />
      </section>

      <section className="card">
        <h2>Периоды частоты <small>план нанесений</small></h2>
        {[...s.periods]
          .sort((a, b) => a.from.localeCompare(b.from))
          .map((p) => (
            <details className="item" key={p.id}>
              <summary>
                <span className="name">
                  {fmt(p.from)} — {p.to ? fmt(p.to) : 'сейчас'}
                  <br />
                  <small>{p.label}</small>
                </span>
                <span className="badge">{num(p.perWeek)} в нед.</span>
              </summary>
              <div className="body">
                <div className="row">
                  <DateField label="С" value={p.from} onChange={(v) => setPeriod(p.id, { from: v })} />
                  <DateField label="По (включительно)" value={p.to} allowEmpty onChange={(v) => setPeriod(p.id, { to: v })} />
                </div>
                <div className="row">
                  <label className="field">
                    Раз в неделю
                    <input type="number" min={0} max={7} step={0.5} value={p.perWeek} onChange={(e) => setPeriod(p.id, { perWeek: Math.max(0, Math.min(7, +e.target.value || 0)) })} />
                  </label>
                  <label className="field">
                    Описание
                    <input type="text" value={p.label} onChange={(e) => setPeriod(p.id, { label: e.target.value })} />
                  </label>
                </div>
                {p.to && (
                  <button type="button" className="link" onClick={() => setPeriod(p.id, { to: '' })}>
                    Сделать бессрочным
                  </button>
                )}{' '}
                <button type="button" className="link danger" onClick={() => confirm('Удалить период?') && set({ periods: s.periods.filter((x) => x.id !== p.id) })}>
                  Удалить период
                </button>
              </div>
            </details>
          ))}
        <button
          type="button"
          className="btn"
          onClick={() =>
            // Новый период начинается сегодня; предыдущий бессрочный закрывается вчерашним днём
            set({
              periods: [
                ...s.periods.map((p) => (!p.to && p.from < now ? { ...p, to: addDays(now, -1) } : p)),
                { id: newId(), from: now, to: '', perWeek: 7, label: 'Каждый день' },
              ],
            })
          }
        >
          Новый период с сегодняшнего дня
        </button>
      </section>
    </div>
  );
}
