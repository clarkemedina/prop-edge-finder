/**
 * Odds Normalization Layer
 * 
 * Converts raw sportsbook API responses into a standardized format.
 * Handles multiple sportsbook formats and missing data safely.
 */

export interface NormalizedProp {
  playerId: string;
  playerName: string;
  sport: string;
  statType: string;
  line: number;
  overOdds: number;
  underOdds: number;
  sportsbook: string;
  timestamp: string;
}

/**
 * Raw API response formats from different sportsbooks
 * Extend these interfaces as you add more sportsbooks
 */

// Example: PrizePicks format
interface PrizePicksRawProp {
  player?: {
    id?: string;
    name?: string;
  };
  league?: string;
  stat_type?: string;
  line_score?: number;
  odds?: {
    over?: number;
    under?: number;
  };
}

// Example: The Odds API format
interface TheOddsApiRawProp {
  id?: string;
  sport_key?: string;
  commence_time?: string;
  bookmakers?: Array<{
    key?: string;
    title?: string;
    markets?: Array<{
      key?: string;
      outcomes?: Array<{
        name?: string;
        description?: string;
        price?: number;
        point?: number;
      }>;
    }>;
  }>;
}

// Example: DraftKings format
interface DraftKingsRawProp {
  eventId?: string;
  participant?: {
    participantId?: string;
    name?: string;
  };
  subcategoryId?: string;
  offers?: Array<{
    label?: string;
    outcomes?: Array<{
      label?: string;
      oddsAmerican?: string;
      line?: string;
    }>;
  }>;
}

/**
 * Sportsbook-specific normalizers
 */

class PrizePicksNormalizer {
  normalize(raw: PrizePicksRawProp): NormalizedProp | null {
    try {
      // Validate required fields
      if (!raw.player?.id || !raw.player?.name || !raw.line_score) {
        console.warn('Missing required PrizePicks fields', raw);
        return null;
      }

      return {
        playerId: raw.player.id,
        playerName: raw.player.name,
        sport: this.normalizeSport(raw.league ?? 'unknown'),
        statType: this.normalizeStatType(raw.stat_type ?? 'unknown'),
        line: raw.line_score,
        overOdds: raw.odds?.over ?? -110,
        underOdds: raw.odds?.under ?? -110,
        sportsbook: 'PrizePicks',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('PrizePicks normalization error:', error);
      return null;
    }
  }

  private normalizeSport(league: string): string {
    const sportMap: Record<string, string> = {
      'NBA': 'NBA',
      'NFL': 'NFL',
      'MLB': 'MLB',
      'NHL': 'NHL',
      'WNBA': 'WNBA',
      'soccer': 'Soccer',
      'mls': 'Soccer',
    };
    return sportMap[league] || league;
  }

  private normalizeStatType(stat: string): string {
    const statMap: Record<string, string> = {
      'pts': 'Points',
      'points': 'Points',
      'reb': 'Rebounds',
      'rebounds': 'Rebounds',
      'ast': 'Assists',
      'assists': 'Assists',
      'pts+reb+ast': 'PRA',
      'pra': 'PRA',
      'pass_yds': 'Passing Yards',
      'rush_yds': 'Rushing Yards',
      'strikeouts': 'Strikeouts',
    };
    return statMap[stat.toLowerCase()] || stat;
  }
}

class TheOddsApiNormalizer {
  normalize(raw: TheOddsApiRawProp, playerId: string, playerName: string): NormalizedProp[] {
    const normalized: NormalizedProp[] = [];

    try {
      if (!raw.bookmakers || !raw.sport_key) {
        return normalized;
      }

      for (const bookmaker of raw.bookmakers) {
        if (!bookmaker.markets || !bookmaker.title) continue;

        for (const market of bookmaker.markets) {
          if (!market.outcomes) continue;

          // Find Over/Under pairs
          const overOutcome = market.outcomes.find(o => 
            o.name?.toLowerCase().includes('over')
          );
          const underOutcome = market.outcomes.find(o => 
            o.name?.toLowerCase().includes('under')
          );

          if (overOutcome && underOutcome && overOutcome.point !== undefined) {
            normalized.push({
              playerId,
              playerName,
              sport: this.normalizeSport(raw.sport_key),
              statType: this.normalizeStatType(market.key ?? ''),
              line: overOutcome.point,
              overOdds: overOutcome.price ?? -110,
              underOdds: underOutcome.price ?? -110,
              sportsbook: bookmaker.title,
              timestamp: raw.commence_time || new Date().toISOString(),
            });
          }
        }
      }
    } catch (error) {
      console.error('TheOddsApi normalization error:', error);
    }

    return normalized;
  }

  private normalizeSport(sportKey: string): string {
    const sportMap: Record<string, string> = {
      'basketball_nba': 'NBA',
      'americanfootball_nfl': 'NFL',
      'baseball_mlb': 'MLB',
      'icehockey_nhl': 'NHL',
      'basketball_wnba': 'WNBA',
      'soccer_epl': 'Soccer',
    };
    return sportMap[sportKey] || sportKey;
  }

  private normalizeStatType(marketKey: string): string {
    const statMap: Record<string, string> = {
      'player_points': 'Points',
      'player_rebounds': 'Rebounds',
      'player_assists': 'Assists',
      'player_points_rebounds_assists': 'PRA',
      'player_pass_yds': 'Passing Yards',
      'player_rush_yds': 'Rushing Yards',
    };
    return statMap[marketKey] || marketKey;
  }
}

class DraftKingsNormalizer {
  normalize(raw: DraftKingsRawProp): NormalizedProp | null {
    try {
      if (!raw.participant?.participantId || !raw.participant?.name) {
        return null;
      }

      // Find the player prop offer
      const propOffer = raw.offers?.find(offer => 
        offer.outcomes && offer.outcomes.length >= 2
      );

      if (!propOffer) {
        return null;
      }

      const overOutcome = propOffer.outcomes?.find(o => 
        o.label?.toLowerCase().includes('over')
      );
      const underOutcome = propOffer.outcomes?.find(o => 
        o.label?.toLowerCase().includes('under')
      );

      if (!overOutcome || !underOutcome) {
        return null;
      }

      return {
        playerId: raw.participant.participantId,
        playerName: raw.participant.name,
        sport: this.extractSport(raw.subcategoryId ?? ''),
        statType: propOffer.label ?? 'Unknown',
        line: parseFloat(overOutcome.line ?? '0'),
        overOdds: parseInt(overOutcome.oddsAmerican ?? '-110'),
        underOdds: parseInt(underOutcome.oddsAmerican ?? '-110'),
        sportsbook: 'DraftKings',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('DraftKings normalization error:', error);
      return null;
    }
  }

  private extractSport(subcategoryId: string): string {
    // DraftKings uses numeric IDs, you'd map these based on their API docs
    const sportMap: Record<string, string> = {
      '4': 'NBA',
      '88': 'NFL',
      '3': 'MLB',
      '6': 'NHL',
    };
    return sportMap[subcategoryId] || 'Unknown';
  }
}

/**
 * Main Normalizer Factory
 * 
 * Routes raw API responses to the appropriate normalizer
 */
export class OddsNormalizer {
  private prizePicksNormalizer = new PrizePicksNormalizer();
  private theOddsApiNormalizer = new TheOddsApiNormalizer();
  private draftKingsNormalizer = new DraftKingsNormalizer();

  /**
   * Normalize data from PrizePicks
   */
  normalizePrizePicks(raw: PrizePicksRawProp): NormalizedProp | null {
    return this.prizePicksNormalizer.normalize(raw);
  }

  /**
   * Normalize data from The Odds API
   */
  normalizeTheOddsApi(
    raw: TheOddsApiRawProp,
    playerId: string,
    playerName: string
  ): NormalizedProp[] {
    return this.theOddsApiNormalizer.normalize(raw, playerId, playerName);
  }

  /**
   * Normalize data from DraftKings
   */
  normalizeDraftKings(raw: DraftKingsRawProp): NormalizedProp | null {
    return this.draftKingsNormalizer.normalize(raw);
  }

  /**
   * Generic normalizer - attempts to detect sportsbook format
   */
  normalizeAny(raw: any, sportsbook?: string): NormalizedProp | NormalizedProp[] | null {
    // If sportsbook is explicitly provided
    if (sportsbook) {
      switch (sportsbook.toLowerCase()) {
        case 'prizepicks':
          return this.normalizePrizePicks(raw);
        case 'draftkings':
          return this.normalizeDraftKings(raw);
        default:
          console.warn(`Unknown sportsbook: ${sportsbook}`);
      }
    }

    // Attempt to auto-detect based on structure
    if (raw.player && raw.line_score !== undefined) {
      return this.normalizePrizePicks(raw);
    }
    
    if (raw.bookmakers && Array.isArray(raw.bookmakers)) {
      // TheOddsApi format requires playerId and playerName
      console.warn('TheOddsApi format detected but playerId/playerName not provided');
      return null;
    }
    
    if (raw.participant && raw.offers) {
      return this.normalizeDraftKings(raw);
    }

    console.error('Unable to detect sportsbook format', raw);
    return null;
  }

  /**
   * Batch normalize multiple props
   */
  normalizeBatch(rawProps: any[], sportsbook?: string): NormalizedProp[] {
    const normalized: NormalizedProp[] = [];

    for (const raw of rawProps) {
      const result = this.normalizeAny(raw, sportsbook);
      
      if (result) {
        if (Array.isArray(result)) {
          normalized.push(...result);
        } else {
          normalized.push(result);
        }
      }
    }

    return normalized;
  }

  /**
   * Validate a normalized prop
   */
  validate(prop: NormalizedProp): boolean {
    const checks = [
      prop.playerId && prop.playerId.trim().length > 0,
      prop.playerName && prop.playerName.trim().length > 0,
      prop.sport && prop.sport.trim().length > 0,
      prop.statType && prop.statType.trim().length > 0,
      typeof prop.line === 'number' && !isNaN(prop.line),
      typeof prop.overOdds === 'number' && !isNaN(prop.overOdds),
      typeof prop.underOdds === 'number' && !isNaN(prop.underOdds),
      prop.sportsbook && prop.sportsbook.trim().length > 0,
      prop.timestamp && !isNaN(Date.parse(prop.timestamp)),
    ];

    return checks.every(check => check === true);
  }

  /**
   * Filter out invalid props from a batch
   */
  filterValid(props: NormalizedProp[]): NormalizedProp[] {
    return props.filter(prop => this.validate(prop));
  }
}

/**
 * Singleton instance
 */
export const oddsNormalizer = new OddsNormalizer();
