import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";

export type HeroActionTone = "urgent" | "action" | "clear";

export type HeroAction = {
  tone: HeroActionTone;
  kicker: string;
  title: string;
  detail: string;
  ctaLabel: string;
  href?: string;
  onClick?: () => void;
  icon?: LucideIcon;
};

const toneLabel: Record<HeroActionTone, string> = {
  urgent: "Urgent action required",
  action: "Action needed",
  clear: "All clear",
};

export function HeroActionBanner({ action }: { action: HeroAction | null | undefined }) {
  if (!action) return null;
  const Icon = action.icon;

  const body = (
    <>
      <div className="lc-hero-action-copy">
        <span>{action.kicker || toneLabel[action.tone]}</span>
        <strong>{action.title}</strong>
        <p>{action.detail}</p>
      </div>
      <span className="lc-hero-action-cta">
        {Icon ? <Icon /> : null}
        {action.ctaLabel}
        <ArrowRight />
      </span>
    </>
  );

  if (action.href && !action.onClick) {
    return (
      <Link href={action.href} className={`lc-hero-action tone-${action.tone}`} aria-label={`${toneLabel[action.tone]}: ${action.title}`}>
        {body}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={`lc-hero-action tone-${action.tone}`}
      onClick={action.onClick}
      aria-label={`${toneLabel[action.tone]}: ${action.title}`}
    >
      {body}
    </button>
  );
}

export function pickHeroAction(candidates: Array<HeroAction | null | undefined>): HeroAction | null {
  const list = candidates.filter(Boolean) as HeroAction[];
  return list.find((item) => item.tone === "urgent")
    || list.find((item) => item.tone === "action")
    || list.find((item) => item.tone === "clear")
    || null;
}
