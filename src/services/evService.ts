import { calculateMarketConsensus, calculateEV } from '@/lib/evCalculator';
import { oddsService } from './oddsService';
import { EVCalculation, Sport, StatType } from '@/types';
import { supabase } from '@/lib/supabaseClient';

export class EVService {
  async calculateAllEVs(filters?: {
    sport?: string;
    minEV?: number;
  }): Promise<EVCalculation[]> {
    const consensus = await oddsService.getMarketConsensus({
      sport: filters?.sport,
    });

    if (!consensus.length) return [];

    const { data: allOdds, error } = await supabase
      .from('odds_snapshots')
      .select('*')
      .eq('sport', filters?.sport ?? 'NBA')
      .eq('sportsbook', 'PrizePicks');

    if (error || !allOdds) {
      console.error(error);
      return [];
    }

    const oddsMap = new Map<string, any[]>();

    for (const row of allOdds) {
      const key = `${row.player_id}-${row.stat_type}-${row.line}`;
      if (!oddsMap.has(key)) oddsMap.set(key, []);
      oddsMap.get(key)!.push({ ...row }); // clone row
    }

    const evCalculations: EVCalculation[] = [];

    for (const prop of consensus) {
      const key = `${prop.player_id}-${prop.stat_type}-${prop.line}`;
      const odds = oddsMap.get(key);
      if (!odds || odds.length === 0) continue;

      for (const book of odds) {
        const overEV = calculateEV(prop.consensus_over, book.over_odds);
        const underEV = calculateEV(prop.consensus_under, book.under_odds);

        const bestSide =
          overEV.expectedValue > underEV.expectedValue ? 'Over' : 'Under';

        const bestEVResult =
          bestSide === 'Over' ? overEV : underEV;

        if (
          filters?.minEV !== undefined &&
          bestEVResult.expectedValue < filters.minEV
        ) {
          continue;
        }

        evCalculations.push({
          id: `${prop.player_id}-${prop.stat_type}-${prop.line}-${book.sportsbook}`,
          prop_id: `${prop.player_id}-${prop.stat_type}`,
          player_prop: {
            id: `${prop.player_id}-${prop.stat_type}`,
            player_id: prop.player_id,
            player: {
              id: prop.player_id,
              name: prop.player_name,
              sport: prop.sport as Sport,
              position: '',
              team: '',
            },
            stat_type: prop.stat_type as StatType,
            game_date: prop.game_date,
            opponent: '',
          },
          best_sportsbook: {
            id: book.sportsbook,
            name: book.sportsbook,
          },
          best_line: prop.line,
          best_odds:
            bestSide === 'Over'
              ? book.over_odds
              : book.under_odds,
          market_consensus_line: prop.line,
          market_consensus_prob:
            bestSide === 'Over'
              ? prop.consensus_over
              : prop.consensus_under,
          implied_prob: bestEVResult.trueProbability,
          true_prob:
            bestSide === 'Over'
              ? prop.consensus_over
              : prop.consensus_under,
          edge_pct: bestEVResult.edgePercent,
          ev_pct: bestEVResult.expectedValue,
          confidence_score: prop.num_sportsbooks / 10,
          direction: bestSide,
          all_odds: [...odds], // shallow clone only
        });
      }
    }

    // Group by player safely
    const playerMap = new Map<string, EVCalculation[]>();

    for (const ev of evCalculations) {
      if (!playerMap.has(ev.player_prop.player_id)) {
        playerMap.set(ev.player_prop.player_id, []);
      }
      playerMap.get(ev.player_prop.player_id)!.push(ev);
    }

    const grouped: EVCalculation[] = [];

    for (const [, playerEvs] of playerMap) {
      const sorted = [...playerEvs].sort((a, b) => b.ev_pct - a.ev_pct);

      const best = { ...sorted[0] };

      // attach cloned player lines WITHOUT circular reference
      (best as any).all_player_lines = sorted.map(ev => ({
        ...ev,
        all_player_lines: undefined,
      }));

      grouped.push(best);
    }

    return grouped.sort((a, b) => b.ev_pct - a.ev_pct);
  }

  async calculatePropEV(
    playerId: string,
    statType: string,
    line: number
  ): Promise<EVCalculation[]> {
    const odds = await oddsService.getLatestOdds(
      playerId,
      statType,
      line
    );

    if (!odds.length) return [];

    const consensus = calculateMarketConsensus(
      odds.map((o) => ({
        overOdds: o.over_odds,
        underOdds: o.under_odds,
        sportsbook: o.sportsbook,
      }))
    );

    const evCalculations: EVCalculation[] = [];

    for (const book of odds) {
      const overEV = calculateEV(consensus.over, book.over_odds);
      const underEV = calculateEV(consensus.under, book.under_odds);

      const bestSide =
        overEV.expectedValue > underEV.expectedValue ? 'Over' : 'Under';

      const bestEVResult =
        bestSide === 'Over' ? overEV : underEV;

      evCalculations.push({
        id: `${playerId}-${statType}-${line}-${book.sportsbook}`,
        prop_id: `${playerId}-${statType}`,
        player_prop: {
          id: `${playerId}-${statType}`,
          player_id: playerId,
          player: {
            id: playerId,
            name: '',
            sport: 'NBA' as Sport,
            position: '',
            team: '',
          },
          stat_type: statType as StatType,
          game_date: book.game_date,
          opponent: '',
        },
        best_sportsbook: {
          id: book.sportsbook,
          name: book.sportsbook,
        },
        best_line: line,
        best_odds:
          bestSide === 'Over'
            ? book.over_odds
            : book.under_odds,
        market_consensus_line: line,
        market_consensus_prob:
          bestSide === 'Over'
            ? consensus.over
            : consensus.under,
        implied_prob: bestEVResult.trueProbability,
        true_prob:
          bestSide === 'Over'
            ? consensus.over
            : consensus.under,
        edge_pct: bestEVResult.edgePercent,
        ev_pct: bestEVResult.expectedValue,
        confidence_score: consensus.confidence,
        direction: bestSide,
        all_odds: [...odds],
      });
    }

    return evCalculations.sort((a, b) => b.ev_pct - a.ev_pct);
  }
}

export const evService = new EVService();
