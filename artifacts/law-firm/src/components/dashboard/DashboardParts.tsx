import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import type { ReactNode } from "react";

export function DashboardIntro({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: { label: string; href: string; icon?: LucideIcon };
}) {
  const ActionIcon = action?.icon;
  return (
    <section className="lc-dashboard-intro">
      <div>
        <span className="lc-kicker">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action && (
        <Link href={action.href} className="lc-button lc-button-primary">
          {ActionIcon && <ActionIcon />}
          {action.label}
          <ArrowRight />
        </Link>
      )}
    </section>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "navy",
  loading,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  tone?: "navy" | "gold" | "green" | "red";
  loading?: boolean;
}) {
  return (
    <article className={`lc-metric lc-tone-${tone}`}>
      <div className="lc-metric-icon"><Icon /></div>
      <div>
        <span>{label}</span>
        {loading ? <i className="lc-metric-skeleton" /> : <strong>{value}</strong>}
        <small>{detail}</small>
      </div>
    </article>
  );
}

export function DashboardPanel({
  title,
  detail,
  action,
  children,
}: {
  title: string;
  detail?: string;
  action?: { label: string; href: string };
  children: ReactNode;
}) {
  return (
    <section className="lc-dashboard-panel">
      <header>
        <div><h3>{title}</h3>{detail && <p>{detail}</p>}</div>
        {action && <Link href={action.href}>{action.label} <ArrowRight /></Link>}
      </header>
      <div className="lc-dashboard-panel-body">{children}</div>
    </section>
  );
}

export function QuickAction({
  title,
  description,
  href,
  icon: Icon,
  tone = "navy",
}: {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tone?: "navy" | "gold" | "green" | "red";
}) {
  return (
    <Link href={href} className={`lc-quick-action lc-tone-${tone}`}>
      <span><Icon /></span>
      <div><strong>{title}</strong><small>{description}</small></div>
      <ArrowRight />
    </Link>
  );
}

export function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="lc-empty-state">
      <Icon />
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export function StatusPill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" }) {
  return <span className={`lc-status lc-status-${tone}`}>{children}</span>;
}
