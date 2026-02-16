import { TrendingUp, Zap } from 'lucide-react';

export function DashboardHeader() {
  return (
    <header className="border-b border-border bg-card px-4 py-4 md:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight md:text-xl">PropEdge</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Player Prop +EV Scanner
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">Live</span>
          </div>
        </div>
      </div>
    </header>
  );
}
