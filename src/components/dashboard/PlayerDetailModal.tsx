import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatOdds, formatProbability, removeVig } from '@/lib/ev-calculations';
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
  if (!ev) return null;

  const historical = generateMockHistorical(
    ev.player_prop.player_id,
    ev.player_prop.stat_type
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {ev.player_prop.player.name}
            <Badge variant="secondary">{ev.player_prop.player.sport}</Badge>
            <Badge variant="outline">{ev.player_prop.stat_type}</Badge>
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {ev.player_prop.player.team} vs {ev.player_prop.opponent} • {ev.player_prop.game_date}
          </p>
        </DialogHeader>

        {/* Sportsbook Lines Comparison */}
        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-2">Sportsbook Lines</h3>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-3 py-2 text-left text-xs text-muted-foreground">Book</th>
                  <th className="px-3 py-2 text-right text-xs text-muted-foreground">Line</th>
                  <th className="px-3 py-2 text-right text-xs text-muted-foreground">Over</th>
                  <th className="px-3 py-2 text-right text-xs text-muted-foreground">Under</th>
                  <th className="px-3 py-2 text-right text-xs text-muted-foreground">No-Vig</th>
                </tr>
              </thead>
              <tbody>
                {ev.all_odds.map((snap) => {
                  const { overProb } = removeVig(snap.over_odds, snap.under_odds);
                  return (
                    <tr key={snap.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-medium">{snap.sportsbook.name}</td>
                      <td className="px-3 py-2 text-right font-mono">{snap.line}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatOdds(snap.over_odds)}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatOdds(snap.under_odds)}</td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                        {formatProbability(overProb)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border p-3 text-center">
            <p className="text-xs text-muted-foreground">Market Average</p>
            <p className="text-lg font-bold font-mono">{ev.market_consensus_line.toFixed(1)}</p>
          </div>
          <div className="rounded-lg border border-border p-3 text-center">
            <p className="text-xs text-muted-foreground">Consensus Prob</p>
            <p className="text-lg font-bold font-mono">{formatProbability(ev.market_consensus_prob)}</p>
          </div>
          <div className="rounded-lg border border-border p-3 text-center">
            <p className="text-xs text-muted-foreground">Confidence</p>
            <p className="text-lg font-bold font-mono">{ev.confidence_score}</p>
          </div>
        </div>

        {/* Historical Performance Chart */}
        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-2">Historical Performance (Mock)</h3>
          <div className="h-48 w-full rounded-lg border border-border p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historical}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => v.slice(5)}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <ReferenceLine
                  y={ev.market_consensus_line}
                  stroke="hsl(var(--ev-neutral))"
                  strokeDasharray="4 4"
                  label={{ value: 'Line', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
