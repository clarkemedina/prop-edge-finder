import { supabase } from "@/lib/supabaseClient";

const TARGET_BOOKS = [
  'fanduel',
  'draftkings',
  'betmgm',
  'caesars',
  'pointsbetus',
  'prizepicks',
].join(',');

const NBA_MARKETS = [
  'player_points',
  'player_rebounds',
  'player_assists',
  'player_threes',
  'player_blocks',
  'player_steals',
  'player_points_rebounds_assists',
].join(',');

const CACHE_WINDOW_MINUTES = 30;

export async function fetchOdds() {
  try {
    // Check latest snapshot
    const { data: recentSnapshot } = await supabase
      .from('odds_snapshots')
      .select('created_at')
      .eq('sport', 'NBA')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentSnapshot) {
      const lastFetch = new Date(recentSnapshot.created_at);
      const minutesSinceLastFetch =
        (Date.now() - lastFetch.getTime()) / (1000 * 60);

      if (minutesSinceLastFetch < CACHE_WINDOW_MINUTES) {
        return {
          success: true,
          cached: true,
          message: `Using cached odds from ${Math.round(
            minutesSinceLastFetch
          )} min ago.`,
          nextRefreshIn: Math.round(
            CACHE_WINDOW_MINUTES - minutesSinceLastFetch
          ),
        };
      }
    }

    const eventsResponse = await fetch(
      `https://api.the-odds-api.com/v4/sports/basketball_nba/events?apiKey=${import.meta.env.VITE_ODDS_API_KEY}`
    );

    if (!eventsResponse.ok) {
      throw new Error('Failed to fetch events');
    }

    const events = await eventsResponse.json();
    const creditsRemaining =
      eventsResponse.headers.get('x-requests-remaining');

    let totalPropsStored = 0;

    for (const event of events) {
      const propsResponse = await fetch(
        `https://api.the-odds-api.com/v4/sports/basketball_nba/events/${event.id}/odds?` +
          `apiKey=${import.meta.env.VITE_ODDS_API_KEY}&regions=us&markets=${NBA_MARKETS}&oddsFormat=american&bookmakers=${TARGET_BOOKS}`
      );

      if (!propsResponse.ok) continue;

      const propsData = await propsResponse.json();
      const stored = await storePropsForGame(propsData, event);
      totalPropsStored += stored;
    }

    return {
      success: true,
      cached: false,
      message: 'Successfully fetched fresh odds!',
      gamesProcessed: events.length,
      propsStored: totalPropsStored,
      creditsRemaining,
    };
  } catch (error) {
    return {
      success: false,
      cached: false,
      message: 'Failed to fetch odds',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 🚀 OPTIMIZED VERSION
 * Bulk inserts all props in one query instead of one-by-one
 */
async function storePropsForGame(
  propsData: any,
  event: any
): Promise<number> {
  const rows: any[] = [];

  for (const bookmaker of propsData.bookmakers || []) {
    for (const market of bookmaker.markets || []) {
      const playerMap: Record<string, any> = {};

      for (const outcome of market.outcomes || []) {
        const playerName = outcome.description;

        if (!playerMap[playerName]) {
          playerMap[playerName] = { name: playerName };
        }

        if (outcome.name === 'Over') {
          playerMap[playerName].overOdds = outcome.price;
          playerMap[playerName].line = outcome.point;
        } else if (outcome.name === 'Under') {
          playerMap[playerName].underOdds = outcome.price;
        }
      }

      for (const player of Object.values(playerMap)) {
        if (!player.overOdds || !player.underOdds || !player.line) continue;

        rows.push({
          player_id: player.name
            .toLowerCase()
            .replace(/\s+/g, '-'),
          player_name: player.name,
          sport: 'NBA',
          stat_type: normalizeMarket(market.key),
          line: player.line,
          sportsbook: normalizeSportsbook(bookmaker.key),
          over_odds: player.overOdds,
          under_odds: player.underOdds,
          game_date: event.commence_time,
          opponent: `${event.away_team} @ ${event.home_team}`,
        });
      }
    }
  }

  if (rows.length === 0) return 0;

  const { error } = await supabase
    .from('odds_snapshots')
    .insert(rows);

  if (error) {
    console.error('Bulk insert error:', error);
    return 0;
  }

  return rows.length;
}

function normalizeMarket(k: string): string {
  const map: Record<string, string> = {
    player_points: 'Points',
    player_rebounds: 'Rebounds',
    player_assists: 'Assists',
    player_threes: '3-Pointers',
    player_blocks: 'Blocks',
    player_steals: 'Steals',
    player_points_rebounds_assists: 'PRA',
  };

  return map[k] || k;
}

function normalizeSportsbook(k: string): string {
  const map: Record<string, string> = {
    fanduel: 'FanDuel',
    draftkings: 'DraftKings',
    betmgm: 'BetMGM',
    caesars: 'Caesars',
    pointsbetus: 'PointsBet',
    prizepicks: 'PrizePicks',
  };

  return map[k] || k;
}
