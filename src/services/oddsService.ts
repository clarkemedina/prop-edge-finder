import { createClient } from '@supabase/supabase-js';
import { oddsNormalizer, NormalizedProp } from '@/lib/oddsNormalizer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export class OddsService {
  /**
   * Fetch odds from external API and store in Supabase
   */
  async fetchAndStoreOdds(apiName: string, rawData: any): Promise<void> {
    // Normalize the data
    const normalized = oddsNormalizer.normalizeAny(rawData, apiName);
    
    if (!normalized) {
      throw new Error('Failed to normalize odds data');
    }

    const props = Array.isArray(normalized) ? normalized : [normalized];

    // Store each prop
    for (const prop of props) {
      await this.storeOddsSnapshot(prop);
    }
  }

  /**
   * Store a single odds snapshot
   */
  private async storeOddsSnapshot(prop: NormalizedProp): Promise<void> {
    const { error } = await supabase
      .from('odds_snapshots')
      .insert({
        player_id: prop.playerId,
        player_name: prop.playerName,
        sport: prop.sport,
        stat_type: prop.statType,
        line: prop.line,
        sportsbook: prop.sportsbook,
        over_odds: prop.overOdds,
        under_odds: prop.underOdds,
      });

    if (error) {
      console.error('Error storing odds snapshot:', error);
      throw error;
    }
  }

  /**
   * Get latest odds for a specific prop
   */
  async getLatestOdds(
    playerId: string,
    statType: string,
    line: number
  ): Promise<any[]> {
    const { data, error } = await supabase
      .rpc('get_latest_prop_odds', {
        p_player_id: playerId,
        p_stat_type: statType,
        p_line: line,
      });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get market consensus from view
   */
  async getMarketConsensus(filters?: {
    sport?: string;
    gameDate?: string;
  }): Promise<any[]> {
    let query = supabase
      .from('market_consensus')
      .select('*');

    if (filters?.sport) {
      query = query.eq('sport', filters.sport);
    }

    if (filters?.gameDate) {
      query = query.eq('game_date', filters.gameDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  /**
   * Get all latest odds (for dashboard display)
   */
  async getAllLatestOdds(filters?: {
    sport?: string;
    limit?: number;
  }): Promise<any[]> {
    let query = supabase
      .from('latest_odds')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.sport) {
      query = query.eq('sport', filters.sport);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }
}

export const oddsService = new OddsService();
