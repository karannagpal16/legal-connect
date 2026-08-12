const STEPS = [
  { index: 1, label: "Filing" },
  { index: 2, label: "Notice Issued" },
  { index: 3, label: "Reply Filed" },
  { index: 4, label: "Evidence" },
  { index: 5, label: "Arguments" },
  { index: 6, label: "Judgment" },
];

export function StageMilestoneBar({
  milestones,
  activeIndex,
}: {
  milestones?: { activeIndex?: number; steps?: Array<{ index: number; label: string; state?: string }> } | null;
  activeIndex?: number;
}) {
  const active = milestones?.activeIndex || activeIndex || 1;
  const steps = milestones?.steps?.length
    ? milestones.steps
    : STEPS.map((step) => ({
        ...step,
        state: step.index < active ? "done" : step.index === active ? "active" : "pending",
      }));

  return (
    <section className="rounded-2xl border border-[#1A2332]/10 bg-card/40 p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-bold text-[#1A2332]">Case Progress</h3>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#1A2332]/40">
          Stage {active} of {steps.length}
        </span>
      </div>
      <ol className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {steps.map((step, index) => {
          const state = step.state || (step.index < active ? "done" : step.index === active ? "active" : "pending");
          return (
            <li key={step.index} className="relative">
              <div
                className={`rounded-xl border px-2.5 py-2 min-h-[64px] ${
                  state === "done"
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : state === "active"
                      ? "border-primary/40 bg-primary/10"
                      : "border-[#1A2332]/10 bg-[#1A2332]/5"
                }`}
              >
                <p className={`text-[10px] font-bold ${state === "pending" ? "text-[#1A2332]/30" : "text-[#1A2332]/55"}`}>
                  {String(step.index).padStart(2, "0")}
                </p>
                <p className={`text-[11px] font-semibold leading-snug mt-1 ${
                  state === "active" ? "text-primary" : state === "done" ? "text-[#1A2332]" : "text-[#1A2332]/35"
                }`}>
                  {step.label}
                </p>
              </div>
              {index < steps.length - 1 ? (
                <div className="hidden lg:block absolute top-1/2 -right-1 w-2 h-px bg-[#1A2332]/15" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
