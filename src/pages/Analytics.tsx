import { Chart } from '../components/Chart';
import { addDays, fmt, fmtShort, today } from '../lib/dates';
import { MIN_DAYS, num, total, triggerTable, weekly } from '../lib/stats';
import { useStore } from '../store';

const C1 = 'var(--series-1)';
const C2 = 'var(--series-2)';
const DAYS = 30;

export function FrequencyChart() {
  const st = useStore();
  const weeks = weekly(st.checkins, st.settings, today());
  return (
    <Chart
      bars
      label="Нанесения Клензита по неделям: план и факт"
      labels={weeks.map((w) => `${w.n}`)}
      tips={weeks.map((w) => `Неделя ${w.n}: ${fmtShort(w.from)}–${fmtShort(w.to)}`)}
      series={[{ name: 'Факт по чек-инам', color: C1, values: weeks.map((w) => w.applied) }]}
      target={{ name: 'План', values: weeks.map((w) => w.planned) }}
      yMax={8}
    />
  );
}

export function Analytics() {
  const st = useStore();
  const now = today();
  const weeks = weekly(st.checkins, st.settings, now);
  const wl = weeks.map((w) => `${w.n}`);
  const wt = weeks.map((w) => `Неделя ${w.n}: ${fmtShort(w.from)}–${fmtShort(w.to)}`);

  const days = Array.from({ length: DAYS }, (_, i) => addDays(now, i - DAYS + 1));
  const byDate = new Map(st.checkins.map((c) => [c.date, c]));
  const daily = (f: (c: NonNullable<ReturnType<typeof byDate.get>>) => number) =>
    days.map((d) => {
      const c = byDate.get(d);
      return c ? f(c) : null;
    });
  const dl = days.map(fmtShort);
  const dt = days.map(fmt);
  const rows = triggerTable(st.checkins);

  return (
    <div className="page">
      <h1>Динамика</h1>

      <section className="card">
        <h2>Воспаления по неделям курса <small>в среднем за день</small></h2>
        <Chart bars label="Среднее число воспалений за день по неделям курса" labels={wl} tips={wt} series={[{ name: 'Воспалений в день', color: C1, values: weeks.map((w) => w.inflamed) }]} />
      </section>

      <section className="card">
        <h2>Воспаления по дням <small>последние {DAYS} дней</small></h2>
        <Chart label="Число воспалений по дням" labels={dl} tips={dt} series={[{ name: 'Воспалений', color: C1, values: daily(total) }]} />
      </section>

      <section className="card">
        <h2>Жжение и шелушение <small>последние {DAYS} дней, 0–10</small></h2>
        <Chart
          label="Жжение и шелушение по дням"
          labels={dl}
          tips={dt}
          yMax={10}
          series={[
            { name: 'Жжение', color: C2, values: daily((c) => c.burning) },
            { name: 'Шелушение', color: C1, values: daily((c) => c.peeling) },
          ]}
        />
      </section>

      <section className="card">
        <h2>Жжение и шелушение по неделям <small>среднее, 0–10</small></h2>
        <Chart
          label="Жжение и шелушение по неделям курса"
          labels={wl}
          tips={wt}
          yMax={10}
          series={[
            { name: 'Жжение', color: C2, values: weeks.map((w) => w.burning) },
            { name: 'Шелушение', color: C1, values: weeks.map((w) => w.peeling) },
          ]}
        />
      </section>

      <section className="card">
        <h2>Нанесения Клензита по неделям</h2>
        <FrequencyChart />
        <p className="muted">План считается по периодам из раздела «Курс». Факт появляется с первой недели, где есть чек-ины.</p>
      </section>

      <section className="card">
        <h2>Триггеры и воспаления</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Триггер</th>
              <th>Был</th>
              <th>Не было</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const ok = r.withN >= MIN_DAYS && r.withoutN >= MIN_DAYS;
              return (
                <tr key={r.label} className={ok ? '' : 'dim'}>
                  <td>{r.label}</td>
                  <td>
                    {ok ? num(r.withAvg) : '—'} <small>{r.withN} дн.</small>
                  </td>
                  <td>
                    {ok ? num(r.withoutAvg) : '—'} <small>{r.withoutN} дн.</small>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="muted">
          Среднее число воспалений в следующие два дня после дня с триггером и без него. Цифры появляются, когда в каждой группе
          есть хотя бы {MIN_DAYS} дня. Это простое сопоставление, а не доказательство причины: совпадения возможны.
        </p>
      </section>
    </div>
  );
}
