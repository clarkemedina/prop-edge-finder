import { useQuery } from '@tanstack/react-query';
import { evService } from '@/services/evService';
import { Sport, StatType } from '@/types';

interface UseEVCalculationsOptions {
  sport?: Sport | 'All';
  statType?: StatType | 'All';
  minEV?: number;
  enabled?: boolean;
}

export function useEVCalculations(options: UseEVCalculationsOptions = {}) {
  return useQuery({
    queryKey: [
      'ev-calculations',
      options.sport ?? 'All',
      options.statType ?? 'All',
      options.minEV ?? 0,
    ],

    queryFn: async () => {
      const filters: any = {};

      if (options.sport && options.sport !== 'All') {
        filters.sport = options.sport;
      } else {
        // Don't pass sport filter when "All" is selected
      }

      if (options.minEV !== undefined) {
        filters.minEV = options.minEV;
      }

      const evs = await evService.calculateAllEVs(filters);

      if (options.statType && options.statType !== 'All') {
        return evs.filter(
          (ev) => ev.player_prop.stat_type === options.statType
        );
      }

      return evs;
    },

    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: 3,
    enabled: options.enabled !== false,
  });
}
