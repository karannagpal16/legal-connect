import {
  PROXY_FLOW_STAGES,
  nextProxyActor,
  proxyFlowIndex,
  resolveProxyFlowStage,
  visibleProxyFlowStages,
  type ProxyFlowTaskLike,
} from "@/lib/proxyFlow";
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
            Main counsel posts → LC assigns by court → proxy accepts → proof → counsel satisfied / not → release or refund
          </p>
        </div>
        <span className="text-xs font-bold text-primary whitespace-nowrap">{open ? "Hide" : "Show"}</span>
      </button>
      {open ? (
        <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 border-t border-border pt-3">
          {[
            { n: "1", t: "Post & pay", d: "Main counsel · practice area" },
            { n: "2", t: "LC assigns", d: "Match proxy to mission court" },
            { n: "3", t: "Proxy accepts", d: "Then conflict + check-in" },
            { n: "4", t: "Proof", d: "Order sheet → LC verifies" },
            { n: "5", t: "Counsel review", d: "Satisfied or not + reason" },
            { n: "6", t: "Settle", d: "Release net or refund" },
            { n: "7", t: "Track", d: "Live chain for Admin" },
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

/** Narrative counsel chain — who is main vs proxy and where they practice. */
export function CounselLiveTrack({ task }: { task: ProxyFlowTaskLike }) {
  const track = task.liveTrack;
  const nodes = track?.nodes?.length
    ? track.nodes
    : [
        {
          id: "main",
          label: `${task.mainCounsel?.name || task.posterName || "Main counsel"} · ${task.mainCounsel?.practiceLabel || "Practice TBD"}`,
          state: "done",
          detail: "Main counsel",
        },
        {
          id: "court",
          label: `Task at ${task.court || task.location || "court"}`,
          state: "done",
          detail: "Posted",
        },
        {
          id: "proxy",
          label: task.proxyCounsel?.name || task.assignedProxyName
            ? `${task.proxyCounsel?.name || task.assignedProxyName} · ${task.proxyCounsel?.practiceLabel || "assigned"}`
            : "Awaiting proxy",
          state: task.acceptedBy ? "done" : "active",
          detail: "Proxy counsel",
        },
      ];

  return (
    <div className="rounded-xl border border-border/80 bg-background/60 p-3 space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Live counsel track</p>
      {track?.headline ? (
        <p className="text-sm text-foreground leading-snug">{track.headline}</p>
      ) : null}
      <ol className="space-y-1.5">
        {nodes.map((node) => (
          <li key={node.id} className="flex items-start gap-2 text-xs">
            <span
              className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                node.state === "done"
                  ? "bg-primary"
                  : node.state === "active"
                    ? "bg-primary/60 ring-2 ring-primary/25"
                    : "bg-muted"
              }`}
              aria-hidden
            />
            <span className={node.state === "pending" ? "text-muted-foreground" : "text-foreground"}>
              <strong className="font-semibold">{node.label}</strong>
              {node.detail ? <span className="text-muted-foreground"> · {node.detail}</span> : null}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Tiny progress dots — no jargon labels on the card face. */
export function ProxyMissionTimeline({ task }: { task: ProxyFlowTaskLike }) {
  const stages = visibleProxyFlowStages(task);
  const current = proxyFlowIndex(task);
  const next = nextProxyActor(task);
  const stage = resolveProxyFlowStage(task);

  return (
    <div className="space-y-3">
      <CounselLiveTrack task={task} />
      <div className="flex gap-1" aria-label="Mission progress">
        {stages.map((item, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <div
              key={item.id}
              title={item.label}
              className={`h-1.5 flex-1 rounded-full ${
                done ? "bg-primary" : active ? "bg-primary/55" : "bg-muted"
              }`}
            />
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">
          {PROXY_FLOW_STAGES.find((item) => item.id === stage)?.label || "In progress"} · Next:
        </span>{" "}
        {next.action}
      </p>
    </div>
  );
}
