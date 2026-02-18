import { useState, useEffect } from 'react';
import { TrendingUp, Zap, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/lib/supabaseClient";
import { fetchOdds } from '@/pages/api/fetch-odds';

const CACHE_WINDOW_MINUTES = 30;

export function DashboardHeader() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [minutesUntilRefresh, setMinutesUntilRefresh] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [creditsRemaining, setCreditsRemaining] = useState<string | null>(null);

  useEffect(() => {
    checkLastFetch();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (lastUpdated) {
        const minutesAgo = Math.round(
          (Date.now() - lastUpdated.getTime()) / (1000 * 60)
        );

        setMinutesUntilRefresh(
          minutesAgo >= CACHE_WINDOW_MINUTES
            ? 0
            : CACHE_WINDOW_MINUTES - minutesAgo
        );
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  async function checkLastFetch() {
    const { data } = await supabase
      .from('odds_snapshots')
      .select('created_at')
      .eq('sport', 'NBA')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      const lastFetch = new Date(data.created_at);
      setLastUpdated(lastFetch);

      const minutesAgo = Math.round(
        (Date.now() - lastFetch.getTime()) / (1000 * 60)
      );

      setMinutesUntilRefresh(
        minutesAgo < CACHE_WINDOW_MINUTES
          ? CACHE_WINDOW_MINUTES - minutesAgo
          : 0
      );
    }
  }

  async function handleRefresh() {
    if (minutesUntilRefresh && minutesUntilRefresh > 0) {
      setStatusMessage(`Using cached odds (${minutesUntilRefresh}m remaining)`);
      
      // 🔥 IMPORTANT: still refresh EV calculations
      queryClient.invalidateQueries({ queryKey: ['ev-calculations'] });

      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }

    setIsRefreshing(true);
    setStatusMessage('Fetching latest NBA odds...');

    try {
      const result = await fetchOdds();

      if (result.success) {
        setLastUpdated(new Date());

        // 🔥 ALWAYS recalc EV
        queryClient.invalidateQueries({ queryKey: ['ev-calculations'] });

        if (result.cached) {
          setStatusMessage(result.message);
        } else {
          setCreditsRemaining(result.creditsRemaining ?? null);
          setStatusMessage(
            `Updated! ${result.propsStored ?? 0} props from ${result.gamesProcessed ?? 0} games`
          );
        }
      } else {
        setStatusMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      setStatusMessage('Failed to fetch odds.');
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setStatusMessage(''), 4000);
    }
  }

  function formatLastUpdated(): string {
    if (!lastUpdated) return 'Never';

    const minutesAgo = Math.round(
      (Date.now() - lastUpdated.getTime()) / (1000 * 60)
    );

    if (minutesAgo < 1) return 'Just now';
    if (minutesAgo === 1) return '1 min ago';
    if (minutesAgo < 60) return `${minutesAgo} min ago`;
    return `${Math.round(minutesAgo / 60)}h ago`;
  }

  const canRefresh = !minutesUntilRefresh || minutesUntilRefresh <= 0;

  return (
    <header className="border-b border-border bg-card px-4 py-4 md:px-6">
      <div className="flex items-center justify-between">

        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight md:text-xl">
              PropEdge
            </h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Player Prop +EV Scanner
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">

          {statusMessage && (
            <span className="hidden text-xs text-muted-foreground sm:block max-w-[240px] truncate">
              {statusMessage}
            </span>
          )}

          {lastUpdated && !statusMessage && (
            <span className="hidden text-xs text-muted-foreground sm:block">
              Updated {formatLastUpdated()}
            </span>
          )}

          {creditsRemaining && !statusMessage && (
            <span className="hidden text-xs text-muted-foreground sm:block">
              {creditsRemaining} credits left
            </span>
          )}

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            title={
              canRefresh
                ? 'Refresh NBA odds'
                : `Next refresh in ${minutesUntilRefresh} min`
            }
            className={`
              flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium
              transition-all duration-200
              ${canRefresh && !isRefreshing
                ? 'bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer'
                : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
              }
            `}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            <span>
              {isRefreshing
                ? 'Fetching...'
                : canRefresh
                ? 'Refresh Odds'
                : `${minutesUntilRefresh}m`}
            </span>
          </button>

          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">Live</span>
          </div>

        </div>
      </div>
    </header>
  );
}
