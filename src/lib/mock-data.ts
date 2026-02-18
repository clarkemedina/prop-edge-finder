/**
 * Mock Historical Data Generator
 * Used ONLY for modal chart display
 */

export interface HistoricalDataPoint {
  date: string;
  value: number;
  line: number;
}

export function generateMockHistorical(
  playerId: string,
  statType: string
): HistoricalDataPoint[] {

  const today = new Date();
  const data: HistoricalDataPoint[] = [];

  for (let i = 10; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);

    data.push({
      date: d.toISOString().slice(0, 10),
      value: Math.random() * 30 + 10, // random performance
      line: Math.random() * 5 + 20,   // random line
    });
  }

  return data;
}
