import { useListCases, useListTasks, useListUsers } from "@workspace/api-client-react";
import { Scale, BookOpen, Briefcase, Users, ArrowRight, Gavel } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";

export function Dashboard() {
  const { data: cases, isLoading: casesLoading } = useListCases();
  const { data: tasks, isLoading: tasksLoading } = useListTasks();
  const { data: users, isLoading: usersLoading } = useListUsers();

  const totalCases = cases?.length || 0;
  const activeCases = cases?.filter(c => c.status === "Active").length || 0;
  const pendingTasks = tasks?.filter(t => t.status === "Pending" || t.status === "In Progress").length || 0;
  const totalUsers = users?.length || 0;

  const recentCases = cases?.slice(0, 5) || [];

  const StatCard = ({ title, value, icon: Icon, loading }: any) => (
    <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-lg shadow-black/20 relative overflow-hidden group hover:border-primary/50 transition-colors">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-muted-foreground text-sm font-medium mb-2">{title}</p>
          {loading ? (
            <Skeleton className="h-8 w-16 bg-muted/50" />
          ) : (
            <h3 className="text-3xl font-serif text-foreground">{value}</h3>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl bg-background border border-border/50 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-inner">
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground tracking-tight">Firm Dashboard</h1>
          <p className="text-muted-foreground mt-2">Welcome back. Here is the overview of your legal practice today.</p>
        </div>
        <Link 
          href="/diary" 
          className="inline-flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 hover:-translate-y-0.5 px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-primary/20"
        >
          <Gavel className="w-4 h-4 mr-2" />
          Add New Case
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Cases" value={totalCases} icon={Scale} loading={casesLoading} />
        <StatCard title="Active Matters" value={activeCases} icon={BookOpen} loading={casesLoading} />
        <StatCard title="Pending Proxy" value={pendingTasks} icon={Briefcase} loading={tasksLoading} />
        <StatCard title="Firm Members" value={totalUsers} icon={Users} loading={usersLoading} />
      </div>

      <div className="bg-card rounded-2xl border border-border/60 shadow-xl shadow-black/10 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-border/50 bg-background/50">
          <h2 className="text-xl font-serif font-semibold">Recent Case Entries</h2>
          <Link href="/diary" className="text-sm font-medium text-primary hover:text-primary/80 flex items-center transition-colors">
            View All Diary <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground bg-background/30">
                <th className="px-6 py-4 font-medium">Case Title</th>
                <th className="px-6 py-4 font-medium">Case Number</th>
                <th className="px-6 py-4 font-medium">Court Name</th>
                <th className="px-6 py-4 font-medium">Next Date</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {casesLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-40 bg-muted/50" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-24 bg-muted/50" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-32 bg-muted/50" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-24 bg-muted/50" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full bg-muted/50" /></td>
                  </tr>
                ))
              ) : recentCases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <BookOpen className="w-12 h-12 mb-4 text-border" />
                      <p>No active cases found.</p>
                      <p className="text-sm mt-1">Start by adding a new case to your diary.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                recentCases.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4 font-medium text-foreground">{c.caseTitle}</td>
                    <td className="px-6 py-4 text-muted-foreground text-sm font-mono">{c.caseNumber}</td>
                    <td className="px-6 py-4 text-muted-foreground text-sm">{c.courtName}</td>
                    <td className="px-6 py-4 text-sm">
                      {c.nextDate ? format(new Date(c.nextDate), "MMM dd, yyyy") : <span className="text-muted-foreground italic">Not scheduled</span>}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
