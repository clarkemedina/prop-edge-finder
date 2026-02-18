import { X, AlertTriangle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  formatOdds,
  formatProbability,
  calculateParlayProbability,
  calculateParlayPayout,
  getParlayRiskLevel,
} from '@/lib/evCalculator'
import type { EVCalculation } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  legs: EVCalculation[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function ParlayBuilder({ legs, onRemove, onClear }: Props) {
  if (legs.length === 0) return null;

  const probabilities = legs.map((l) => l.true_prob);
  const combinedProb = calculateParlayProbability(probabilities);
  const payoutMultiplier = calculateParlayPayout(legs.map((l) => l.best_odds));
  const riskLevel = getParlayRiskLevel(legs.length, combinedProb);

  const riskColor = {
    Low: 'text-ev-positive',
    Medium: 'text-ev-neutral',
    High: 'text-ev-negative',
    'Very High': 'text-ev-negative',
  }[riskLevel];

  return (
    <div className="border-t border-border bg-card">
      <div className="px-4 py-3 md:px-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Parlay Builder</h3>
            <Badge variant="secondary" className="text-[10px]">{legs.length} legs</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={onClear} className="text-xs h-7">
            Clear All
          </Button>
        </div>

        {/* Legs */}
        <div className="flex flex-wrap gap-2 mb-3">
          {legs.map((leg) => (
            <div
              key={leg.id}
              className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1"
            >
              <span className="text-xs font-medium">{leg.player_prop.player.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {leg.direction} {leg.best_line} {leg.player_prop.stat_type}
              </span>
              <span className="font-mono text-[10px]">{formatOdds(leg.best_odds)}</span>
              <button
                onClick={() => onRemove(leg.id)}
                className="ml-1 rounded-full p-0.5 hover:bg-destructive/10"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-border p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Combined Probability</p>
            <p className="font-mono text-sm font-bold">{formatProbability(combinedProb)}</p>
          </div>
          <div className="rounded-lg border border-border p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Est. Payout</p>
            <p className="font-mono text-sm font-bold">{payoutMultiplier.toFixed(2)}x</p>
          </div>
          <div className="rounded-lg border border-border p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Risk Level</p>
            <p className={cn("text-sm font-bold", riskColor)}>{riskLevel}</p>
          </div>
          <div className="rounded-lg border border-border p-2 text-center">
            <p className="text-[10px] text-muted-foreground">$100 Pays</p>
            <p className="font-mono text-sm font-bold">${(payoutMultiplier * 100).toFixed(0)}</p>
          </div>
        </div>

        {/* Variance Warning */}
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-ev-neutral/20 bg-ev-neutral/5 p-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ev-neutral" />
          <p className="text-[11px] text-muted-foreground">
            Parlays carry high variance. Projected probabilities are estimates based on market consensus 
            and do not guarantee outcomes. Bet responsibly.
          </p>
        </div>
      </div>
    </div>
  );
}
