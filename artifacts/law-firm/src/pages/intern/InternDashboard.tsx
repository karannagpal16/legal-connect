import { useListCases, useListInternQuests } from "@workspace/api-client-react";
import { Award, BookOpen, CheckCircle2, FileSearch, Sparkles, Target, Trophy, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { asArray } from "@/lib/data";
import { DashboardIntro, DashboardPanel, EmptyState, MetricCard, QuickAction, StatusPill } from "@/components/dashboard/DashboardParts";

export function InternDashboard() {
  const { session } = useAuth();
  const { data: quests = [], isLoading } = useListInternQuests();
  const { data: cases = [], isLoading: casesLoading } = useListCases();
  const questList = asArray(quests);
  const caseList = asArray(cases);
  const firstName = session?.user.name?.split(" ")[0] || "Intern";
  const active = questList.filter((item) => ["Open", "In Progress"].includes(item.status));
  const completed = questList.filter((item) => item.status === "Completed");
  const xp = completed.reduce((total, item) => total + item.xpPoints, 0);
  const nextLevel = Math.max(500, Math.ceil((xp + 1) / 500) * 500);
  const progress = Math.min(100, (xp / nextLevel) * 100);

  return (
    <div className="lc-dashboard-stack">
      <DashboardIntro
        eyebrow="INTERN DASHBOARD"
        title={`Ready to learn, ${firstName}?`}
        description={active.length ? `You have ${active.length} quest${active.length === 1 ? "" : "s"} ready for action.` : "Your supervisor has not assigned a new quest yet."}
        action={{ label: "Open my quests", href: "/intern/quests", icon: Target }}
      />

      <div className="lc-metric-grid lc-metric-grid-four">
        <MetricCard label="Active quests" value={active.length} detail="Open or in progress" icon={Target} tone="gold" loading={isLoading} />
        <MetricCard label="Completed" value={completed.length} detail="Approved learning tasks" icon={CheckCircle2} tone="green" loading={isLoading} />
        <MetricCard label="Total XP" value={xp} detail={`${nextLevel - xp} XP to next level`} icon={Zap} loading={isLoading} />
        <MetricCard label="Case access" value={caseList.length} detail="Research matters available" icon={FileSearch} tone="red" loading={casesLoading} />
      </div>

      <section className="lc-xp-panel">
        <div><span className="lc-kicker">YOUR PROGRESS</span><h3>Level {Math.floor(xp / 500) + 1}</h3><p>{xp} of {nextLevel} XP</p></div>
        <div className="lc-progress-track" aria-label={`${Math.round(progress)} percent to the next level`}><span style={{ width: `${progress}%` }} /></div>
        <Trophy />
      </section>

      <section className="lc-quick-grid">
        <QuickAction title="My quests" description="Read briefs and submit work" href="/intern/quests" icon={Target} tone="gold" />
        <QuickAction title="Case tracker" description="Review assigned case context" href="/intern/cases" icon={FileSearch} />
        <QuickAction title="AI assistant" description="Get help with research structure" href="/intern/ai-assistant" icon={Sparkles} />
        <QuickAction title="Legal library" description="Open acts and reference material" href="/intern/library" icon={BookOpen} tone="green" />
      </section>

      <DashboardPanel title="Current quests" detail="Your assigned legal learning work" action={{ label: "View all quests", href: "/intern/quests" }}>
        {active.length ? (
          <div className="lc-data-list">
            {active.slice(0, 6).map((item) => (
              <div className="lc-data-row" key={item.id}>
                <span className="lc-data-icon"><Award /></span>
                <div><strong>{item.title}</strong><small>{item.deadline ? `Due ${new Date(item.deadline).toLocaleDateString("en-IN")}` : "No deadline"} · {item.xpPoints} XP</small></div>
                <StatusPill tone={item.status === "In Progress" ? "warning" : "neutral"}>{item.status}</StatusPill>
              </div>
            ))}
          </div>
        ) : <EmptyState icon={Target} title="No active quests" description="Your next supervised task will appear here." />}
      </DashboardPanel>
    </div>
  );
}
