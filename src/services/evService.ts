import { calculateMarketConsensus, calculateEV } from '@/lib/evCalculator';
import { oddsService } from './oddsService';
import { EVCalculation } from '@/types';

export class EVService {
  /**
   * Calculate EV for all available props
   */
  async calculateAllEVs(filters?: {
    sport?: string;
    minEV?: number;
  }): Promise<EVCalculation[]> {
    // Get market consensus data
    const consensus = await oddsService.getMarketConsensus({
      sport: filters?.sport,
    });

    const evCalculations: EVCalculation[] = [];

    for (const prop of consensus) {
      // For each prop, get all sportsbook odds
      const odds = await oddsService.getLatestOdds(
        prop.player_id,
        prop.stat_type,
        prop.line
      );

      if (odds.length === 0) continue;

      // Calculate EV for each sportsbook
      for (const book of odds) {
        const overEV = calculateEV(prop.consensus_over, book.over_odds);
        const underEV = calculateEV(prop.consensus_under, book.under_odds);

        // Take the better side
        const bestSide = overEV.expectedValue > underEV.expectedValue ? 'Over' : 'Under';
        const bestEVResult = bestSide === 'Over' ? overEV : underEV;

        // Filter by minimum EV if specified
        if (filters?.minEV && bestEVResult.expectedValue < filters.minEV) {
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
              sport: prop.sport,
              position: '', // You'll need to fetch this from player data
              team: '', // You'll need to fetch this from player data
            },
            stat_type: prop.stat_type,
            game_date: prop.game_date,
            opponent: '', // Fetch from game data
          },
          best_sportsbook: {
            id: book.sportsbook,
            name: book.sportsbook,
          },
          best_line: prop.line,
          best_odds: bestSide === 'Over' ? book.over_odds : book.under_odds,
          market_consensus_line: prop.line,
          market_consensus_prob: bestSide === 'Over' ? prop.consensus_over : prop.consensus_under,
          implied_prob: bestEVResult.trueProbability,
          true_prob: prop.consensus_over,
          edge_pct: bestEVResult.edgePercent,
          ev_pct: bestEVResult.expectedValue,
          confidence_score: prop.num_sportsbooks / 10, // More books = higher confidence
          direction: bestSide,
          all_odds: odds, // Include all odds for reference
        });
      }
    }

    // Sort by EV descending
    return evCalculations.sort((a, b) => b.ev_pct - a.ev_pct);
  }

  /**
   * Calculate EV for a specific player prop
   */
  async calculatePropEV(
    playerId: string,
    statType: string,
    line: number
  ): Promise<EVCalculation[]> {
    const odds = await oddsService.getLatestOdds(playerId, statType, line);

    if (odds.length === 0) {
      return [];
    }

    // Calculate consensus from available odds
    const consensus = calculateMarketConsensus(
      odds.map(o => ({
        overOdds: o.over_odds,
        underOdds: o.under_odds,
        sportsbook: o.sportsbook,
      }))
    );

    const evCalculations: EVCalculation[] = [];

    for (const book of odds) {
      const overEV = calculateEV(consensus.over, book.over_odds);
      const underEV = calculateEV(consensus.under, book.under_odds);

      const bestSide = overEV.expectedValue > underEV.expectedValue ? 'Over' : 'Under';
      const bestEVResult = bestSide === 'Over' ? overEV : underEV;

      evCalculations.push({
        id: `${playerId}-${statType}-${line}-${book.sportsbook}`,
        prop_id: `${playerId}-${statType}`,
        player_prop: {
          id: `${playerId}-${statType}`,
          player_id: playerId,
          player: {
            id: playerId,
            name: '', // Fetch from player data
            sport: '',
            position: '',
            team: '',
          },
          stat_type: statType,
          game_date: book.game_date,
          opponent: '',
        },
        best_sportsbook: {
          id: book.sportsbook,
          name: book.sportsbook,
        },
        best_line: line,
        best_odds: bestSide === 'Over' ? book.over_odds : book.under_odds,
        market_consensus_line: line,
        market_consensus_prob: bestSide === 'Over' ? consensus.over : consensus.under,
        implied_prob: bestEVResult.trueProbability,
        true_prob: consensus.over,
        edge_pct: bestEVResult.edgePercent,
        ev_pct: bestEVResult.expectedValue,
        confidence_score: consensus.confidence,
        direction: bestSide,
        all_odds: odds,
      });
    }

    return evCalculations.sort((a, b) => b.ev_pct - a.ev_pct);
  }
}

export const evService = new EVService();
