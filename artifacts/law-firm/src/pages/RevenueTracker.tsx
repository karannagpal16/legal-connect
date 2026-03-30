import { useGetRevenueAnalytics } from "@workspace/api-client-react";
import { formatINR } from "@/lib/utils";
import { TrendingUp, Briefcase, Landmark, Trophy, Target, Award, Users } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from "recharts";

// Mock data for the chart to make it look active
const mockChartData = [
  { name: 'Jan', revenue: 1500000 },
  { name: 'Feb', revenue: 1800000 },
  { name: 'Mar', revenue: 1600000 },
  { name: 'Apr', revenue: 2100000 },
  { name: 'May', revenue: 2500000 },
  { name: 'Jun', revenue: 2800000 },
];

export function RevenueTracker() {
  const { data: analytics, isLoading } = useGetRevenueAnalytics();

  if (isLoading) {
    return <div className="animate-pulse space-y-6">
      <div className="h-10 w-64 bg-card rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-48 bg-card rounded-2xl" />
        <div className="h-48 bg-card rounded-2xl" />
      </div>
    </div>;
  }

  const {
    totalActiveCases = 0,
    totalManagedRevenue = 0,
    marketplaceProfit = 0,
    singaporeGoal = 38000000,
    totalUsers = 0,
    completedProxyTasks = 0
  } = analytics || {};

  const progressPercentage = Math.min(100, Math.max(0, (totalManagedRevenue / singaporeGoal) * 100));

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-foreground flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-primary" />
          Founder Analytics
        </h1>
        <p className="mt-2 text-muted-foreground text-lg">Private revenue tracker and expansion goals.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Managed Revenue */}
        <div className="bg-gradient-to-br from-card to-background border border-border rounded-3xl p-8 shadow-xl relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-bl-full transition-transform duration-500 group-hover:scale-125" />
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Landmark className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Total Managed Revenue</h2>
          </div>
          <div className="relative z-10">
            <span className="text-5xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/70 drop-shadow-sm">
              {formatINR(totalManagedRevenue)}
            </span>
            <p className="text-sm text-primary font-bold mt-2 tracking-wide uppercase">Based on ₹50K Avg/Case</p>
          </div>
        </div>

        {/* Marketplace Profit */}
        <div className="bg-gradient-to-br from-card to-background border border-border rounded-3xl p-8 shadow-xl relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-32 h-32 bg-accent/5 rounded-bl-full transition-transform duration-500 group-hover:scale-125" />
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-3 bg-accent/10 rounded-xl">
              <Briefcase className="w-6 h-6 text-accent" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Marketplace Profit</h2>
          </div>
          <div className="relative z-10">
            <span className="text-5xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/70 drop-shadow-sm">
              {formatINR(marketplaceProfit)}
            </span>
            <p className="text-sm text-accent font-bold mt-2 tracking-wide uppercase">10% Cut from Proxy Tasks</p>
          </div>
        </div>
      </div>

      {/* Singapore Goal */}
      <div className="bg-card border border-border rounded-3xl p-8 shadow-lg">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Target className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Singapore Expansion Goal</h2>
              <p className="text-muted-foreground">Target: {formatINR(singaporeGoal)}</p>
            </div>
          </div>
          <Trophy className="w-12 h-12 text-primary/20" />
        </div>

        <div className="relative h-6 bg-background rounded-full overflow-hidden border border-border">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-accent transition-all duration-1000 ease-out"
            style={{ width: `${progressPercentage}%` }}
          >
            <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" />
          </div>
        </div>
        <div className="flex justify-between mt-3 text-sm font-bold">
          <span className="text-primary">{progressPercentage.toFixed(1)}% Completed</span>
          <span className="text-muted-foreground">{formatINR(singaporeGoal - totalManagedRevenue)} Remaining</span>
        </div>
      </div>

      {/* Quick Stats & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-bold uppercase tracking-wider">Active Cases</p>
              <p className="text-3xl font-black mt-1">{totalActiveCases}</p>
            </div>
            <BookOpen className="w-10 h-10 text-primary/40" />
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-bold uppercase tracking-wider">Completed Tasks</p>
              <p className="text-3xl font-black mt-1">{completedProxyTasks}</p>
            </div>
            <Award className="w-10 h-10 text-primary/40" />
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-bold uppercase tracking-wider">Total Users</p>
              <p className="text-3xl font-black mt-1">{totalUsers}</p>
            </div>
            <Users className="w-10 h-10 text-primary/40" />
          </div>
        </div>

        <div className="lg:col-span-2 bg-card border border-border rounded-3xl p-6 shadow-lg">
          <h3 className="text-lg font-bold mb-6">Revenue Growth (Projected)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  formatter={(value: number) => [formatINR(value), 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookOpen(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>;
}
