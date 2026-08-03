import type { PipelineProgress } from "@/lib/workspace";

type Props = {
  pipeline?: PipelineProgress | null;
  nextAction?: string;
};

const LAYMAN_STAGES = [
  { id: 1, label: "Consultation & strategy", hint: "Intake reviewed and counsel plan set" },
  { id: 2, label: "Documents & signatures", hint: "Drafting, vakalatnama, and key papers" },
  { id: 3, label: "Court filing & notice", hint: "Matter enters the court process" },
  { id: 4, label: "Hearings & arguments", hint: "Appearances, updates, and advocacy" },
  { id: 5, label: "Order / judgment", hint: "Outcome and closing steps" },
];

function laymanStageFromPipeline(pipeline?: PipelineProgress | null) {
  const order = Number(pipeline?.stageOrder || 1);
  if (order <= 2) return 1;
  if (order === 3) return 2;
  if (order === 4) return 3;
  if (order <= 6) return 4;
  return 5;
}

export function CaseProgressStepper({ pipeline, nextAction }: Props) {
  const current = laymanStageFromPipeline(pipeline);

  return (
    <section className="lc-case-stepper" aria-label="Case progress in plain English">
      <header>
        <div>
          <span>Where your matter stands</span>
          <h3>{pipeline?.stageLabel || LAYMAN_STAGES[current - 1]?.label}</h3>
          <p>{pipeline?.clientCopy || nextAction || "Legal Connect will guide each next step."}</p>
        </div>
        <em>Step {current} of 5</em>
      </header>
      <ol>
        {LAYMAN_STAGES.map((stage) => {
          const state = stage.id < current ? "complete" : stage.id === current ? "current" : "upcoming";
          return (
            <li key={stage.id} className={state}>
              <span aria-hidden="true">{stage.id < current ? "Done" : stage.id}</span>
              <div>
                <strong>{stage.label}</strong>
                <small>{stage.hint}</small>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
