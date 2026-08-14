import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";

export function TrackCaseDialog({
  preview,
  tracking,
  onConfirm,
  onCancel,
}: {
  preview: {
    cnr?: string;
    caseNumber?: string;
    courtName?: string;
    status?: string;
    stage?: string;
    nextHearingDate?: string | null;
    sourceUrl?: string;
  };
  tracking?: boolean;
  onConfirm: (opts: { linkedMatterId?: string; confirmLinkMatter: boolean }) => void;
  onCancel: () => void;
}) {
  const [linkedMatterId, setLinkedMatterId] = useState("");
  const [confirmLink, setConfirmLink] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onConfirm({
      linkedMatterId: linkedMatterId.trim() || undefined,
      confirmLinkMatter: Boolean(linkedMatterId.trim() && confirmLink),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-primary/25 bg-primary/5 p-4">
      <div>
        <h4 className="text-sm font-bold text-[#1A2332]">Track this case?</h4>
        <p className="text-xs text-[#1A2332]/55 mt-1">
          {preview.caseNumber || preview.cnr} · {preview.courtName || "Court"} · {preview.stage || preview.status || "Status pending"}
        </p>
        {preview.nextHearingDate ? (
          <p className="text-xs text-[#1A2332]/55 mt-1">Next hearing: {String(preview.nextHearingDate).slice(0, 10)}</p>
        ) : null}
      </div>
      <label className="block space-y-1">
        <span className="text-[11px] font-semibold text-[#1A2332]/55">Link to Legal Connect matter (optional)</span>
        <input
          value={linkedMatterId}
          onChange={(event) => setLinkedMatterId(event.target.value)}
          placeholder="Matter UUID"
          className="w-full rounded-lg border border-[#1A2332]/15 px-3 py-2 text-sm"
        />
      </label>
      {linkedMatterId.trim() ? (
        <label className="flex items-start gap-2 text-xs text-[#1A2332]/65">
          <input type="checkbox" checked={confirmLink} onChange={(event) => setConfirmLink(event.target.checked)} className="mt-0.5" />
          I confirm linking this court record to the selected matter.
        </label>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={tracking || (Boolean(linkedMatterId.trim()) && !confirmLink)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
        >
          {tracking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Start tracking
        </button>
        <button type="button" onClick={onCancel} className="rounded-xl border border-[#1A2332]/15 px-4 py-2 text-xs font-bold text-[#1A2332]/60">
          Cancel
        </button>
      </div>
    </form>
  );
}
