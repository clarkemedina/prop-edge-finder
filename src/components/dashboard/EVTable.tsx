import { ArrowUpDown, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatOdds, formatProbability, formatEV } from '@/lib/ev-calculations';
import type { EVCalculation, DashboardFilters } from '@/types';
import { cn } from '@/lib/utils';

interface EVTableProps {
  data: EVCalculation[];
  filters: DashboardFilters;
  onSort: (key: DashboardFilters['sortBy']) => void;
  onSelectPlayer: (ev: EVCalculation) => void;
  onAddToParlay: (ev: EVCalculation) => void;
  parlayIds: Set<string>;
}

export function EVTable({ data, filters, onSort, onSelectPlayer, onAddToParlay, parlayIds }: EVTableProps) {
  const SortIcon = ({ col }: { col: DashboardFilters['sortBy'] }) => {
    if (filters.sortBy !== col) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    return filters.sortDir === 'asc'
      ? <ChevronUp className="ml-1 h-3 w-3 text-primary" />
      : <ChevronDown className="ml-1 h-3 w-3 text-primary" />;
  };

  const SortButton = ({ col, children, className }: { col: DashboardFilters['sortBy']; children: React.ReactNode; className?: string }) => (
    <button
      onClick={() => onSort(col)}
      className={cn("flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors", className)}
    >
      {children}
      <SortIcon col={col} />
    </button>
  );

  return (
    <div className="overflow-x-auto">
      {/* Desktop Table */}
      <table className="hidden w-full md:table">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left"><SortButton col="player_name">Player</SortButton></th>
            <th className="px-3 py-3 text-left"><SortButton col="player_name">Sport</SortButton></th>
            <th className="px-3 py-3 text-left">Stat</th>
            <th className="px-3 py-3 text-left">Book</th>
            <th className="px-3 py-3 text-right">Line</th>
            <th className="px-3 py-3 text-right">Odds</th>
            <th className="px-3 py-3 text-right">Implied</th>
            <th className="px-3 py-3 text-right"><SortButton col="market_consensus_prob" className="justify-end">Consensus</SortButton></th>
            <th className="px-3 py-3 text-right"><SortButton col="ev_pct" className="justify-end">EV%</SortButton></th>
            <th className="px-3 py-3 text-right"><SortButton col="confidence_score" className="justify-end">Conf.</SortButton></th>
            <th className="px-3 py-3 text-center">Parlay</th>
          </tr>
        </thead>
        <tbody>
          {data.map((ev) => {
            const isPositive = ev.ev_pct > 0;
            const inParlay = parlayIds.has(ev.id);
            return (
              <tr
                key={ev.id}
                onClick={() => onSelectPlayer(ev)}
                className={cn(
                  "border-b border-border cursor-pointer transition-colors hover:bg-secondary/50",
                  isPositive && "bg-primary/[0.03]"
                )}
              >
                <td className="px-4 py-3">
                  <div>
                    <span className="font-medium">{ev.player_prop.player.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">vs {ev.player_prop.opponent}</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <Badge variant="secondary" className="text-[10px]">{ev.player_prop.player.sport}</Badge>
                </td>
                <td className="px-3 py-3 text-sm">{ev.player_prop.stat_type}</td>
                <td className="px-3 py-3 text-sm">{ev.best_sportsbook.name}</td>
                <td className="px-3 py-3 text-right font-mono text-sm">
                  {ev.direction} {ev.best_line}
                </td>
                <td className="px-3 py-3 text-right font-mono text-sm">{formatOdds(ev.best_odds)}</td>
                <td className="px-3 py-3 text-right font-mono text-sm text-muted-foreground">
                  {formatProbability(ev.implied_prob || ev.true_prob)}
                </td>
                <td className="px-3 py-3 text-right font-mono text-sm">
                  {formatProbability(ev.market_consensus_prob)}
                </td>
                <td className={cn(
                  "px-3 py-3 text-right font-mono text-sm font-semibold",
                  isPositive ? "text-ev-positive" : "text-ev-negative"
                )}>
                  {formatEV(ev.ev_pct)}
                </td>
                <td className="px-3 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <div className="h-1.5 w-12 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${ev.confidence_score}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono w-7 text-right">{ev.confidence_score}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-center">
                  <Button
                    size="sm"
                    variant={inParlay ? "default" : "outline"}
                    className="h-7 w-7 p-0"
                    onClick={(e) => { e.stopPropagation(); onAddToParlay(ev); }}
                  >
                    <Plus className={cn("h-3.5 w-3.5", inParlay && "rotate-45")} />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mobile Cards */}
      <div className="flex flex-col gap-2 p-3 md:hidden">
        {data.map((ev) => {
          const isPositive = ev.ev_pct > 0;
          const inParlay = parlayIds.has(ev.id);
          return (
            <div
              key={ev.id}
              onClick={() => onSelectPlayer(ev)}
              className={cn(
                "rounded-lg border border-border bg-card p-3 cursor-pointer active:scale-[0.99] transition-all",
                isPositive && "border-primary/20"
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{ev.player_prop.player.name}</span>
                    <Badge variant="secondary" className="text-[10px]">{ev.player_prop.player.sport}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ev.player_prop.stat_type} • vs {ev.player_prop.opponent}
                  </p>
                </div>
                <span className={cn(
                  "font-mono text-sm font-bold",
                  isPositive ? "text-ev-positive" : "text-ev-negative"
                )}>
                  {formatEV(ev.ev_pct)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <div className="flex gap-3 text-muted-foreground">
                  <span>{ev.direction} {ev.best_line}</span>
                  <span className="font-mono">{formatOdds(ev.best_odds)}</span>
                  <span>{ev.best_sportsbook.name}</span>
                </div>
                <Button
                  size="sm"
                  variant={inParlay ? "default" : "outline"}
                  className="h-6 w-6 p-0"
                  onClick={(e) => { e.stopPropagation(); onAddToParlay(ev); }}
                >
                  <Plus className={cn("h-3 w-3", inParlay && "rotate-45")} />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-sm">No props match your filters</p>
        </div>
      )}
    </div>
  );
}
