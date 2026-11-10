import { useState } from 'react';
import { Analytics } from './pages/Analytics';
import { Course } from './pages/Course';
import { More } from './pages/More';
import { Photos } from './pages/Photos';
import { Today } from './pages/Today';

const TABS = [
  ['today', 'Сегодня', 'M5 4h14v16H5zM8 2v4M16 2v4M5 9h14'],
  ['photos', 'Фото', 'M4 7h4l2-3h4l2 3h4v13H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  ['stats', 'Динамика', 'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3'],
  ['course', 'Курс', 'M5 21V4M5 4h11l-2 4 2 4H5'],
  ['more', 'Ещё', 'M5 7h14M5 12h14M5 17h14'],
] as const;
type Tab = (typeof TABS)[number][0];

export function App() {
  const [tab, setTab] = useState<Tab>('today');
  return (
    <>
      <main>
        {tab === 'today' && <Today />}
        {tab === 'photos' && <Photos />}
        {tab === 'stats' && <Analytics />}
        {tab === 'course' && <Course />}
        {tab === 'more' && <More />}
      </main>
      <footer className="bottom">
        <p className="disclaimer">Приложение не заменяет врача. Подсказки — не диагноз и не назначение.</p>
        <nav>
          {TABS.map(([id, label, d]) => (
            <button key={id} type="button" className={tab === id ? 'on' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => (setTab(id), window.scrollTo(0, 0))}>
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d={d} />
              </svg>
              {label}
            </button>
          ))}
        </nav>
      </footer>
    </>
  );
}
