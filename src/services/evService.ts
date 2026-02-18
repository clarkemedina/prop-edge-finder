import { calculateMarketConsensus, calculateEV } from '@/lib/evCalculator';
import { supabase } from '@/lib/supabaseClient';
import type { EVCalculation, Sport, StatType } from '@/types';

export class EVService {
  async calculateAllEVs(filters?: {
    sport?: string;
  }): Promise<EVCalculation[]> {

    let query = supabase.from('odds_snapshots').select('*');

    if (filters?.sport) {
      query = query.eq('sport', filters.sport);
    }

    const { data: allOdds, error } = await query;

    if (error || !allOdds) {
      console.error(error);
      return [];
    }

    const groupedMap = new Map<string, any[]>();

    for (const row of allOdds) {
      const key = `${row.player_id}-${row.stat_type}-${row.line}`;
      if (!groupedMap.has(key)) {
        groupedMap.set(key, []);
      }
      groupedMap.get(key)!.push(row);
    }

    const evResults: EVCalculation[] = [];

    for (const [key, rows] of groupedMap) {

      if (rows.length < 2) continue;

      const consensus = calculateMarketConsensus(
        rows.map(book => ({
          sportsbook: book.sportsbook,
          overOdds: book.over_odds,
          underOdds: book.under_odds,
        }))
      );

      for (const book of rows) {

        const overEV = calculateEV(consensus.over, book.over_odds);
        const underEV = calculateEV(consensus.under, book.under_odds);

        const bestSide =
          overEV.expectedValue > underEV.expectedValue ? 'Over' : 'Under';

        const bestResult =
          bestSide === 'Over' ? overEV : underEV;

        evResults.push({
          id: `${key}-${book.sportsbook}`,
          prop_id: key,
          player_prop: {
            id: key,
            player_id: book.player_id,
            player: {
              id: book.player_id,
              name: book.player_name,
              sport: book.sport as Sport,
              position: '',
              team: '',
            },
            stat_type: book.stat_type as StatType,
            game_date: book.game_date ?? '',
            opponent: book.opponent ?? '',
          },
          best_sportsbook: {
            id: book.sportsbook,
            name: book.sportsbook,
          },
          best_line: book.line,
          best_odds:
            bestSide === 'Over'
              ? book.over_odds
              : book.under_odds,
          market_consensus_line: book.line,
          market_consensus_prob:
            bestSide === 'Over'
              ? consensus.over
              : consensus.under,
          implied_prob: bestResult.trueProbability,
          true_prob:
            bestSide === 'Over'
              ? consensus.over
              : consensus.under,
          edge_pct: bestResult.edgePercent,
          ev_pct: bestResult.expectedValue,
          confidence_score: Math.round(consensus.confidence * 100),
          direction: bestSide,
          all_odds: rows,
        });
      }
    }

    return evResults.sort((a, b) => b.ev_pct - a.ev_pct);
  }
}

export const evService = new EVService();
