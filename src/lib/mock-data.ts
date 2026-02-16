import type { Player, Sportsbook, PlayerProp, OddsSnapshot, EVCalculation, HistoricalDataPoint } from '@/types';
import {
  removeVig,
  calculateMarketConsensus,
  calculateEV,
  calculateEdge,
  calculateConfidence,
} from './ev-calculations';

// --- Sportsbooks ---
export const sportsbooks: Sportsbook[] = [
  { id: 'dk', name: 'DraftKings' },
  { id: 'fd', name: 'FanDuel' },
  { id: 'mgm', name: 'BetMGM' },
  { id: 'czr', name: 'Caesars' },
  { id: 'pp', name: 'PrizePicks' },
];

// --- Players ---
export const players: Player[] = [
  { id: 'p1', name: 'Luka Dončić', team: 'DAL', sport: 'NBA', position: 'PG' },
  { id: 'p2', name: 'Jayson Tatum', team: 'BOS', sport: 'NBA', position: 'SF' },
  { id: 'p3', name: 'Nikola Jokić', team: 'DEN', sport: 'NBA', position: 'C' },
  { id: 'p4', name: 'Shai Gilgeous-Alexander', team: 'OKC', sport: 'NBA', position: 'SG' },
  { id: 'p5', name: 'Anthony Edwards', team: 'MIN', sport: 'NBA', position: 'SG' },
  { id: 'p6', name: 'Patrick Mahomes', team: 'KC', sport: 'NFL', position: 'QB' },
  { id: 'p7', name: 'Josh Allen', team: 'BUF', sport: 'NFL', position: 'QB' },
  { id: 'p8', name: 'Shohei Ohtani', team: 'LAD', sport: 'MLB', position: 'DH' },
  { id: 'p9', name: 'Connor McDavid', team: 'EDM', sport: 'NHL', position: 'C' },
  { id: 'p10', name: 'Caitlin Clark', team: 'IND', sport: 'WNBA', position: 'PG' },
];

// --- Props with odds ---
interface MockPropDef {
  playerId: string;
  statType: string;
  opponent: string;
  lines: Array<{ sbId: string; line: number; over: number; under: number }>;
}

const propDefs: MockPropDef[] = [
  {
    playerId: 'p1', statType: 'Points', opponent: 'PHX',
    lines: [
      { sbId: 'dk', line: 28.5, over: -115, under: -105 },
      { sbId: 'fd', line: 29.5, over: +100, under: -120 },
      { sbId: 'mgm', line: 28.5, over: -110, under: -110 },
      { sbId: 'czr', line: 29.5, over: +105, under: -125 },
      { sbId: 'pp', line: 30.5, over: -110, under: -110 },
    ],
  },
  {
    playerId: 'p1', statType: 'Assists', opponent: 'PHX',
    lines: [
      { sbId: 'dk', line: 8.5, over: -120, under: +100 },
      { sbId: 'fd', line: 8.5, over: -115, under: -105 },
      { sbId: 'mgm', line: 9.5, over: +130, under: -155 },
      { sbId: 'czr', line: 8.5, over: -110, under: -110 },
    ],
  },
  {
    playerId: 'p2', statType: 'Points', opponent: 'MIA',
    lines: [
      { sbId: 'dk', line: 27.5, over: -110, under: -110 },
      { sbId: 'fd', line: 27.5, over: -105, under: -115 },
      { sbId: 'mgm', line: 26.5, over: -130, under: +110 },
      { sbId: 'pp', line: 28.5, over: -110, under: -110 },
    ],
  },
  {
    playerId: 'p2', statType: 'Rebounds', opponent: 'MIA',
    lines: [
      { sbId: 'dk', line: 8.5, over: +105, under: -125 },
      { sbId: 'fd', line: 8.5, over: +110, under: -130 },
      { sbId: 'mgm', line: 8.5, over: +100, under: -120 },
    ],
  },
  {
    playerId: 'p3', statType: 'PRA', opponent: 'LAL',
    lines: [
      { sbId: 'dk', line: 48.5, over: -115, under: -105 },
      { sbId: 'fd', line: 49.5, over: +100, under: -120 },
      { sbId: 'mgm', line: 48.5, over: -105, under: -115 },
      { sbId: 'czr', line: 49.5, over: -110, under: -110 },
      { sbId: 'pp', line: 50.5, over: -110, under: -110 },
    ],
  },
  {
    playerId: 'p3', statType: 'Assists', opponent: 'LAL',
    lines: [
      { sbId: 'dk', line: 9.5, over: -105, under: -115 },
      { sbId: 'fd', line: 9.5, over: +100, under: -120 },
      { sbId: 'czr', line: 10.5, over: +140, under: -165 },
    ],
  },
  {
    playerId: 'p4', statType: 'Points', opponent: 'GSW',
    lines: [
      { sbId: 'dk', line: 31.5, over: -110, under: -110 },
      { sbId: 'fd', line: 31.5, over: -105, under: -115 },
      { sbId: 'mgm', line: 30.5, over: -125, under: +105 },
      { sbId: 'pp', line: 32.5, over: -110, under: -110 },
    ],
  },
  {
    playerId: 'p5', statType: 'Points', opponent: 'HOU',
    lines: [
      { sbId: 'dk', line: 25.5, over: -110, under: -110 },
      { sbId: 'fd', line: 26.5, over: +110, under: -130 },
      { sbId: 'mgm', line: 25.5, over: -115, under: -105 },
      { sbId: 'czr', line: 25.5, over: -105, under: -115 },
    ],
  },
  {
    playerId: 'p5', statType: '3-Pointers', opponent: 'HOU',
    lines: [
      { sbId: 'dk', line: 3.5, over: +120, under: -140 },
      { sbId: 'fd', line: 3.5, over: +130, under: -155 },
      { sbId: 'mgm', line: 3.5, over: +115, under: -135 },
    ],
  },
  {
    playerId: 'p6', statType: 'Passing Yards', opponent: 'DET',
    lines: [
      { sbId: 'dk', line: 275.5, over: -110, under: -110 },
      { sbId: 'fd', line: 279.5, over: -105, under: -115 },
      { sbId: 'mgm', line: 274.5, over: -115, under: -105 },
      { sbId: 'czr', line: 277.5, over: -110, under: -110 },
    ],
  },
  {
    playerId: 'p6', statType: 'Touchdowns', opponent: 'DET',
    lines: [
      { sbId: 'dk', line: 2.5, over: +100, under: -120 },
      { sbId: 'fd', line: 2.5, over: -105, under: -115 },
      { sbId: 'mgm', line: 2.5, over: +110, under: -130 },
    ],
  },
  {
    playerId: 'p7', statType: 'Passing Yards', opponent: 'MIA',
    lines: [
      { sbId: 'dk', line: 260.5, over: -110, under: -110 },
      { sbId: 'fd', line: 263.5, over: +100, under: -120 },
      { sbId: 'czr', line: 258.5, over: -120, under: +100 },
    ],
  },
  {
    playerId: 'p7', statType: 'Rushing Yards', opponent: 'MIA',
    lines: [
      { sbId: 'dk', line: 42.5, over: -115, under: -105 },
      { sbId: 'fd', line: 44.5, over: +110, under: -130 },
      { sbId: 'mgm', line: 41.5, over: -120, under: +100 },
    ],
  },
  {
    playerId: 'p8', statType: 'Hits', opponent: 'NYY',
    lines: [
      { sbId: 'dk', line: 1.5, over: -130, under: +110 },
      { sbId: 'fd', line: 1.5, over: -125, under: +105 },
      { sbId: 'mgm', line: 1.5, over: -135, under: +115 },
    ],
  },
  {
    playerId: 'p9', statType: 'Points', opponent: 'TOR',
    lines: [
      { sbId: 'dk', line: 1.5, over: -140, under: +120 },
      { sbId: 'fd', line: 1.5, over: -135, under: +115 },
      { sbId: 'czr', line: 1.5, over: -150, under: +130 },
    ],
  },
  {
    playerId: 'p9', statType: 'Assists', opponent: 'TOR',
    lines: [
      { sbId: 'dk', line: 2.5, over: +105, under: -125 },
      { sbId: 'fd', line: 2.5, over: +110, under: -130 },
    ],
  },
  {
    playerId: 'p10', statType: 'Points', opponent: 'CHI',
    lines: [
      { sbId: 'dk', line: 19.5, over: -110, under: -110 },
      { sbId: 'fd', line: 20.5, over: +105, under: -125 },
      { sbId: 'pp', line: 21.5, over: -110, under: -110 },
    ],
  },
  {
    playerId: 'p10', statType: 'Assists', opponent: 'CHI',
    lines: [
      { sbId: 'dk', line: 8.5, over: -105, under: -115 },
      { sbId: 'fd', line: 8.5, over: +100, under: -120 },
      { sbId: 'pp', line: 9.5, over: +120, under: -140 },
    ],
  },
];

function getSportsbook(id: string): Sportsbook {
  return sportsbooks.find(s => s.id === id)!;
}

function getPlayer(id: string): Player {
  return players.find(p => p.id === id)!;
}

// Build EV calculations from mock prop definitions
export function generateMockEVCalculations(): EVCalculation[] {
  return propDefs.map((def, idx) => {
    const player = getPlayer(def.playerId);
    const prop: PlayerProp = {
      id: `prop-${idx}`,
      player_id: def.playerId,
      player,
      stat_type: def.statType as any,
      game_date: '2026-02-17',
      opponent: def.opponent,
    };

    const allOdds: OddsSnapshot[] = def.lines.map((l, i) => ({
      id: `odds-${idx}-${i}`,
      prop_id: prop.id,
      sportsbook_id: l.sbId,
      sportsbook: getSportsbook(l.sbId),
      line: l.line,
      over_odds: l.over,
      under_odds: l.under,
      timestamp: new Date().toISOString(),
    }));

    const marketOdds = def.lines.map(l => ({
      overOdds: l.over,
      underOdds: l.under,
      line: l.line,
    }));

    const { consensusProb, consensusLine } = calculateMarketConsensus(marketOdds);

    // Find the best +EV opportunity (check both over and under for each book)
    let bestEV = -Infinity;
    let bestBook = allOdds[0];
    let bestDirection: 'Over' | 'Under' = 'Over';
    let bestTrueProb = consensusProb;
    let bestOdds = allOdds[0].over_odds;

    for (const snap of allOdds) {
      // Check over
      const overEV = calculateEV(consensusProb, snap.over_odds);
      if (overEV > bestEV) {
        bestEV = overEV;
        bestBook = snap;
        bestDirection = 'Over';
        bestTrueProb = consensusProb;
        bestOdds = snap.over_odds;
      }

      // Check under
      const underProb = 1 - consensusProb;
      const underEV = calculateEV(underProb, snap.under_odds);
      if (underEV > bestEV) {
        bestEV = underEV;
        bestBook = snap;
        bestDirection = 'Under';
        bestTrueProb = underProb;
        bestOdds = snap.under_odds;
      }
    }

    const edgePct = calculateEdge(bestTrueProb, bestOdds);
    const confidence = calculateConfidence(marketOdds, bestEV);

    return {
      id: `ev-${idx}`,
      prop_id: prop.id,
      player_prop: prop,
      best_sportsbook: bestBook.sportsbook,
      best_line: bestBook.line,
      best_odds: bestOdds,
      market_consensus_line: consensusLine,
      market_consensus_prob: consensusProb,
      implied_prob: 0,
      true_prob: bestTrueProb,
      edge_pct: edgePct,
      ev_pct: bestEV,
      confidence_score: confidence,
      direction: bestDirection,
      all_odds: allOdds,
    } satisfies EVCalculation;
  });
}

// Generate mock historical data for a player
export function generateMockHistorical(playerId: string, statType: string): HistoricalDataPoint[] {
  const points: HistoricalDataPoint[] = [];
  const baseValue = statType === 'Points' ? 25 : statType === 'Passing Yards' ? 270 : 8;
  const baseLine = baseValue + 1;

  for (let i = 9; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - (i * 3 + Math.floor(Math.random() * 2)));
    const variance = (Math.random() - 0.5) * baseValue * 0.4;
    points.push({
      date: date.toISOString().split('T')[0],
      value: Math.round((baseValue + variance) * 10) / 10,
      line: baseLine,
    });
  }
  return points;
}
