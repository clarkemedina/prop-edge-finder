/**
 * Expected Value (EV) Calculator
 * 
 * Core mathematical engine for calculating betting edges and expected value.
 * All functions use industry-standard formulas for sports betting analysis.
 */

export interface EVResult {
  trueProbability: number;
  edgePercent: number;
  expectedValue: number;
  rating: 'Strong' | 'Moderate' | 'Low';
}

/**
 * Converts American odds to implied probability
 * 
 * Formula:
 * - For positive odds (+150): probability = 100 / (odds + 100)
 * - For negative odds (-150): probability = |odds| / (|odds| + 100)
 * 
 * @param odds - American odds format (e.g., -110, +150)
 * @returns Implied probability as decimal (0 to 1)
 * 
 * @example
 * convertAmericanToProbability(-110) // Returns ~0.5238 (52.38%)
 * convertAmericanToProbability(+150) // Returns 0.4 (40%)
 */
export function convertAmericanToProbability(odds: number): number {
  if (odds === 0) {
    throw new Error('Odds cannot be zero');
  }

  if (odds > 0) {
    // Positive odds (underdog)
    // Example: +150 → 100 / (150 + 100) = 100/250 = 0.40 (40%)
    return 100 / (odds + 100);
  } else {
    // Negative odds (favorite)
    // Example: -110 → 110 / (110 + 100) = 110/210 = 0.5238 (52.38%)
    const positiveOdds = Math.abs(odds);
    return positiveOdds / (positiveOdds + 100);
  }
}

/**
 * Removes vigorish (vig/juice) from over/under probabilities to find true probabilities
 * 
 * Sportsbooks build in a profit margin (vig). For a fair market, probabilities should
 * sum to 1.0 (100%). When they sum to more (e.g., 1.05 or 105%), that excess is the vig.
 * 
 * Formula:
 * True probability = Implied probability / Total implied probability
 * 
 * @param overProb - Implied probability of the over
 * @param underProb - Implied probability of the under
 * @returns Object with devigged probabilities
 * 
 * @example
 * // Both sides at -110 (52.38% each, total = 104.76%)
 * removeVig(0.5238, 0.5238)
 * // Returns: { over: 0.50, under: 0.50, vigPercent: 4.76 }
 */
export function removeVig(
  overProb: number,
  underProb: number
): {
  over: number;
  under: number;
  vigPercent: number;
} {
  // Total implied probability (should be > 1.0 due to vig)
  const total = overProb + underProb;
  
  if (total === 0) {
    throw new Error('Total probability cannot be zero');
  }

  // Calculate vig as percentage
  const vigPercent = (total - 1) * 100;

  // Remove vig by normalizing to 100%
  const devigged = {
    over: overProb / total,
    under: underProb / total,
    vigPercent,
  };

  return devigged;
}

/**
 * Calculates market consensus probability from multiple sportsbooks
 * 
 * Uses the Pinnacle method: average the devigged probabilities across all books.
 * This is considered the most efficient market price.
 * 
 * Steps:
 * 1. Convert all odds to implied probabilities
 * 2. Remove vig from each book
 * 3. Average the devigged probabilities
 * 
 * @param props - Array of normalized props for the same player/stat/line
 * @returns Market consensus probability for over and under
 * 
 * @example
 * const props = [
 *   { sportsbook: 'FanDuel', overOdds: -110, underOdds: -110 },
 *   { sportsbook: 'DraftKings', overOdds: -105, underOdds: -115 },
 *   { sportsbook: 'BetMGM', overOdds: -112, underOdds: -108 }
 * ];
 * calculateMarketConsensus(props)
 * // Returns: { over: 0.505, under: 0.495, confidence: 0.85, sampleSize: 3 }
 */
export function calculateMarketConsensus(
  props: Array<{ overOdds: number; underOdds: number; sportsbook: string }>
): {
  over: number;
  under: number;
  confidence: number;
  sampleSize: number;
} {
  if (props.length === 0) {
    throw new Error('No props provided for consensus calculation');
  }

  let totalOverProb = 0;
  let totalUnderProb = 0;

  // Remove vig from each sportsbook and accumulate
  for (const prop of props) {
    const overImplied = convertAmericanToProbability(prop.overOdds);
    const underImplied = convertAmericanToProbability(prop.underOdds);
    
    const devigged = removeVig(overImplied, underImplied);
    
    totalOverProb += devigged.over;
    totalUnderProb += devigged.under;
  }

  // Calculate average (consensus)
  const consensusOver = totalOverProb / props.length;
  const consensusUnder = totalUnderProb / props.length;

  // Confidence score based on sample size and agreement
  // More books = higher confidence, up to a maximum of 0.95
  const confidence = Math.min(0.95, 0.5 + (props.length * 0.1));

  return {
    over: consensusOver,
    under: consensusUnder,
    confidence,
    sampleSize: props.length,
  };
}

/**
 * Calculates Expected Value (EV) for a bet
 * 
 * EV is the average amount you expect to win/lose per dollar wagered over many bets.
 * 
 * Formula:
 * EV = (True Win Probability × Payout) - (True Loss Probability × Stake)
 * 
 * Where:
 * - Payout = stake × (1 + decimal odds - 1) = stake × decimal odds
 * - For a $100 bet at -110: payout = $100 × 1.909 = $190.90 (win $90.90)
 * 
 * Edge % = (True Probability / Implied Probability) - 1
 * 
 * @param trueProbability - The actual probability (from market consensus or model)
 * @param bookOdds - The odds being offered (American format)
 * @param stake - Amount wagered (default $100 for percentage calculation)
 * @returns EV result with rating
 * 
 * @example
 * // Book offers -110, but true probability is 55%
 * calculateEV(0.55, -110)
 * // Returns: {
 * //   trueProbability: 0.55,
 * //   edgePercent: 5.0,
 * //   expectedValue: 5.00,
 * //   rating: 'Moderate'
 * // }
 */
export function calculateEV(
  trueProbability: number,
  bookOdds: number,
  stake: number = 100
): EVResult {
  if (trueProbability < 0 || trueProbability > 1) {
    throw new Error('True probability must be between 0 and 1');
  }

  // Convert book odds to implied probability
  const impliedProbability = convertAmericanToProbability(bookOdds);

  // Calculate decimal odds
  const decimalOdds = bookOdds > 0 
    ? (bookOdds / 100) + 1 
    : (100 / Math.abs(bookOdds)) + 1;

  // Calculate payout if we win (includes stake returned)
  const payout = stake * decimalOdds;

  // Calculate expected value
  // EV = (Win Prob × Win Amount) - (Lose Prob × Lose Amount)
  const winAmount = payout - stake; // Profit if we win
  const loseAmount = stake; // Loss if we lose
  const loseProbability = 1 - trueProbability;

  const expectedValue = (trueProbability * winAmount) - (loseProbability * loseAmount);

  // Calculate edge as percentage
  const edgePercent = ((trueProbability / impliedProbability) - 1) * 100;

  // Determine rating based on edge
  let rating: 'Strong' | 'Moderate' | 'Low';
  if (edgePercent >= 5) {
    rating = 'Strong';
  } else if (edgePercent >= 2) {
    rating = 'Moderate';
  } else {
    rating = 'Low';
  }

  return {
    trueProbability,
    edgePercent,
    expectedValue,
    rating,
  };
}

/**
 * Converts probability back to American odds
 * Useful for displaying fair odds or calculating theoretical lines
 * 
 * @param probability - Decimal probability (0 to 1)
 * @returns American odds format
 * 
 * @example
 * convertProbabilityToAmerican(0.55) // Returns -122
 * convertProbabilityToAmerican(0.40) // Returns +150
 */
export function convertProbabilityToAmerican(probability: number): number {
  if (probability <= 0 || probability >= 1) {
    throw new Error('Probability must be between 0 and 1 (exclusive)');
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
 * Calculates breakeven win rate needed for given odds
 * 
 * @param americanOdds - American odds format
 * @returns Breakeven probability as percentage
 * 
 * @example
 * calculateBreakeven(-110) // Returns 52.38%
 */
export function calculateBreakeven(americanOdds: number): number {
  return convertAmericanToProbability(americanOdds) * 100;
}

/**
 * Calculates Kelly Criterion for optimal bet sizing
 * 
 * Formula: f = (bp - q) / b
 * Where:
 * - f = fraction of bankroll to bet
 * - b = decimal odds - 1
 * - p = true probability of winning
 * - q = probability of losing (1 - p)
 * 
 * @param trueProbability - True probability of winning
 * @param americanOdds - Offered odds
 * @returns Recommended bet size as fraction of bankroll (0 to 1)
 * 
 * @example
 * calculateKelly(0.55, -110) // Returns ~0.024 (bet 2.4% of bankroll)
 */
export function calculateKelly(
  trueProbability: number,
  americanOdds: number
): number {
  const decimalOdds = americanOdds > 0 
    ? (americanOdds / 100) + 1 
    : (100 / Math.abs(americanOdds)) + 1;

  const b = decimalOdds - 1;
  const p = trueProbability;
  const q = 1 - p;

  const kelly = (b * p - q) / b;

  // Return 0 if kelly is negative (no edge)
  return Math.max(0, kelly);
}

/**
 * Helper function to calculate EV across multiple scenarios
 * Useful for comparing different lines or sportsbooks
 * 
 * @param trueProbability - Market consensus or model probability
 * @param scenarios - Array of { sportsbook, odds } objects
 * @returns Array of EV results sorted by EV descending
 */
export function calculateMultipleEVs(
  trueProbability: number,
  scenarios: Array<{ sportsbook: string; odds: number }>
): Array<EVResult & { sportsbook: string }> {
  const results = scenarios.map(scenario => ({
    sportsbook: scenario.sportsbook,
    ...calculateEV(trueProbability, scenario.odds),
  }));

  // Sort by EV descending
  return results.sort((a, b) => b.expectedValue - a.expectedValue);
}
