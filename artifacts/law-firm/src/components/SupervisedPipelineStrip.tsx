import { ShieldCheck } from "lucide-react";

export type PipelineStep = {
  key: string;
  order: number;
  label: string;
  complete: boolean;
  current: boolean;
};

export type PipelineProgress = {
  stage: string;
  stageOrder: number;
  stageLabel: string;
  clientCopy: string;
  totalStages: number;
  steps: PipelineStep[];
};

const FALLBACK_STEPS: PipelineStep[] = [
  { key: "intake_submitted", order: 1, label: "Intake Submitted & Fee Secured", complete: false, current: true },
  { key: "lc_under_review", order: 2, label: "Legal Connect Under Review", complete: false, current: false },
  { key: "advocate_assigned", order: 3, label: "Advocate Assigned by Legal Connect", complete: false, current: false },
  { key: "advocate_accepted", order: 4, label: "Advocate Accepted — Work In Progress", complete: false, current: false },
  { key: "advocate_update_pending", order: 5, label: "Advocate Update Pending LC Review", complete: false, current: false },
  { key: "lc_update_approved", order: 6, label: "LC Update Approved & Released", complete: false, current: false },
  { key: "matter_concluded", order: 7, label: "Matter Concluded", complete: false, current: false },
];

type Props = {
  pipeline?: PipelineProgress | null;
  compact?: boolean;
};

export function SupervisedPipelineStrip({ pipeline, compact = false }: Props) {
  const steps = pipeline?.steps?.length ? pipeline.steps : FALLBACK_STEPS;
  const order = pipeline?.stageOrder || 1;
  const label = pipeline?.stageLabel || steps.find((step) => step.current)?.label || "Intake Submitted";
  const copy = pipeline?.clientCopy || "Legal Connect supervises every handoff between you and counsel.";

  return (
    <section className={`lc-supervised-pipeline ${compact ? "compact" : ""}`} aria-label="Supervised case pipeline">
      <header>
        <div>
          <span className="lc-kicker"><ShieldCheck /> Supervised by Legal Connect</span>
          <h3>Stage {order} of {pipeline?.totalStages || 7} · {label}</h3>
          <p>{copy}</p>
        </div>
      </header>
      <ol>
        {steps.map((step) => (
          <li
            key={step.key}
            className={[
              step.complete ? "complete" : "",
              step.current ? "current" : "",
            ].filter(Boolean).join(" ")}
            title={step.label}
          >
            <span aria-hidden>{step.complete || step.current ? "●" : "○"}</span>
            {!compact ? <small>{step.order}. {step.label}</small> : <small>{step.order}</small>}
          </li>
        ))}
      </ol>
    </section>
  );
}
