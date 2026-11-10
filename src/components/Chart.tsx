import { useEffect, useRef, useState } from 'react';
import { num } from '../lib/stats';

export interface Series {
  name: string;
  /** CSS-цвет, обычно var(--series-1) */
  color: string;
  values: (number | null)[];
}

interface Props {
  /** подписи оси X */
  labels: string[];
  /** заголовки всплывающей подсказки; по умолчанию — labels */
  tips?: string[];
  series: Series[];
  /** столбцы вместо линии (только для одной серии) */
  bars?: boolean;
  /** плановые значения — короткая черта над столбцом */
  target?: { name: string; values: number[] };
  yMax?: number;
  label: string;
}

function niceMax(m: number): number {
  if (m <= 4) return 4;
  if (m <= 10) return 10;
  const p = 10 ** Math.floor(Math.log10(m));
  return [2, 4, 10].map((k) => k * p).find((v) => m <= v)!;
}

const H = 180;
const PAD = { l: 30, r: 10, t: 10, b: 24 };

export function Chart({ labels, tips, series, bars, target, yMax, label }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(320);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current!;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = labels.length;
  const all = [...series.flatMap((s) => s.values), ...(target?.values ?? [])].filter((v): v is number => v != null);
  const empty = !series.some((s) => s.values.some((v) => v != null));
  const max = yMax ?? niceMax(Math.max(0, ...all));
  const pw = w - PAD.l - PAD.r;
  const ph = H - PAD.t - PAD.b;
  const step = bars ? pw / n : n > 1 ? pw / (n - 1) : 0;
  const x = (i: number) => (bars ? PAD.l + step * (i + 0.5) : n > 1 ? PAD.l + step * i : PAD.l + pw / 2);
  const y = (v: number) => PAD.t + ph - (v / max) * ph;
  const every = Math.ceil(n / Math.max(1, Math.floor(pw / 44)));
  const bw = Math.min(26, step * 0.62);

  const onMove = (e: React.PointerEvent) => {
    const px = e.clientX - box.current!.getBoundingClientRect().left;
    const i = bars ? Math.floor((px - PAD.l) / step) : n > 1 ? Math.round((px - PAD.l) / step) : 0;
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  /** Линия с разрывами на пропусках */
  const path = (vals: (number | null)[]) => {
    let d = '';
    let pen = false;
    vals.forEach((v, i) => {
      if (v == null) return void (pen = false);
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };
  const lonely = (vals: (number | null)[], i: number) => vals[i] != null && vals[i - 1] == null && vals[i + 1] == null;

  return (
    <div className="chart" ref={box}>
      {(series.length > 1 || target) && (
        <div className="legend">
          {series.map((s) => (
            <span key={s.name}>
              <i style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
          {target && (
            <span>
              <i className="tick" />
              {target.name}
            </span>
          )}
        </div>
      )}
      <svg
        width={w}
        height={H}
        role="img"
        aria-label={label}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {[0, max / 2, max].map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={w - PAD.r} y1={y(t)} y2={y(t)} className={t ? 'grid' : 'axis'} />
            <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" className="tickl">
              {num(t)}
            </text>
          </g>
        ))}
        {labels.map((l, i) =>
          i % every === 0 ? (
            <text key={i} x={x(i)} y={H - 6} textAnchor="middle" className="tickl">
              {l}
            </text>
          ) : null,
        )}
        {hover != null && !empty && !bars && <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + ph} className="cross" />}
        {bars &&
          series[0].values.map((v, i) => {
            if (v == null) return null;
            const h = Math.max(v > 0 ? 2 : 0, PAD.t + ph - y(v));
            const r = Math.min(4, h, bw / 2);
            const x0 = x(i) - bw / 2;
            const yb = PAD.t + ph;
            return (
              <path
                key={i}
                d={`M${x0},${yb}V${yb - h + r}q0,${-r} ${r},${-r}H${x0 + bw - r}q${r},0 ${r},${r}V${yb}Z`}
                fill={series[0].color}
                opacity={hover == null || hover === i ? 1 : 0.55}
              />
            );
          })}
        {bars &&
          target?.values.map((v, i) => (
            <line key={i} x1={x(i) - bw / 2 - 3} x2={x(i) + bw / 2 + 3} y1={y(v)} y2={y(v)} className="target" />
          ))}
        {!bars &&
          series.map((s) => (
            <g key={s.name}>
              <path d={path(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {s.values.map((v, i) =>
                v != null && (lonely(s.values, i) || hover === i) ? (
                  <circle key={i} cx={x(i)} cy={y(v)} r={hover === i ? 4.5 : 3} fill={s.color} className="dot" />
                ) : null,
              )}
            </g>
          ))}
        {empty && (
          <text x={PAD.l + pw / 2} y={PAD.t + ph / 2} textAnchor="middle" className="emptyl">
            Пока нет данных
          </text>
        )}
      </svg>
      {hover != null && !empty && (
        <div className="tip" style={x(hover) > w / 2 ? { right: w - x(hover) + 10 } : { left: x(hover) + 10 }}>
          <b>{(tips ?? labels)[hover]}</b>
          {series.map((s) => (
            <div key={s.name}>
              <i style={{ background: s.color }} />
              {s.name}: <b>{num(s.values[hover])}</b>
            </div>
          ))}
          {target && (
            <div>
              <i className="tick" />
              {target.name}: <b>{num(target.values[hover])}</b>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
