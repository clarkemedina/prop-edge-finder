import type { EVCalculation } from '@/types';

interface Props {
  data: EVCalculation[];
}

export function StatsBar({ data }: Props) {
  const positiveEV = data.filter((d) => d.ev_pct > 0);
  const avgEV = positiveEV.length > 0
    ? positiveEV.reduce((s, d) => s + d.ev_pct, 0) / positiveEV.length
    : 0;
  const bestEV = data.length > 0 ? Math.max(...data.map((d) => d.ev_pct)) : 0;
  const sportsCount = new Set(data.map((d) => d.player_prop.player.sport)).size;

  return (
    <div className="grid grid-cols-2 gap-2 border-b border-border bg-card px-4 py-3 sm:grid-cols-4 md:px-6">
      <div className="rounded-lg border border-border p-2.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">+EV Props</p>
        <p className="text-xl font-bold font-mono text-ev-positive">{positiveEV.length}</p>
      </div>
      <div className="rounded-lg border border-border p-2.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg EV</p>
        <p className="text-xl font-bold font-mono">
          {avgEV > 0 ? '+' : ''}{avgEV.toFixed(1)}%
        </p>
      </div>
      <div className="rounded-lg border border-border p-2.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Best EV</p>
        <p className="text-xl font-bold font-mono text-ev-positive">
          {bestEV > 0 ? '+' : ''}{bestEV.toFixed(1)}%
        </p>
      </div>
      <div className="rounded-lg border border-border p-2.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sports</p>
        <p className="text-xl font-bold font-mono">{sportsCount}</p>
      </div>
    </div>
  );
}
