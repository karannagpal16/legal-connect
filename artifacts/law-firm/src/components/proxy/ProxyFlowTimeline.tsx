import { PROXY_FLOW_STAGES, nextProxyActor, proxyFlowIndex, type ProxyFlowTaskLike } from "@/lib/proxyFlow";
import { useState } from "react";

/** Compact how-it-works — collapsed by default to keep the desk calm. */
export function ProxyFlowBanner() {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-2xl border border-border bg-card px-4 py-3">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-3 text-left"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <div>
          <p className="text-sm font-semibold text-foreground">How court missions work</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pay → Legal Connect assigns → Proxy appears &amp; uploads proof → You confirm → Money released
          </p>
        </div>
        <span className="text-xs font-bold text-primary whitespace-nowrap">{open ? "Hide" : "Show"}</span>
      </button>
      {open ? (
        <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 border-t border-border pt-3">
          {[
            { n: "1", t: "Post & pay", d: "Court, CNR, room, timing" },
            { n: "2", t: "LC assigns", d: "Verified proxy counsel" },
            { n: "3", t: "Appear & proof", d: "Check-in + order sheet" },
            { n: "4", t: "Confirm & pay out", d: "OK → net funds released" },
          ].map((step) => (
            <li key={step.n} className="rounded-xl bg-background/70 px-3 py-2">
              <span className="text-[11px] font-bold text-muted-foreground">{step.n}</span>
              <strong className="block text-sm text-foreground">{step.t}</strong>
              <small className="text-xs text-muted-foreground">{step.d}</small>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

/** Tiny progress dots — no jargon labels on the card face. */
export function ProxyMissionTimeline({ task }: { task: ProxyFlowTaskLike }) {
  const current = proxyFlowIndex(task);
  const next = nextProxyActor(task);

  return (
    <div className="space-y-2">
      <div className="flex gap-1" aria-label="Mission progress">
        {PROXY_FLOW_STAGES.map((stage, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <div
              key={stage.id}
              title={stage.label}
              className={`h-1.5 flex-1 rounded-full ${
                done ? "bg-primary" : active ? "bg-primary/55" : "bg-muted"
              }`}
            />
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Next:</span> {next.action}
      </p>
    </div>
  );
}
