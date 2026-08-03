import { useListCases, useListInternQuests } from "@workspace/api-client-react";
import {
  Award,
  BookOpen,
  CheckCircle2,
  FileSearch,
  GraduationCap,
  Send,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { asArray } from "@/lib/data";
import { DashboardIntro, DashboardPanel, EmptyState, MetricCard, QuickAction, StatusPill } from "@/components/dashboard/DashboardParts";
import { HeroActionBanner, pickHeroAction } from "@/components/dashboard/HeroActionBanner";

function xpOf(item: { xpPoints?: number; xp?: number }) {
  const value = Number(item.xpPoints ?? item.xp ?? 0);
  return Number.isFinite(value) ? value : 0;
}

export function InternDashboard() {
  const { session } = useAuth();
  const { data: quests = [], isLoading } = useListInternQuests();
  const { data: cases = [], isLoading: casesLoading } = useListCases();
  const questList = asArray(quests).filter(Boolean);
  const caseList = asArray(cases).filter(Boolean);
  const firstName = session?.user.name?.split(" ")[0] || "Intern";
  const active = questList.filter((item) => ["Open", "In Progress", "assigned", "Assigned"].includes(String(item.status)));
  const completed = questList.filter((item) => ["Completed", "Approved", "completed"].includes(String(item.status)));
  const xp = completed.reduce((total, item) => total + xpOf(item), 0);
  const nextLevel = Math.max(500, Math.ceil((xp + 1) / 500) * 500);
  const progress = Math.min(100, (xp / nextLevel) * 100);
  const level = Math.floor(xp / 500) + 1;
  const verified = ["approved", "verified"].includes(String(session?.user.verificationStatus || "").toLowerCase());

  const firstQuest = active[0] as { title?: string; status?: string; id?: string | number } | undefined;
  const heroAction = pickHeroAction([
    !verified
      ? {
          tone: "action" as const,
          kicker: "Action needed",
          title: "Campus ID verification still pending",
          detail: "Complete verification so chamber quests and case research unlock fully.",
          ctaLabel: "Open dashboard",
          href: "/intern",
          icon: GraduationCap,
        }
      : null,
    firstQuest
      ? {
          tone: "urgent" as const,
          kicker: "Quest objective",
          title: firstQuest.title || "Chamber quest ready",
          detail: "Start research or drafting for your supervising advocate.",
          ctaLabel: "Start quest",
          href: "/intern/quests",
          icon: Target,
        }
      : null,
    {
      tone: "clear" as const,
      kicker: "Learning status",
      title: `Level ${level} · ${xp} XP earned`,
      detail: active.length ? `${active.length} open quests on your desk.` : "No open quests — check library or await mentor assignment.",
      ctaLabel: "View XP progress",
      href: "/intern/xp",
      icon: Zap,
    },
  ]);

  return (
    <div className="lc-dashboard-stack">
      <HeroActionBanner action={heroAction} />
      <DashboardIntro
        eyebrow="LAW SCHOOL UNIVERSE"
        title={`Ready to learn, ${firstName}?`}
        description={active.length ? `You have ${active.length} chamber quest${active.length === 1 ? "" : "s"} ready for action.` : "Your supervising advocate has not assigned a new quest yet."}
        action={{ label: "Open my quests", href: "/intern/quests", icon: Target }}
      />

      <section className="lc-command-hero lc-advocate-command" aria-label="Intern credential header">
        <div>
          <span className="lc-kicker">INTERN QUEST DESK</span>
          <h2>{session?.user.name || "Law intern"}</h2>
          <p>Chamber tasks, XP progression, precedent research and draft feedback in one learning cockpit.</p>
        </div>
        <span className={`lc-verification-badge ${verified ? "verified" : "pending"}`}>
          <GraduationCap /> {verified ? "Campus ID verified" : "Verification pending"}
        </span>
      </section>

      <div className="lc-metric-grid lc-metric-grid-four">
        <MetricCard label="Active quests" value={active.length} detail="Open or in progress" icon={Target} tone="gold" loading={isLoading} />
        <MetricCard label="Completed" value={completed.length} detail="Approved learning tasks" icon={CheckCircle2} tone="green" loading={isLoading} />
        <MetricCard label="Total XP" value={xp} detail={`${Math.max(0, nextLevel - xp)} XP to next level`} icon={Zap} loading={isLoading} />
        <MetricCard label="Case access" value={caseList.length} detail="Research matters available" icon={FileSearch} tone="red" loading={casesLoading} />
      </div>

      <section className="lc-xp-panel">
        <div>
          <span className="lc-kicker">YOUR PROGRESS</span>
          <h3>Level {level} · Junior Legal Researcher</h3>
          <p>{xp} of {nextLevel} XP</p>
        </div>
        <div className="lc-progress-track" aria-label={`${Math.round(progress)} percent to the next level`}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <Trophy />
      </section>

      <section className="lc-quick-grid">
        <QuickAction title="Chamber quests" description="Tasks assigned from Chamber Vault" href="/intern/quests" icon={Target} tone="gold" />
        <QuickAction title="Case tracker" description="Review assigned case context" href="/intern/cases" icon={FileSearch} />
        <QuickAction title="AI research desk" description="Structure briefs and citations" href="/intern/ai-assistant" icon={Sparkles} />
        <QuickAction title="Legal library" description="Acts, templates and precedents" href="/intern/library" icon={BookOpen} tone="green" />
      </section>

      <div className="lc-dashboard-columns">
        <DashboardPanel title="Assigned chamber quests" detail="Work queued by your senior advocate" action={{ label: "View all quests", href: "/intern/quests" }}>
          {active.length ? (
            <div className="lc-data-list">
              {active.slice(0, 6).map((item) => (
                <div className="lc-data-row" key={String(item.id)}>
                  <span className="lc-data-icon"><Award /></span>
                  <div>
                    <strong>{item.title}</strong>
                    <small>
                      {item.deadline ? `Due ${new Date(item.deadline).toLocaleDateString("en-IN")}` : "No deadline"}
                      {" · "}
                      {xpOf(item)} XP
                    </small>
                  </div>
                  <StatusPill tone={item.status === "In Progress" ? "warning" : "neutral"}>{item.status}</StatusPill>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Target} title="No active quests" description="Your next supervised chamber task will appear here." />
          )}
        </DashboardPanel>

        <DashboardPanel title="Draft submission & feedback" detail="Send research notes back to Chamber Vault" action={{ label: "Open AI assistant", href: "/intern/ai-assistant" }}>
          <div className="lc-admin-summary">
            <div>
              <span><Send /></span>
              <p>
                <strong>{completed.length}</strong>
                <small>Submissions completed</small>
              </p>
            </div>
            <div>
              <span><Trophy /></span>
              <p>
                <strong>{level}</strong>
                <small>Current researcher level</small>
              </p>
            </div>
            <div>
              <span><BookOpen /></span>
              <p>
                <strong>{caseList.length}</strong>
                <small>Matters for research</small>
              </p>
            </div>
          </div>
          <p className="lc-inline-empty" style={{ marginTop: 12 }}>
            Upload drafts from quests. Senior feedback and ratings sync into your XP progress.
          </p>
          <Link href="/intern/quests" className="lc-button lc-button-primary" style={{ marginTop: 12, display: "inline-flex" }}>
            Submit next draft
          </Link>
        </DashboardPanel>
      </div>
    </div>
  );
}
