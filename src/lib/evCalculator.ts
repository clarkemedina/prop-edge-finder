/**
 * Central EV Engine
 * This is now the ONLY EV + formatting file in the app.
 */

export interface EVResult {
  trueProbability: number;
  edgePercent: number;
  expectedValue: number;
  rating: 'Strong' | 'Moderate' | 'Low';
}

// --------------------
// Probability Helpers
// --------------------

export function convertAmericanToProbability(odds: number): number {
  if (odds === 0) throw new Error('Odds cannot be zero');

  if (odds > 0) {
    return 100 / (odds + 100);
  } else {
    const positiveOdds = Math.abs(odds);
    return positiveOdds / (positiveOdds + 100);
  }
}

export function convertAmericanToDecimal(odds: number): number {
  return odds > 0
    ? odds / 100 + 1
    : 100 / Math.abs(odds) + 1;
}

// --------------------
// Vig Removal
// --------------------

export function removeVig(
  overImplied: number,
  underImplied: number
): {
  over: number;
  under: number;
  vigPercent: number;
} {
  const total = overImplied + underImplied;
  if (total === 0) throw new Error('Invalid probabilities');

  return {
    over: overImplied / total,
    under: underImplied / total,
    vigPercent: (total - 1) * 100,
  };
}

// --------------------
// Market Consensus
// --------------------

export function calculateMarketConsensus(
  props: Array<{ sportsbook: string; overOdds: number; underOdds: number }>
): {
  over: number;
  under: number;
  confidence: number;
  sampleSize: number;
} {
  if (props.length === 0) {
    throw new Error('No books for consensus');
  }

  let totalOver = 0;
  let totalUnder = 0;

  for (const prop of props) {
    const overImplied = convertAmericanToProbability(prop.overOdds);
    const underImplied = convertAmericanToProbability(prop.underOdds);

    const devigged = removeVig(overImplied, underImplied);

    totalOver += devigged.over;
    totalUnder += devigged.under;
  }

  const consensusOver = totalOver / props.length;
  const consensusUnder = totalUnder / props.length;

  const confidence = Math.min(0.95, 0.5 + props.length * 0.1);

  return {
    over: consensusOver,
    under: consensusUnder,
    confidence,
    sampleSize: props.length,
  };
}

// --------------------
// EV Calculation
// --------------------

export function calculateEV(
  trueProbability: number,
  bookOdds: number,
  stake: number = 100
): EVResult {
  if (trueProbability <= 0 || trueProbability >= 1) {
    throw new Error('True probability must be between 0 and 1');
  }

  const implied = convertAmericanToProbability(bookOdds);
  const decimal = convertAmericanToDecimal(bookOdds);

  const payout = stake * decimal;
  const winAmount = payout - stake;
  const loseAmount = stake;
  const loseProbability = 1 - trueProbability;

  const expectedValue =
    trueProbability * winAmount - loseProbability * loseAmount;

  const edgePercent =
    ((trueProbability / implied) - 1) * 100;

  let rating: 'Strong' | 'Moderate' | 'Low';

  if (edgePercent >= 5) rating = 'Strong';
  else if (edgePercent >= 2) rating = 'Moderate';
  else rating = 'Low';

  return {
    trueProbability,
    edgePercent,
    expectedValue,
    rating,
  };
}

// --------------------
// Formatting Helpers
// --------------------

export function formatOdds(american: number): string {
  return american > 0 ? `+${american}` : `${american}`;
}

export function formatProbability(prob: number): string {
  return `${(prob * 100).toFixed(1)}%`;
}

export function formatEV(ev: number): string {
  const sign = ev >= 0 ? '+' : '';
  return `${sign}${ev.toFixed(1)}%`;
}
// --------------------
// Parlay Helpers
// --------------------

export function calculateParlayProbability(probabilities: number[]): number {
  return probabilities.reduce((acc, p) => acc * p, 1);
}

export function calculateParlayPayout(americanOddsList: number[]): number {
  return americanOddsList.reduce(
    (acc, odds) => acc * convertAmericanToDecimal(odds),
    1
  );
}

export function getParlayRiskLevel(
  numLegs: number,
  combinedProb: number
): 'Low' | 'Medium' | 'High' | 'Very High' {
  if (numLegs <= 2 && combinedProb > 0.4) return 'Low';
  if (numLegs <= 3 && combinedProb > 0.25) return 'Medium';
  if (numLegs <= 4 && combinedProb > 0.1) return 'High';
  return 'Very High';
}
