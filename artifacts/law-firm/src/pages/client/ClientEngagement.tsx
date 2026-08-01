import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FileSignature } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { workspaceRequest } from "@/lib/workspace";

export function ClientEngagement() {
  const { session } = useAuth();
  const [caseTitle, setCaseTitle] = useState("");
  const [advocateName, setAdvocateName] = useState("");
  const [engagementId, setEngagementId] = useState("");
  const [signature, setSignature] = useState(session?.user?.name || "");
  const [status, setStatus] = useState("");

  const generate = useMutation({
    mutationFn: () => workspaceRequest<{ engagement: { id: string; status: string } }>("/api/engagements/generate", session?.token, {
      method: "POST",
      body: JSON.stringify({
        caseTitle: caseTitle || "Legal matter",
        advocateName: advocateName || "Assigned counsel",
        clientName: session?.user?.name,
        clientUserId: session?.user?.id,
      }),
    }),
    onSuccess: (payload) => {
      setEngagementId(payload.engagement.id);
      setStatus(payload.engagement.status);
    },
  });

  const sign = useMutation({
    mutationFn: () => workspaceRequest<{ engagement: { id: string; status: string } }>(`/api/engagements/${engagementId}/sign`, session?.token, {
      method: "POST",
      body: JSON.stringify({ signature }),
    }),
    onSuccess: (payload) => setStatus(payload.engagement.status),
  });

  const onGenerate = (event: FormEvent) => {
    event.preventDefault();
    generate.mutate();
  };

  return (
    <div className="lc-dashboard-stack">
      <section className="lc-dashboard-intro">
        <div>
          <span className="lc-kicker">TERMS OF ENGAGEMENT</span>
          <h2>Sign before the first session</h2>
          <p>Both client and counsel must acknowledge the Terms of Engagement. The record is hash-backed and blocks guaranteed-outcome language under Rule 36.</p>
        </div>
      </section>

      <form className="lc-engagement-card" onSubmit={onGenerate}>
        <label>
          Matter title
          <input value={caseTitle} onChange={(event) => setCaseTitle(event.target.value)} placeholder="e.g. Tenancy dispute - Rohini" />
        </label>
        <label>
          Counsel name
          <input value={advocateName} onChange={(event) => setAdvocateName(event.target.value)} placeholder="Adv. Name" />
        </label>
        <button className="lc-button lc-button-primary" type="submit" disabled={generate.isPending}>
          <FileSignature /> {generate.isPending ? "Generating…" : "Generate agreement"}
        </button>
      </form>

      {engagementId ? (
        <section className="lc-engagement-card">
          <p>Agreement <strong>{engagementId}</strong> · status <strong>{status || "awaiting_signatures"}</strong></p>
          <label>
            Typed signature
            <input value={signature} onChange={(event) => setSignature(event.target.value)} />
          </label>
          <button className="lc-button lc-button-primary" type="button" disabled={sign.isPending || signature.trim().length < 2} onClick={() => sign.mutate()}>
            {sign.isPending ? "Signing…" : "Sign as client"}
          </button>
          {sign.isSuccess ? <p className="lc-form-success">Signature recorded. Counsel must also sign before the first paid session.</p> : null}
        </section>
      ) : null}
    </div>
  );
}
