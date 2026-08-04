import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CalendarClock, History } from "lucide-react";
import { Link } from "wouter";

export interface HearingReminderCase {
  id: string;
  title: string;
  court?: string | null;
  nextDate?: string | null;
  /** Last date of hearing (LDOH). */
  lastDate?: string | null;
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(String(value).slice(0, 10));
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function daysUntil(value?: string | null) {
  if (!value) return null;
  const date = new Date(String(value).slice(0, 10));
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86_400_000);
}

/**
 * Rotating reminder that cycles through every matter with a listed next date of
 * hearing (NDOH), also surfacing the last date of hearing (LDOH). One rotating
 * card keeps all upcoming hearings visible without a long static list.
 */
export function HearingReminderRotator({
  cases,
  hrefBase = "/client",
}: {
  cases: HearingReminderCase[];
  hrefBase?: string;
}) {
  const upcoming = useMemo(
    () =>
      cases
        .filter((item) => item.nextDate)
        .map((item) => ({ item, days: daysUntil(item.nextDate) ?? 9999 }))
        .sort((a, b) => a.days - b.days)
        .map((entry) => entry.item),
    [cases],
  );

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (upcoming.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % upcoming.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [upcoming.length]);

  useEffect(() => {
    if (index >= upcoming.length) setIndex(0);
  }, [index, upcoming.length]);

  if (!upcoming.length) return null;

  const active = upcoming[Math.min(index, upcoming.length - 1)];
  const days = daysUntil(active.nextDate);
  const dueLabel =
    days == null ? "" : days < 0 ? "Past due" : days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`;

  return (
    <section className="lc-ndoh-rotator" aria-live="polite" aria-label="Upcoming hearing reminders">
      <div className="lc-ndoh-rotator-head">
        <span className="lc-kicker"><CalendarClock /> Hearing reminders</span>
        {upcoming.length > 1 ? <span className="lc-ndoh-count">{index + 1} / {upcoming.length}</span> : null}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.32 }}
          className="lc-ndoh-card"
        >
          <div className="lc-ndoh-main">
            <strong className="lc-ndoh-title">{active.title}</strong>
            {active.court ? <small className="lc-ndoh-court">{active.court}</small> : null}
          </div>
          <div className="lc-ndoh-dates">
            <div className="lc-ndoh-date lc-ndoh-next">
              <span>NDOH · Next hearing</span>
              <strong>{formatDate(active.nextDate)}</strong>
              {dueLabel ? (
                <em className={`lc-ndoh-due ${days != null && days <= 1 ? "urgent" : ""}`}>{dueLabel}</em>
              ) : null}
            </div>
            <div className="lc-ndoh-date lc-ndoh-last">
              <span><History /> LDOH · Last hearing</span>
              <strong>{formatDate(active.lastDate) || "Not recorded"}</strong>
            </div>
          </div>
          <Link className="lc-ndoh-cta" href={hrefBase}>Open case <ArrowRight /></Link>
        </motion.div>
      </AnimatePresence>
      {upcoming.length > 1 ? (
        <div className="lc-ndoh-dots">
          {upcoming.map((item, dot) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Show ${item.title}`}
              className={dot === index ? "active" : ""}
              onClick={() => setIndex(dot)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
