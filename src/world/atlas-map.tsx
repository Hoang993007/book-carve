import type { AtlasMap, Place } from './atlas-types';

const CX = 500;
const CY = 395;
const rad = (d: number) => (d * Math.PI) / 180;

/** A ring segment between radii r1 < r2 and angles a1 < a2 (radians), around the heart. */
function arc(r1: number, r2: number, a1: number, a2: number): string {
  const p = (r: number, a: number) => `${CX + r * Math.cos(a)},${CY + r * Math.sin(a)}`;
  const big = a2 - a1 > Math.PI ? 1 : 0;
  return `M${p(r2, a1)} A${r2},${r2} 0 ${big} 1 ${p(r2, a2)} L${p(r1, a2)} A${r1},${r1} 0 ${big} 0 ${p(r1, a1)} Z`;
}

interface Props {
  map: AtlasMap;
  places: Record<string, Place>;
  selected: string | null;
  onPick: (placeId: string) => void;
}

/** The world as a relation diagram: the heart in the middle, its zones around it, far lands joined by the roads the story travels. */
export function AtlasMapView({ map, places, selected, onPick }: Props) {
  const land = (id: string) => ({
    className: `land${selected === id ? ' on' : ''}`,
    onClick: () => onPick(id),
    role: 'button',
    'aria-label': places[id]?.name ?? id,
  });
  const at = (id: string): [number, number] => (id === map.center || id === map.core ? [CX, CY] : (map.lands[id]?.slice(0, 2) as [number, number]) ?? [CX, CY]);
  const ring = map.ring;

  return (
    <svg className="atlas-map" viewBox="0 0 1000 760" role="img" aria-label="Sơ đồ các vùng đất">
      {map.routes.map(([a, b, label]) => {
        const [x1, y1] = at(a);
        const [x2, y2] = at(b);
        const qx = (x1 + x2) / 2 + (y2 - y1) * 0.12;
        const qy = (y1 + y2) / 2 - (x2 - x1) * 0.12;
        return (
          <path key={`${a}-${b}`} className="route" d={`M${x1},${y1} Q${qx},${qy} ${x2},${y2}`}>
            <title>{label}</title>
          </path>
        );
      })}

      {map.band && (
        <g>
          <path d={arc(200, 262, rad(map.band.from), rad(map.band.to))} fill="var(--land-dark)" {...land(map.band.place)} />
          <text x={CX} y={CY + 245} className="lbl">{map.band.label}</text>
          {map.band.spot && (
            <>
              <circle cx={CX} cy={CY + 296} r={15} fill="var(--land-dark)" {...land(map.band.spot.place)} />
              <text x={CX} y={CY + 330} className="sub">{map.band.spot.label}</text>
            </>
          )}
        </g>
      )}

      <circle cx={CX} cy={CY} r={182} fill="var(--surface)" {...land(map.center)} />
      <text x={CX} y={CY - 188} className="sub">{places[map.center]?.name}</text>

      {ring &&
        Array.from({ length: ring.count }, (_, i) => {
          const z = i + 1;
          const a1 = rad(-90 + (i * 360) / ring.count) + 0.012;
          const a2 = rad(-90 + (z * 360) / ring.count) - 0.012;
          const id = ring.zones[z] ?? ring.empty;
          const am = (a1 + a2) / 2;
          return (
            <g key={z}>
              <path d={arc(92, 168, a1, a2)} fill={ring.zones[z] ? 'var(--land-zone)' : 'var(--land-empty)'} {...land(id)} />
              <text x={CX + 130 * Math.cos(am)} y={CY + 130 * Math.sin(am) + 5} className="lbl">{z}</text>
            </g>
          );
        })}
      {ring && (
        <>
          <text x={CX - 192} y={CY + 30} className="lbl" textAnchor="end">{ring.label}</text>
          <text x={CX - 192} y={CY + 45} className="sub" textAnchor="end">{ring.sub}</text>
        </>
      )}

      <circle cx={CX} cy={CY} r={90} fill="var(--land-water)" {...land(map.center)} />
      <circle cx={CX} cy={CY} r={64} fill="var(--land-realm)" {...land(map.core)} />
      <text x={CX} y={CY - 2} className="lbl">{places[map.core]?.name}</text>
      <text x={CX} y={CY + 14} className="sub">{places[map.core]?.aka?.split(';')[0]}</text>

      {Object.entries(map.lands).map(([id, [x, y, rx, ry, kind, label]]) => {
        const p = places[id];
        return (
          <g key={id}>
            <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={`var(--land-${kind})`} {...land(id)} />
            <text x={x} y={y + 4} className="lbl">{label ?? p?.name ?? id}</text>
            {p?.aka && ry > 30 && <text x={x} y={y + 19} className="sub">{p.aka.split(';')[0].slice(0, 26)}</text>}
          </g>
        );
      })}
    </svg>
  );
}
