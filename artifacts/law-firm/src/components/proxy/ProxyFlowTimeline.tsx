import { PROXY_FLOW_STAGES, nextProxyActor, proxyFlowIndex, type ProxyFlowTaskLike } from "@/lib/proxyFlow";

export function ProxyFlowBanner() {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Transparent ProxyHub flow</p>
        <h2 className="text-xl font-serif font-bold text-foreground mt-1">Main counsel → Legal Connect → Proxy</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          Every mission follows the same supervised path. Escrow stays locked until main counsel is satisfied and LC releases net funds after platform fee and tax.
        </p>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {PROXY_FLOW_STAGES.map((stage, index) => (
          <li key={stage.id} className="rounded-xl border border-border/80 bg-background/70 p-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {index + 1}. {stage.actorLabel}
            </span>
            <strong className="block text-sm text-foreground mt-1">{stage.label}</strong>
            <small className="block text-xs text-muted-foreground mt-1 leading-snug">{stage.detail}</small>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ProxyMissionTimeline({ task }: { task: ProxyFlowTaskLike }) {
  const current = proxyFlowIndex(task);
  const next = nextProxyActor(task);

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5" aria-label="Mission progress">
        {PROXY_FLOW_STAGES.map((stage, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <div
              key={stage.id}
              title={`${stage.actorLabel}: ${stage.label}`}
              className={`h-1.5 flex-1 rounded-full ${
                done ? "bg-primary" : active ? "bg-primary/60" : "bg-muted"
              }`}
            />
          );
        })}
      </div>
      <div className="rounded-xl border border-border bg-background/80 px-3 py-2 text-xs">
        <strong className="text-foreground">Next · {next.label}</strong>
        <p className="text-muted-foreground mt-0.5">{next.action}</p>
      </div>
    </div>
  );
}
