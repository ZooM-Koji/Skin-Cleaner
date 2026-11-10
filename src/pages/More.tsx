import { useEffect, useState } from 'react';
import { DateField, Seg } from '../components/ui';
import * as db from '../db';
import { exportJson, parseBackup } from '../lib/backup';
import { fmt, today } from '../lib/dates';
import { weeklyReport } from '../lib/report';
import { recentActives } from '../lib/rules';
import { num } from '../lib/stats';
import { newId, useStore } from '../store';
import { STATUSES, type Product, type Status, type Step } from '../types';

const SECTIONS = [
  ['products', 'Средства'],
  ['report', 'Отчёт'],
  ['routine', 'Уход'],
  ['data', 'Данные'],
] as const;
type Section = (typeof SECTIONS)[number][0];

export function More() {
  const [sec, setSec] = useState<Section>('products');
  return (
    <div className="page">
      <h1>Ещё</h1>
      <Seg<Section> value={sec} onChange={setSec} options={SECTIONS} />
      {sec === 'products' && <Products />}
      {sec === 'report' && <Report />}
      {sec === 'routine' && <Routine />}
      {sec === 'data' && <DataSection />}
    </div>
  );
}

/* ---------- Средства и бюджет ---------- */

const FRAGRANCE = /parfum|fragrance|аромат|отдушк|парфюм/i;
const ACIDS = /acid|кислот/i;
const rub = (x: number) => `${num(x, 0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽`;

function Products() {
  const st = useStore();
  const now = today();
  const spent = st.products.filter((p) => p.bought).reduce((a, p) => a + (p.price ?? 0), 0);
  const toBuy = st.products.filter((p) => p.status === 'buy' && !p.bought);
  const planned = toBuy.reduce((a, p) => a + (p.price ?? 0), 0);
  const noPrice = toBuy.filter((p) => p.price == null).length;
  const rest = st.settings.budget - spent;

  const add = () => st.saveProduct({ id: newId(), name: 'Новое средство', status: 'buy', ingredients: '', fragrance: false, acids: false, active: false, startDate: '', price: null, bought: false, note: '' });

  return (
    <>
      <section className="card">
        <h2>Бюджет</h2>
        <div className={'big' + (rest < 0 ? ' danger' : '')}>{rub(rest)}</div>
        <p>
          Остаток из {rub(st.settings.budget)}. Потрачено {rub(spent)}.
        </p>
        <p className={rest - planned < 0 ? 'danger' : 'muted'}>
          Ещё к покупке на {rub(planned)}
          {noPrice > 0 && ` (у ${noPrice} поз. цена не указана)`}; после покупок останется {rub(rest - planned)}.
        </p>
        <label className="field">
          Бюджет, ₽
          <input type="number" min={0} step={100} value={st.settings.budget} onChange={(e) => st.saveSettings({ ...st.settings, budget: Math.max(0, +e.target.value || 0) })} />
        </label>
      </section>

      {STATUSES.map(([status, title]) => {
        const list = st.products.filter((p) => p.status === status);
        return (
          <section className="card" key={status}>
            <h2>
              {title} <small>{list.length}</small>
            </h2>
            {list.length === 0 && <p className="muted">Пусто</p>}
            {list.map((p) => (
              <ProductItem key={p.id} p={p} now={now} />
            ))}
          </section>
        );
      })}
      <button type="button" className="btn primary" onClick={add}>
        Добавить средство
      </button>
    </>
  );
}

function ProductItem({ p, now }: { p: Product; now: string }) {
  const st = useStore();
  const set = (patch: Partial<Product>) => st.saveProduct({ ...p, ...patch });
  // Другие активы, введённые меньше 10 дней назад
  const fresh = recentActives(st.products, now).filter((r) => r.product.id !== p.id);

  const setIngredients = (ingredients: string) =>
    set({ ingredients, fragrance: p.fragrance || FRAGRANCE.test(ingredients), acids: p.acids || ACIDS.test(ingredients) });
  const setStatus = (status: Status) => set({ status, startDate: status === 'used' && !p.startDate ? now : p.startDate });

  return (
    <details className="item">
      <summary>
        <span className="name">{p.name}</span>
        {p.fragrance && <span className="badge warn">отдушка</span>}
        {p.acids && <span className="badge warn">кислоты</span>}
        {p.price != null && <span className="badge">{rub(p.price)}</span>}
      </summary>
      <div className="body">
        <label className="field">
          Название
          <input type="text" value={p.name} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <div className="row">
          <label className="field">
            Статус
            <select value={p.status} onChange={(e) => setStatus(e.target.value as Status)}>
              {STATUSES.map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Цена, ₽
            <input type="number" min={0} inputMode="decimal" value={p.price ?? ''} onChange={(e) => set({ price: e.target.value === '' ? null : Math.max(0, +e.target.value) })} />
          </label>
        </div>
        {p.status === 'buy' && !p.bought && (
          <button type="button" className="btn" onClick={() => set({ bought: true, status: 'used', startDate: p.startDate || now })}>
            Куплено — перенести в «Используется»
          </button>
        )}
        <label className="check">
          <input type="checkbox" checked={p.bought} onChange={(e) => set({ bought: e.target.checked })} />
          Куплено из бюджета (цена вычитается из остатка)
        </label>
        <label className="field">
          Состав
          <textarea rows={3} value={p.ingredients} placeholder="Можно вставить состав с упаковки" onChange={(e) => setIngredients(e.target.value)} />
        </label>
        <label className="check">
          <input type="checkbox" checked={p.fragrance} onChange={(e) => set({ fragrance: e.target.checked })} />
          Есть отдушка
        </label>
        <label className="check">
          <input type="checkbox" checked={p.acids} onChange={(e) => set({ acids: e.target.checked })} />
          Есть кислоты
        </label>
        <label className="check">
          <input type="checkbox" checked={p.active} onChange={(e) => set({ active: e.target.checked })} />
          Активное средство (ретиноид, кислота и т. п.)
        </label>
        {p.active && (
          <>
            <DateField label="Начало использования" value={p.startDate} max={now} allowEmpty onChange={(v) => set({ startDate: v })} />
            {fresh.map((r) => (
              <div className="hint care" key={r.product.id}>
                <b>С новым активом лучше подождать</b>
                <p>
                  «{r.product.name}» в схеме {r.age} дн. Вводить ещё одно активное средство стоит не раньше {fmt(r.until)}.
                </p>
              </div>
            ))}
          </>
        )}
        <label className="field">
          Заметки
          <textarea rows={2} value={p.note} onChange={(e) => set({ note: e.target.value })} />
        </label>
        <button type="button" className="link danger" onClick={() => confirm(`Удалить «${p.name}» из списка?`) && st.removeProduct(p.id)}>
          Удалить из списка
        </button>
      </div>
    </details>
  );
}

/* ---------- Недельный отчёт ---------- */

function Report() {
  const st = useStore();
  const [end, setEnd] = useState(today());
  const [state, setState] = useState<'' | 'ok' | 'fail'>('');
  const text = weeklyReport(st.checkins, st.products, st.settings, st.photoDates, end);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('ok');
    } catch {
      setState('fail');
    }
    setTimeout(() => setState(''), 4000);
  };

  return (
    <section className="card">
      <h2>Недельный отчёт</h2>
      <DateField label="Последний день недели" value={end} max={today()} onChange={setEnd} />
      <pre className="report">{text}</pre>
      <button type="button" className="btn primary" onClick={copy}>
        {state === 'ok' ? 'Скопировано' : 'Скопировать'}
      </button>
      {state === 'fail' && <p className="error">Браузер не дал скопировать. Выделите текст отчёта вручную.</p>}
      <p className="muted">Отчёт охватывает 7 дней. Скопируйте текст и отправьте Claude или покажите врачу. Фото в отчёт не входят.</p>
    </section>
  );
}

/* ---------- Шаги ухода ---------- */

function Routine() {
  const { settings, saveSettings } = useStore();
  const block = (key: 'amSteps' | 'pmSteps', title: string) => {
    const steps = settings[key];
    const save = (next: Step[]) => saveSettings({ ...settings, [key]: next });
    const move = (i: number, d: number) => {
      const next = [...steps];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      save(next);
    };
    return (
      <section className="card">
        <h2>{title}</h2>
        {steps.map((s, i) => (
          <div className="row steprow" key={s.id}>
            <input type="text" value={s.label} aria-label={`Шаг ${i + 1}`} onChange={(e) => save(steps.map((x) => (x.id === s.id ? { ...x, label: e.target.value } : x)))} />
            <button type="button" className="btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Выше">
              ↑
            </button>
            <button type="button" className="btn" disabled={i === steps.length - 1} onClick={() => move(i, 1)} aria-label="Ниже">
              ↓
            </button>
            <button type="button" className="btn danger" onClick={() => save(steps.filter((x) => x.id !== s.id))} aria-label={`Удалить шаг «${s.label}»`}>
              ✕
            </button>
          </div>
        ))}
        <button type="button" className="btn" onClick={() => save([...steps, { id: newId(), label: 'Новый шаг' }])}>
          Добавить шаг
        </button>
      </section>
    );
  };
  return (
    <>
      {block('amSteps', 'Утренний уход')}
      {block('pmSteps', 'Вечерний уход')}
      <p className="muted">Клензит отмечается отдельной кнопкой в вечернем блоке чек-ина, добавлять его сюда не нужно.</p>
    </>
  );
}

/* ---------- Экспорт и импорт ---------- */

function DataSection() {
  const st = useStore();
  const [withPhotos, setWithPhotos] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [usage, setUsage] = useState('');

  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => e.usage != null && setUsage(`${num(e.usage / 1048576)} МБ`));
  }, []);

  const doExport = async () => {
    setErr('');
    try {
      const { settings, checkins, products } = st;
      const json = await exportJson({ settings, checkins, products }, withPhotos ? await db.getPhotos() : undefined);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      a.download = `skin-cleaner-${today()}${withPhotos ? '-s-foto' : ''}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      setMsg(`Файл ${a.download} сохранён в загрузки.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Не удалось сделать бэкап');
    }
  };

  const doImport = async (file?: File) => {
    if (!file) return;
    setErr('');
    setMsg('');
    try {
      const { data, photos } = parseBackup(await file.text());
      const what = `записей: ${data.checkins.length}, средств: ${data.products.length}, фото: ${photos ? photos.length : 'нет в файле — текущие останутся'}`;
      if (!confirm(`Заменить все данные приложения данными из файла?\n(${what})\n\nТекущие данные будут стёрты.`)) return;
      await db.replaceAll(data, photos);
      await st.reload();
      setMsg(`Данные восстановлены (${what}).`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Не удалось прочитать файл');
    }
  };

  return (
    <>
      <section className="card">
        <h2>Бэкап в файл</h2>
        <p>
          Записей в дневнике: {st.checkins.length}, дат с фото: {st.photoDates.length}
          {usage && `, занято на устройстве около ${usage}`}.
        </p>
        <label className="check">
          <input type="checkbox" checked={withPhotos} onChange={(e) => setWithPhotos(e.target.checked)} />
          Включить фото (файл может весить десятки МБ)
        </label>
        <button type="button" className="btn primary" onClick={doExport}>
          Экспорт в JSON
        </button>
        <p className="muted">
          Данные живут только в этом браузере. Если очистить данные сайта или удалить приложение, они пропадут — делайте бэкап
          хотя бы раз в пару недель.
        </p>
      </section>
      <section className="card">
        <h2>Восстановление из файла</h2>
        <label className="btn filebtn">
          Выбрать файл бэкапа
          <input type="file" accept="application/json,.json" hidden onChange={(e) => (doImport(e.target.files?.[0]), (e.target.value = ''))} />
        </label>
        <p className="muted">Импорт полностью заменяет текущие данные. Если в файле нет фото, фото на устройстве не изменятся.</p>
      </section>
      {msg && <p>{msg}</p>}
      {err && <p className="error">{err}</p>}
    </>
  );
}
