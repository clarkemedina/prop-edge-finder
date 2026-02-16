export interface Player {
  id: string;
  name: string;
  team: string;
  sport: Sport;
  position: string;
  image_url?: string;
}

export type Sport = 'NBA' | 'NFL' | 'MLB' | 'NHL' | 'WNBA' | 'Soccer';

export type StatType =
  | 'Points'
  | 'Rebounds'
  | 'Assists'
  | 'Steals'
  | 'Blocks'
  | '3-Pointers'
  | 'PRA'
  | 'Passing Yards'
  | 'Rushing Yards'
  | 'Touchdowns'
  | 'Strikeouts'
  | 'Hits'
  | 'Goals'
  | 'Saves';

export interface Sportsbook {
  id: string;
  name: string;
  logo_url?: string;
}

export interface PlayerProp {
  id: string;
  player_id: string;
  player: Player;
  stat_type: StatType;
  game_date: string;
  opponent: string;
}

export interface OddsSnapshot {
  id: string;
  prop_id: string;
  sportsbook_id: string;
  sportsbook: Sportsbook;
  line: number;
  over_odds: number; // American odds
  under_odds: number;
  timestamp: string;
}

export interface EVCalculation {
  id: string;
  prop_id: string;
  player_prop: PlayerProp;
  best_sportsbook: Sportsbook;
  best_line: number;
  best_odds: number;
  market_consensus_line: number;
  market_consensus_prob: number;
  implied_prob: number;
  true_prob: number;
  edge_pct: number;
  ev_pct: number;
  confidence_score: number;
  direction: 'Over' | 'Under';
  all_odds: OddsSnapshot[];
}

export interface ParlayLeg {
  ev_calc: EVCalculation;
  selected: boolean;
}

export interface Parlay {
  id: string;
  legs: ParlayLeg[];
  combined_prob: number;
  estimated_payout: number;
  risk_level: 'Low' | 'Medium' | 'High' | 'Very High';
}

export interface DashboardFilters {
  sport: Sport | 'All';
  statType: StatType | 'All';
  minEV: number;
  search: string;
  sortBy: keyof EVCalculation | 'player_name';
  sortDir: 'asc' | 'desc';
}

export interface HistoricalDataPoint {
  date: string;
  value: number;
  line: number;
}
