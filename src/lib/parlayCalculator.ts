/**
 * Parlay Probability Calculator
 * 
 * Calculates combined probabilities for parlays and detects correlation risks.
 * 
 * IMPORTANT: This assumes independent events. Correlated props (same game, same player)
 * will have inflated probability estimates and should be flagged.
 */

export interface ParlayLeg {
  playerId: string;
  playerName: string;
  sport: string;
  statType: string;
  probability: number;
  gameId?: string;
  gameDate?: string;
  team?: string;
}

export interface ParlayCalculation {
  combinedProbability: number;
  combinedProbabilityPercent: number;
  fairOdds: number;
  expectedLegs: number;
  correlationRisk: CorrelationRisk;
  warnings: string[];
}

export interface CorrelationRisk {
  level: 'None' | 'Low' | 'Medium' | 'High' | 'Severe';
  description: string;
  affectedLegs: number;
}

/**
 * Calculates combined probability for independent events
 * 
 * For independent events, combined probability = P(A) × P(B) × P(C) × ...
 * 
 * @param probabilities - Array of individual probabilities (0 to 1)
 * @returns Combined probability
 * 
 * @example
 * calculateParlayProbability([0.6, 0.55, 0.5])
 * // Returns 0.165 (16.5% chance all three hit)
 */
export function calculateParlayProbability(probabilities: number[]): number {
  if (probabilities.length === 0) {
    throw new Error('Cannot calculate parlay with no legs');
  }

  // Validate all probabilities are between 0 and 1
  for (const prob of probabilities) {
    if (prob < 0 || prob > 1) {
      throw new Error(`Invalid probability: ${prob}. Must be between 0 and 1.`);
    }
  }

  // Multiply all probabilities together
  return probabilities.reduce((acc, prob) => acc * prob, 1);
}

/**
 * Detects correlation risk in parlay legs
 * 
 * Correlation examples:
 * - Same player, different stats (Points + Rebounds for same player)
 * - Same game, different players (if one team dominates, both props more likely)
 * - Related stats (Points and FG% tend to correlate)
 * 
 * @param legs - Array of parlay legs with player/game metadata
 * @returns Correlation risk assessment
 */
export function detectCorrelationRisk(legs: ParlayLeg[]): CorrelationRisk {
  if (legs.length <= 1) {
    return {
      level: 'None',
      description: 'Single leg parlay has no correlation risk',
      affectedLegs: 0,
    };
  }

  const playerIds = legs.map(leg => leg.playerId);
  const gameIds = legs.map(leg => leg.gameId).filter(Boolean);
  const teams = legs.map(leg => leg.team).filter(Boolean);

  // Count duplicates
  const uniquePlayers = new Set(playerIds).size;
  const uniqueGames = new Set(gameIds).size;
  const samePlayerLegs = playerIds.length - uniquePlayers;
  const sameGameLegs = gameIds.length > 0 ? gameIds.length - uniqueGames : 0;

  // SEVERE: Multiple props for the same player
  if (samePlayerLegs > 0) {
    return {
      level: 'Severe',
      description: `${samePlayerLegs + 1} legs involve the same player. These stats are highly correlated (e.g., if player scores points, they likely also get rebounds/assists). True probability is lower than calculated.`,
      affectedLegs: samePlayerLegs + 1,
    };
  }

  // HIGH: Multiple props in the same game
  if (sameGameLegs >= 2) {
    return {
      level: 'High',
      description: `${sameGameLegs + 1} legs are from the same game. Game flow affects all props (blowout, overtime, pace). True probability is lower than calculated.`,
      affectedLegs: sameGameLegs + 1,
    };
  }

  // MEDIUM: Props from same team
  const teamCounts = teams.reduce((acc, team) => {
    acc[team] = (acc[team] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const maxSameTeam = Math.max(...Object.values(teamCounts), 0);
  if (maxSameTeam >= 2) {
    return {
      level: 'Medium',
      description: `${maxSameTeam} legs involve players from the same team. Team performance affects all props.`,
      affectedLegs: maxSameTeam,
    };
  }

  // LOW: Check for correlated stat types
  const correlatedStats = detectCorrelatedStats(legs);
  if (correlatedStats.length > 0) {
    return {
      level: 'Low',
      description: `Some stat types may be correlated: ${correlatedStats.join(', ')}`,
      affectedLegs: correlatedStats.length,
    };
  }

  return {
    level: 'None',
    description: 'Legs appear to be independent',
    affectedLegs: 0,
  };
}

/**
 * Detects correlated stat types across legs
 */
function detectCorrelatedStats(legs: ParlayLeg[]): string[] {
  const correlated: string[] = [];
  
  // Known correlations in basketball
  const hasPoints = legs.some(leg => leg.statType === 'Points');
  const hasAssists = legs.some(leg => leg.statType === 'Assists');
  const hasRebounds = legs.some(leg => leg.statType === 'Rebounds');
  const hasPRA = legs.some(leg => leg.statType === 'PRA');

  if (hasPRA && (hasPoints || hasAssists || hasRebounds)) {
    correlated.push('PRA overlaps with Points/Rebounds/Assists');
  }

  // Football correlations
  const hasPassingYards = legs.some(leg => leg.statType === 'Passing Yards');
  const hasTouchdowns = legs.some(leg => leg.statType === 'Touchdowns');

  if (hasPassingYards && hasTouchdowns) {
    correlated.push('Passing Yards and Touchdowns are correlated');
  }

  return correlated;
}

/**
 * Full parlay calculation with all metadata
 * 
 * @param legs - Array of parlay legs
 * @returns Complete parlay calculation with warnings
 */
export function calculateFullParlay(legs: ParlayLeg[]): ParlayCalculation {
  const probabilities = legs.map(leg => leg.probability);
  const combinedProbability = calculateParlayProbability(probabilities);
  const correlationRisk = detectCorrelationRisk(legs);

  // Convert to percentage
  const combinedProbabilityPercent = combinedProbability * 100;

  // Calculate fair odds (no vig)
  const fairOdds = convertProbabilityToFairOdds(combinedProbability);

  // Expected number of legs to hit (for partial parlay scenarios)
  const expectedLegs = probabilities.reduce((sum, p) => sum + p, 0);

  // Generate warnings
  const warnings: string[] = [];

  if (correlationRisk.level === 'Severe' || correlationRisk.level === 'High') {
    warnings.push(`⚠️ ${correlationRisk.description}`);
    warnings.push('⚠️ Actual probability is likely significantly lower than calculated.');
  }

  if (legs.length >= 5) {
    warnings.push('⚠️ Parlays with 5+ legs have exponentially lower hit rates.');
  }

  if (combinedProbability < 0.05) {
    warnings.push(`⚠️ This parlay has only a ${combinedProbabilityPercent.toFixed(2)}% chance of hitting.`);
  }

  // Check if any individual leg has very low probability
  const lowestProb = Math.min(...probabilities);
  if (lowestProb < 0.3) {
    warnings.push('⚠️ One or more legs have less than 30% chance of hitting.');
  }

  return {
    combinedProbability,
    combinedProbabilityPercent,
    fairOdds,
    expectedLegs,
    correlationRisk,
    warnings,
  };
}

/**
 * Converts probability to fair odds (American format)
 * 
 * @param probability - Decimal probability (0 to 1)
 * @returns American odds with no vig
 */
function convertProbabilityToFairOdds(probability: number): number {
  if (probability <= 0 || probability >= 1) {
    throw new Error('Probability must be between 0 and 1');
  }

  if (probability >= 0.5) {
    // Favorite (negative odds)
    return Math.round(-100 * probability / (1 - probability));
  } else {
    // Underdog (positive odds)
    return Math.round(100 * (1 - probability) / probability);
  }
}

/**
 * Calculates EV for a parlay given book odds
 * 
 * @param combinedProbability - True combined probability
 * @param bookOdds - Odds being offered by sportsbook
 * @param stake - Amount wagered
 * @returns Expected value
 */
export function calculateParlayEV(
  combinedProbability: number,
  bookOdds: number,
  stake: number = 100
): {
  expectedValue: number;
  roi: number;
  fairOdds: number;
  edgePercent: number;
} {
  // Convert book odds to decimal
  const decimalOdds = bookOdds > 0 
    ? (bookOdds / 100) + 1 
    : (100 / Math.abs(bookOdds)) + 1;

  // Calculate payout if we win
  const payout = stake * decimalOdds;
  const profit = payout - stake;

  // Calculate EV
  const expectedValue = (combinedProbability * profit) - ((1 - combinedProbability) * stake);

  // ROI as percentage
  const roi = (expectedValue / stake) * 100;

  // Fair odds with no vig
  const fairOdds = convertProbabilityToFairOdds(combinedProbability);

  // Calculate book's implied probability
  const bookImpliedProb = bookOdds > 0 
    ? 100 / (bookOdds + 100)
    : Math.abs(bookOdds) / (Math.abs(bookOdds) + 100);

  // Edge percentage
  const edgePercent = ((combinedProbability / bookImpliedProb) - 1) * 100;

  return {
    expectedValue,
    roi,
    fairOdds,
    edgePercent,
  };
}

/**
 * Simulates parlay outcomes using Monte Carlo method
 * Useful for understanding variance
 * 
 * @param legs - Parlay legs with probabilities
 * @param simulations - Number of simulations to run (default 10,000)
 * @returns Simulation results
 */
export function simulateParlayOutcomes(
  legs: ParlayLeg[],
  simulations: number = 10000
): {
  hitRate: number;
  avgLegsHit: number;
  distribution: Record<number, number>;
} {
  const probabilities = legs.map(leg => leg.probability);
  let hits = 0;
  let totalLegsHit = 0;
  const distribution: Record<number, number> = {};

  // Initialize distribution
  for (let i = 0; i <= probabilities.length; i++) {
    distribution[i] = 0;
  }

  // Run simulations
  for (let i = 0; i < simulations; i++) {
    let legsHit = 0;
    let parlayHit = true;

    for (const prob of probabilities) {
      const random = Math.random();
      if (random < prob) {
        legsHit++;
      } else {
        parlayHit = false;
      }
    }

    if (parlayHit) hits++;
    totalLegsHit += legsHit;
    distribution[legsHit]++;
  }

  return {
    hitRate: hits / simulations,
    avgLegsHit: totalLegsHit / simulations,
    distribution,
  };
}
