/**
 * EV Calculation Utilities
 * 
 * Core math for converting odds, removing vig, and calculating expected value.
 * All functions are pure and modular for easy testing and future upgrades.
 */

/**
 * Convert American odds to decimal odds.
 * +150 → 2.50, -200 → 1.50
 */
export function americanToDecimal(american: number): number {
  if (american > 0) {
    return (american / 100) + 1;
  }
  return (100 / Math.abs(american)) + 1;
}

/**
 * Convert American odds to implied probability (0-1).
 * Includes vig — not the "true" probability.
 */
export function americanToImpliedProbability(american: number): number {
  if (american > 0) {
    return 100 / (american + 100);
  }
  return Math.abs(american) / (Math.abs(american) + 100);
}

/**
 * Remove vig from a two-way market (over/under).
 * Returns the no-vig probability for the "over" side.
 */
export function removeVig(overOdds: number, underOdds: number): { overProb: number; underProb: number } {
  const overImplied = americanToImpliedProbability(overOdds);
  const underImplied = americanToImpliedProbability(underOdds);
  const total = overImplied + underImplied;

  return {
    overProb: overImplied / total,
    underProb: underImplied / total,
  };
}

/**
 * Calculate market consensus probability from multiple sportsbook odds.
 * Averages the no-vig probabilities across all books.
 */
export function calculateMarketConsensus(
  odds: Array<{ overOdds: number; underOdds: number; line: number }>
): { consensusProb: number; consensusLine: number } {
  if (odds.length === 0) return { consensusProb: 0.5, consensusLine: 0 };

  let totalProb = 0;
  let totalLine = 0;

  for (const o of odds) {
    const { overProb } = removeVig(o.overOdds, o.underOdds);
    totalProb += overProb;
    totalLine += o.line;
  }

  return {
    consensusProb: totalProb / odds.length,
    consensusLine: totalLine / odds.length,
  };
}

/**
 * Calculate Expected Value percentage.
 * 
 * EV% = (trueProbability * decimalOdds - 1) * 100
 * 
 * Positive EV% means the bet has a theoretical edge over the market.
 */
export function calculateEV(trueProbability: number, americanOdds: number): number {
  const decimal = americanToDecimal(americanOdds);
  return (trueProbability * decimal - 1) * 100;
}

/**
 * Calculate edge: difference between true probability and implied probability.
 */
export function calculateEdge(trueProbability: number, americanOdds: number): number {
  const implied = americanToImpliedProbability(americanOdds);
  return (trueProbability - implied) * 100;
}

/**
 * Calculate confidence score (0-100) based on:
 * - Number of sportsbooks (more = higher confidence)
 * - Agreement between books (lower variance = higher)
 * - Edge magnitude
 */
export function calculateConfidence(
  odds: Array<{ overOdds: number; underOdds: number; line: number }>,
  evPct: number
): number {
  if (odds.length === 0) return 0;

  // Book count factor (max at 5+ books)
  const bookFactor = Math.min(odds.length / 5, 1) * 30;

  // Line agreement factor
  const lines = odds.map(o => o.line);
  const avgLine = lines.reduce((a, b) => a + b, 0) / lines.length;
  const variance = lines.reduce((sum, l) => sum + Math.pow(l - avgLine, 2), 0) / lines.length;
  const agreementFactor = Math.max(0, 30 - variance * 10);

  // Edge magnitude factor
  const edgeFactor = Math.min(Math.abs(evPct) * 4, 40);

  return Math.round(Math.min(bookFactor + agreementFactor + edgeFactor, 100));
}

/**
 * Calculate combined probability for a parlay (independent events).
 */
export function calculateParlayProbability(probabilities: number[]): number {
  return probabilities.reduce((acc, p) => acc * p, 1);
}

/**
 * Estimate parlay payout multiplier from combined decimal odds.
 */
export function calculateParlayPayout(americanOddsList: number[]): number {
  return americanOddsList.reduce((acc, odds) => acc * americanToDecimal(odds), 1);
}

/**
 * Determine risk level based on number of legs and combined probability.
 */
export function getParlayRiskLevel(
  numLegs: number,
  combinedProb: number
): 'Low' | 'Medium' | 'High' | 'Very High' {
  if (numLegs <= 2 && combinedProb > 0.4) return 'Low';
  if (numLegs <= 3 && combinedProb > 0.25) return 'Medium';
  if (numLegs <= 4 && combinedProb > 0.1) return 'High';
  return 'Very High';
}

/**
 * Format American odds for display: +150, -200
 */
export function formatOdds(american: number): string {
  return american > 0 ? `+${american}` : `${american}`;
}

/**
 * Format probability as percentage: 0.523 → "52.3%"
 */
export function formatProbability(prob: number): string {
  return `${(prob * 100).toFixed(1)}%`;
}

/**
 * Format EV percentage: 5.23 → "+5.2%"
 */
export function formatEV(ev: number): string {
  const sign = ev >= 0 ? '+' : '';
  return `${sign}${ev.toFixed(1)}%`;
}
