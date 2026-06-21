import { useListCases, useListTasks, useListUsers, useGetRevenueAnalytics } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Scale, Users, Briefcase, Plus, BookOpen, Clock, CalendarDays, ExternalLink, ChevronRight } from "lucide-react";
import { StatusBadge, TaskTypeBadge } from "@/components/ui/StatusBadge";
import { format } from "date-fns";

export function Dashboard() {
  const { data: cases, isLoading: casesLoading } = useListCases();
  const { data: todayCases, isLoading: todayLoading } = useListCases({ today: true });
  const { data: tasks, isLoading: tasksLoading } = useListTasks();
  const { data: users, isLoading: usersLoading } = useListUsers();
  const { data: analytics, isLoading: analyticsLoading } = useGetRevenueAnalytics();

  const totalCases = cases?.length || 0;
  const activeCases = cases?.filter(c => c.status === "Active").length || 0;
  const openTasks = tasks?.filter(t => t.status === "Open").length || 0;
  const totalUsers = users?.length || 0;

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  
  // Cases for today
  const hearingsToday = todayCases || cases?.filter(c => c.nextDate === todayStr) || [];
  
  // Upcoming hearings (next 7 days, excluding today)
  const upcomingHearings = cases?.filter(c => {
    if (!c.nextDate || c.nextDate === todayStr) return false;
    const nextDate = new Date(c.nextDate);
    const today = new Date(todayStr);
    const diffTime = Math.abs(nextDate.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 7;
  }).sort((a, b) => new Date(a.nextDate!).getTime() - new Date(b.nextDate!).getTime()) || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-foreground">Firm Dashboard</h1>
          <p className="mt-2 text-muted-foreground text-lg">Welcome back. Here is the overview of your legal practice.</p>
        </div>
        <Link 
          href="/diary" 
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-4 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all hover:-translate-y-1 hover:shadow-xl w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          Add New Case
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard title="Total Cases" value={totalCases} icon={Scale} loading={casesLoading} />
        <StatCard title="Active Matters" value={activeCases} icon={BookOpen} loading={casesLoading} />
        <StatCard title="Open Proxy Tasks" value={openTasks} icon={Briefcase} loading={tasksLoading} />
        <StatCard title="Firm Members" value={totalUsers} icon={Users} loading={usersLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Cases */}
        <div className="bg-card rounded-2xl border border-border shadow-lg shadow-black/5 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-border bg-card flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              Hearings Today
            </h2>
            <span className="bg-primary/20 text-primary text-xs font-bold px-3 py-1 rounded-full">
              {hearingsToday.length} Cases
            </span>
          </div>
          <div className="flex-1 p-6 bg-background/30">
            {todayLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2].map(i => <div key={i} className="h-24 bg-card rounded-xl border border-border" />)}
              </div>
            ) : hearingsToday.length > 0 ? (
              <div className="space-y-4">
                {hearingsToday.map(c => (
                  <div key={c.id} className="bg-card border border-border p-4 rounded-xl hover:border-primary/50 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-foreground line-clamp-1">{c.caseTitle}</h3>
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="text-sm text-muted-foreground flex flex-col gap-1">
                      <span>{c.caseNumber}</span>
                      <span className="text-primary/80 font-medium flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5" />
                        {c.courtName} {c.courtRoomNo ? `(Room ${c.courtRoomNo})` : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-8">
                <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center mb-4 border border-border">
                  <BookOpen className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-foreground font-medium">No hearings today.</p>
                <p className="text-sm text-muted-foreground mt-1">Take a breather or review upcoming matters.</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Cases */}
        <div className="bg-card rounded-2xl border border-border shadow-lg shadow-black/5 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-border bg-card flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Upcoming (Next 7 Days)
            </h2>
            <Link href="/diary" className="text-sm text-primary hover:underline font-medium flex items-center gap-1">
              View Diary <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex-1 p-6 bg-background/30 overflow-y-auto max-h-[500px]">
            {casesLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-20 bg-card rounded-xl border border-border" />)}
              </div>
            ) : upcomingHearings.length > 0 ? (
              <div className="space-y-4">
                {upcomingHearings.map(c => (
                  <div key={c.id} className="bg-card border border-border p-4 rounded-xl flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center bg-background rounded-lg border border-border min-w-[60px] py-2 px-3">
                      <span className="text-xs text-muted-foreground uppercase font-bold">
                        {c.nextDate ? format(new Date(c.nextDate), 'MMM') : ''}
                      </span>
                      <span className="text-xl font-black text-foreground">
                        {c.nextDate ? format(new Date(c.nextDate), 'dd') : ''}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground truncate">{c.caseTitle}</h3>
                      <p className="text-sm text-muted-foreground truncate">{c.courtName}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-8">
                <p className="text-muted-foreground">No upcoming hearings in the next 7 days.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, loading }: { title: string, value: number, icon: any, loading: boolean }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-bl-full transition-transform group-hover:scale-110" />
      <h3 className="text-muted-foreground font-medium text-sm tracking-wide uppercase">{title}</h3>
      <div className="mt-4 flex items-end justify-between relative z-10">
        {loading ? (
          <div className="h-10 w-16 bg-muted animate-pulse rounded" />
        ) : (
          <span className="text-4xl font-serif font-bold text-foreground">{value}</span>
        )}
        <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all">
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
