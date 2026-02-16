import { useState, useMemo, useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Filters } from '@/components/dashboard/Filters';
import { StatsBar } from '@/components/dashboard/StatsBar';
import { EVTable } from '@/components/dashboard/EVTable';
import { PlayerDetailModal } from '@/components/dashboard/PlayerDetailModal';
import { ParlayBuilder } from '@/components/dashboard/ParlayBuilder';
import { generateMockEVCalculations } from '@/lib/mock-data';
import type { EVCalculation, DashboardFilters } from '@/types';

const Index = () => {
  const [allData] = useState<EVCalculation[]>(() => generateMockEVCalculations());
  const [filters, setFilters] = useState<DashboardFilters>({
    sport: 'All',
    statType: 'All',
    minEV: 0,
    search: '',
    sortBy: 'ev_pct',
    sortDir: 'desc',
  });
  const [selectedEV, setSelectedEV] = useState<EVCalculation | null>(null);
  const [parlayLegs, setParlayLegs] = useState<EVCalculation[]>([]);

  // Force dark mode
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const filteredData = useMemo(() => {
    let result = [...allData];

    if (filters.sport !== 'All') {
      result = result.filter((d) => d.player_prop.player.sport === filters.sport);
    }
    if (filters.statType !== 'All') {
      result = result.filter((d) => d.player_prop.stat_type === filters.statType);
    }
    if (filters.minEV > 0) {
      result = result.filter((d) => d.ev_pct >= filters.minEV);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((d) =>
        d.player_prop.player.name.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      if (filters.sortBy === 'player_name') {
        aVal = a.player_prop.player.name;
        bVal = b.player_prop.player.name;
      } else {
        aVal = (a as any)[filters.sortBy] ?? 0;
        bVal = (b as any)[filters.sortBy] ?? 0;
      }

      if (typeof aVal === 'string') {
        return filters.sortDir === 'asc'
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal);
      }
      return filters.sortDir === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return result;
  }, [allData, filters]);

  const handleSort = (key: DashboardFilters['sortBy']) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: key,
      sortDir: prev.sortBy === key && prev.sortDir === 'desc' ? 'asc' : 'desc',
    }));
  };

  const toggleParlay = (ev: EVCalculation) => {
    setParlayLegs((prev) =>
      prev.find((l) => l.id === ev.id)
        ? prev.filter((l) => l.id !== ev.id)
        : [...prev, ev]
    );
  };

  const parlayIds = new Set(parlayLegs.map((l) => l.id));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader />
      <Filters filters={filters} onChange={setFilters} />
      <StatsBar data={filteredData} />
      <div className="flex-1 overflow-hidden">
        <EVTable
          data={filteredData}
          filters={filters}
          onSort={handleSort}
          onSelectPlayer={setSelectedEV}
          onAddToParlay={toggleParlay}
          parlayIds={parlayIds}
        />
      </div>
      <ParlayBuilder
        legs={parlayLegs}
        onRemove={(id) => setParlayLegs((p) => p.filter((l) => l.id !== id))}
        onClear={() => setParlayLegs([])}
      />
      <PlayerDetailModal
        ev={selectedEV}
        open={!!selectedEV}
        onClose={() => setSelectedEV(null)}
      />
    </div>
  );
};

export default Index;
