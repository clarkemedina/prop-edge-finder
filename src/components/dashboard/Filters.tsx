import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import type { DashboardFilters, Sport, StatType } from '@/types';

const sports: Array<Sport | 'All'> = ['All', 'NBA', 'NFL', 'MLB', 'NHL', 'WNBA'];
const statTypes: Array<StatType | 'All'> = [
  'All', 'Points', 'Rebounds', 'Assists', 'Steals', 'Blocks', '3-Pointers', 'PRA',
  'Passing Yards', 'Rushing Yards', 'Touchdowns', 'Strikeouts', 'Hits', 'Goals', 'Saves',
];

interface FiltersProps {
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
}

export function Filters({ filters, onChange }: FiltersProps) {
  return (
    <div className="border-b border-border bg-card px-4 py-3 md:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        {/* Search */}
        <div className="relative flex-1 md:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search player..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="pl-9 bg-secondary/50 border-border"
          />
        </div>

        {/* Sport */}
        <Select
          value={filters.sport}
          onValueChange={(v) => onChange({ ...filters, sport: v as Sport | 'All' })}
        >
          <SelectTrigger className="w-full md:w-32 bg-secondary/50">
            <SelectValue placeholder="Sport" />
          </SelectTrigger>
          <SelectContent>
            {sports.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Stat Type */}
        <Select
          value={filters.statType}
          onValueChange={(v) => onChange({ ...filters, statType: v as StatType | 'All' })}
        >
          <SelectTrigger className="w-full md:w-40 bg-secondary/50">
            <SelectValue placeholder="Stat Type" />
          </SelectTrigger>
          <SelectContent>
            {statTypes.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Min EV */}
        <div className="flex items-center gap-2 md:ml-2">
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            Min EV: {filters.minEV > 0 ? `+${filters.minEV}%` : 'Any'}
          </span>
          <Slider
            value={[filters.minEV]}
            onValueChange={([v]) => onChange({ ...filters, minEV: v })}
            min={0}
            max={15}
            step={0.5}
            className="w-24 md:w-32"
          />
        </div>
      </div>
    </div>
  );
}
