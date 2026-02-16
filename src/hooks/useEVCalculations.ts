import { useQuery } from '@tanstack/react-query';
import { evService } from '@/services/evService';
import { EVCalculation, Sport, StatType } from '@/types';

interface UseEVCalculationsOptions {
  sport?: Sport | 'All';
  statType?: StatType | 'All';
  minEV?: number;
  enabled?: boolean;
}

/**
 * React Query hook to fetch and calculate EV for all props
 * 
 * @param options - Filter options for EV calculations
 * @returns React Query result with EV calculations
 * 
 * @example
 * const { data, isLoading, error } = useEVCalculations({
 *   sport: 'NBA',
 *   minEV: 2,
 * });
 */
export function useEVCalculations(options: UseEVCalculationsOptions = {}) {
  return useQuery({
    queryKey: ['ev-calculations', options],
    queryFn: async () => {
      const filters: any = {};
      
      // Apply sport filter
      if (options.sport && options.sport !== 'All') {
        filters.sport = options.sport;
      }
      
      // Apply minimum EV filter
      if (options.minEV) {
        filters.minEV = options.minEV;
      }

      // Fetch EV calculations from service
      const evs = await evService.calculateAllEVs(filters);

      // Client-side filter for stat type (not in database)
      if (options.statType && options.statType !== 'All') {
        return evs.filter(ev => ev.player_prop.stat_type === options.statType);
      }

      return evs;
    },
    // Refetch every 30 seconds for live odds
    refetchInterval: 30000,
    // Consider data stale after 10 seconds
    staleTime: 10000,
    // Retry failed requests
    retry: 3,
    // Enable/disable query
    enabled: options.enabled !== false,
  });
}

/**
 * Hook to fetch EV calculations for a specific player prop
 * 
 * @param playerId - Player ID
 * @param statType - Stat type (e.g., 'Points', 'Rebounds')
 * @param line - Prop line (e.g., 25.5)
 * @returns React Query result with EV calculations for this prop
 */
export function usePropEV(
  playerId: string,
  statType: string,
  line: number,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['prop-ev', playerId, statType, line],
    queryFn: () => evService.calculatePropEV(playerId, statType, line),
    refetchInterval: 30000,
    staleTime: 10000,
    enabled: options?.enabled !== false && !!playerId && !!statType && !!line,
  });
}

/**
 * Hook to get the best EV opportunity from a list
 * Useful for highlighting the top bet
 */
export function useBestEV(options: UseEVCalculationsOptions = {}) {
  const { data, ...rest } = useEVCalculations(options);

  const bestEV = data && data.length > 0 ? data[0] : null;

  return {
    bestEV,
    ...rest,
  };
}
