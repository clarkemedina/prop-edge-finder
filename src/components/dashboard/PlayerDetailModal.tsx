import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  formatOdds,
  formatProbability,
  removeVig,
  convertAmericanToProbability,
} from '@/lib/evCalculator';
import { generateMockHistorical } from '@/lib/mock-data';
import type { EVCalculation } from '@/types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';

interface Props {
  ev: EVCalculation | null;
  open: boolean;
  onClose: () => void;
}

export function PlayerDetailModal({ ev, open, onClose }: Props) {
  const allLines: EVCalculation[] =
    (ev as any)?.all_player_lines ?? (ev ? [ev] : []);

  const [selectedStat, setSelectedStat] = useState<string | null>(null);

  useEffect(() => {
    if (allLines.length > 0) {
      setSelectedStat(allLines[0].player_prop.stat_type);
    }
  }, [ev]);

  const activeEV = useMemo(() => {
    if (!selectedStat) return allLines[0];
    return (
      allLines.find(
        (line) => line.player_prop.stat_type === selectedStat
      ) ?? allLines[0]
    );
  }, [allLines, selectedStat]);

  if (!ev || !activeEV) return null;

  const historical = generateMockHistorical(
    activeEV.player_prop.player_id,
    activeEV.player_prop.stat_type
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {activeEV.player_prop.player.name}
            <Badge variant="secondary">
              {activeEV.player_prop.player.sport}
            </Badge>
          </DialogTitle>

          <DialogDescription className="text-sm text-muted-foreground">
            Detailed expected value breakdown and sportsbook comparison.
          </DialogDescription>

          <p className="text-sm text-muted-foreground">
            {activeEV.player_prop.player.team || 'Team'} vs{' '}
            {activeEV.player_prop.opponent || 'Opponent'} •{' '}
            {activeEV.player_prop.game_date}
          </p>
        </DialogHeader>

        <div className="mt-4 flex flex-wrap gap-2">
          {allLines.map((line) => (
            <Badge
              key={line.player_prop.stat_type}
              variant={
                line.player_prop.stat_type === selectedStat
                  ? 'default'
                  : 'outline'
              }
              className="cursor-pointer"
              onClick={() =>
                setSelectedStat(line.player_prop.stat_type)
              }
            >
              {line.player_prop.stat_type}
            </Badge>
          ))}
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-2">
            Sportsbook Lines ({activeEV.player_prop.stat_type})
          </h3>

          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-3 py-2 text-left text-xs text-muted-foreground">
                    Book
                  </th>
                  <th className="px-3 py-2 text-right text-xs text-muted-foreground">
                    Line
                  </th>
                  <th className="px-3 py-2 text-right text-xs text-muted-foreground">
                    Over
                  </th>
                  <th className="px-3 py-2 text-right text-xs text-muted-foreground">
                    Under
                  </th>
                  <th className="px-3 py-2 text-right text-xs text-muted-foreground">
                    No Vig
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeEV.all_odds.map((snap: any) => {
                  const overImplied = convertAmericanToProbability(
                    snap.over_odds
                  );
                  const underImplied = convertAmericanToProbability(
                    snap.under_odds
                  );

                  const { over } = removeVig(
                    overImplied,
                    underImplied
                  );

                  return (
                    <tr
                      key={`${snap.sportsbook}-${snap.line}`}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-3 py-2 font-medium">
                        {snap.sportsbook}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {snap.line}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {formatOdds(snap.over_odds)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {formatOdds(snap.under_odds)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                        {formatProbability(over)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border p-3 text-center">
            <p className="text-xs text-muted-foreground">Market Line</p>
            <p className="text-lg font-bold font-mono">
              {activeEV.market_consensus_line.toFixed(1)}
            </p>
          </div>

          <div className="rounded-lg border border-border p-3 text-center">
            <p className="text-xs text-muted-foreground">EV %</p>
            <p className="text-lg font-bold font-mono text-primary">
              {activeEV.ev_pct.toFixed(2)}%
            </p>
          </div>

          <div className="rounded-lg border border-border p-3 text-center">
            <p className="text-xs text-muted-foreground">Confidence</p>
            <p className="text-lg font-bold font-mono">
              {activeEV.confidence_score}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-2">
            Historical Performance (Mock)
          </h3>

          <div className="h-48 w-full rounded-lg border border-border p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historical}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <ReferenceLine
                  y={activeEV.market_consensus_line}
                  strokeDasharray="4 4"
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
