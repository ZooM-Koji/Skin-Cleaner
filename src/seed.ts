import type { Checkin, Product, Settings } from './types';

const p = (id: string, name: string, status: Product['status'], extra: Partial<Product> = {}): Product => ({
  id,
  name,
  status,
  ingredients: '',
  fragrance: false,
  acids: false,
  active: false,
  startDate: '',
  price: null,
  bought: false,
  note: '',
  ...extra,
});

export const seedProducts = (): Product[] => [
  p('klenzit', 'Клензит (адапален 0,1%)', 'used', { active: true, startDate: '2026-09-20', ingredients: 'Адапален 0,1%' }),
  p('water', 'Умывание водой', 'used'),
  p('cream', 'Крем для лица без отдушки', 'buy', { note: 'Уже в схеме, нужно купить' }),
  p('vaseline', 'Вазелин', 'buy', { note: 'Уже в схеме, нужно купить' }),
  p('cleanser', 'Мягкий гель для умывания', 'buy'),
  p('azelik', 'Азелик 15%', 'buy', { active: true, acids: true, ingredients: 'Азелаиновая кислота 15%', note: 'Фаза 2: утром, первую неделю через день' }),
  p('spf-face', 'SPF для лица', 'buy', { note: 'Покупка в феврале–марте' }),
  p('stop-acne', 'Stop Acne с кислотами', 'paused', { acids: true }),
  p('ceracin', 'Серацин S&Zn', 'paused'),
  p('salicylic', 'Лосьон с салициловой кислотой', 'paused', { acids: true, ingredients: 'Салициловая кислота' }),
  p('demidoff', 'Бальзам Demidoff', 'paused'),
  p('spf-body', 'SPF для тела', 'paused'),
  p('panthenol', 'Пантенол EVO', 'paused'),
];

export const seedSettings = (): Settings => ({
  startDate: '2026-09-20',
  checkpointWeek: 12,
  amSteps: [
    { id: 'am-wash', label: 'Умывание' },
    { id: 'am-cream', label: 'Крем для лица' },
  ],
  pmSteps: [
    { id: 'pm-wash', label: 'Умывание' },
    { id: 'pm-cream', label: 'Крем для лица' },
    { id: 'pm-vaseline', label: 'Вазелин на сухие участки' },
  ],
  phases: [
    { id: 'ph1', title: 'Фаза 1', text: 'Убрать лишнее и купить гель, крем, вазелин.', done: false },
    { id: 'ph2', title: 'Фаза 2', text: 'Добавить Азелик 15% утром, через день первую неделю.', done: false },
  ],
  periods: [
    { id: 'pr1', from: '2026-09-20', to: '2026-10-19', perWeek: 2.5, label: '2–3 раза в неделю' },
    { id: 'pr2', from: '2026-10-20', to: '2026-10-23', perWeek: 0, label: 'Перерыв' },
    { id: 'pr3', from: '2026-10-24', to: '2026-10-31', perWeek: 5, label: '5 раз в неделю' },
    { id: 'pr4', from: '2026-11-01', to: '', perWeek: 7, label: 'Каждый день' },
  ],
  budget: 3000,
});

export const emptyCheckin = (date: string): Checkin => ({
  date,
  am: [],
  pm: [],
  klenzit: false,
  burning: 0,
  peeling: 0,
  dryness: 0,
  redness: 0,
  zones: { forehead: 0, nose: 0, cheekL: 0, cheekR: 0, chin: 0, jaw: 0 },
  nodules: false,
  noseRed: false,
  flags: { vape: false, sweets: false, dairy: false, workout: false, touch: false, shave: false },
  water: null,
  sleep: null,
  note: '',
  updatedAt: 0,
});
