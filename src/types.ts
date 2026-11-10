export const ZONES = [
  ['forehead', 'Лоб'],
  ['nose', 'Нос'],
  ['cheekL', 'Левая щека'],
  ['cheekR', 'Правая щека'],
  ['chin', 'Подбородок'],
  ['jaw', 'Линия челюсти'],
] as const;
export type Zone = (typeof ZONES)[number][0];

export const SCALES = [
  ['burning', 'Жжение'],
  ['peeling', 'Шелушение'],
  ['dryness', 'Сухость'],
  ['redness', 'Покраснение'],
] as const;
export type ScaleKey = (typeof SCALES)[number][0];

/** Триггеры «да/нет». Вода и сон хранятся числами отдельно. */
export const FLAGS = [
  ['vape', 'Вейп'],
  ['sweets', 'Сладкое'],
  ['dairy', 'Молочка'],
  ['workout', 'Тренировка'],
  ['touch', 'Касание лица'],
  ['shave', 'Бритьё'],
] as const;
export type FlagKey = (typeof FLAGS)[number][0];

export interface Checkin {
  /** ГГГГ-ММ-ДД по московскому времени — ключ записи */
  date: string;
  am: string[];
  pm: string[];
  klenzit: boolean;
  burning: number;
  peeling: number;
  dryness: number;
  redness: number;
  zones: Record<Zone, number>;
  /** болезненные узлы или кисты */
  nodules: boolean;
  /** заметная краснота носа */
  noseRed: boolean;
  flags: Record<FlagKey, boolean>;
  water: number | null;
  sleep: number | null;
  note: string;
  updatedAt: number;
}

export const ANGLES = [
  ['front', 'Анфас'],
  ['left', 'Левый профиль'],
  ['right', 'Правый профиль'],
] as const;
export type Angle = (typeof ANGLES)[number][0];

export interface Photo {
  /** `${date}_${angle}` */
  id: string;
  date: string;
  angle: Angle;
  blob: Blob;
}

export const STATUSES = [
  ['used', 'Используется'],
  ['buy', 'Купить'],
  ['paused', 'Отложено'],
  ['removed', 'Убрано'],
] as const;
export type Status = (typeof STATUSES)[number][0];

export interface Product {
  id: string;
  name: string;
  status: Status;
  ingredients: string;
  fragrance: boolean;
  acids: boolean;
  /** активное средство (ретиноид, кислота и т. п.) — для правила «10 дней» */
  active: boolean;
  /** дата начала использования, ГГГГ-ММ-ДД */
  startDate: string;
  price: number | null;
  /** уже куплено — цена вычитается из бюджета */
  bought: boolean;
  note: string;
}

export interface Step {
  id: string;
  label: string;
}

export interface Phase {
  id: string;
  title: string;
  text: string;
  done: boolean;
}

/** Период с плановой частотой нанесения Клензита */
export interface Period {
  id: string;
  from: string;
  /** включительно; пусто — «по настоящее время» */
  to: string;
  perWeek: number;
  label: string;
}

export interface Settings {
  startDate: string;
  checkpointWeek: number;
  amSteps: Step[];
  pmSteps: Step[];
  phases: Phase[];
  periods: Period[];
  budget: number;
}
