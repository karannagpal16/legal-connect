import { useState } from "react";
import { FileSearch } from "lucide-react";
import { openProxyProof, proofHasFile } from "@/lib/openProxyProof";

type ProofTask = {
  id: string | number;
  hasProof?: boolean;
  proofStored?: boolean;
  proofStatus?: string | null;
  proofViewUrl?: string | null;
  proofUrl?: string | null;
  proofFileName?: string | null;
};

export function ViewOrderSheetButton({
  task,
  token,
  className,
  variant = "hub",
  onError,
}: {
  task: ProofTask;
  token?: string | null;
  className?: string;
  variant?: "hub" | "admin";
  onError?: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  if (!proofHasFile(task)) return null;

  const classes = className
    || (variant === "admin"
      ? "lc-button"
      : "w-full border border-border rounded-xl py-2.5 font-semibold flex items-center justify-center gap-2");

  return (
    <button
      type="button"
      className={classes}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await openProxyProof(String(task.id), token, task.proofFileName);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Could not open the order sheet.";
          onError?.(message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <FileSearch className="w-4 h-4" />
      {busy ? "Opening scan…" : task.proofStored === false ? "View order sheet (may need re-upload)" : "View order sheet"}
    </button>
  );
}
