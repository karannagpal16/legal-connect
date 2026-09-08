import { useEffect, useState } from "react";
import { fetchProxyProofBlob, proofHasFile, type ProofTaskMeta } from "@/lib/openProxyProof";

type PreviewTask = ProofTaskMeta & {
  id: string | number;
  proofFileName?: string | null;
  proofMimeType?: string | null;
};

export function OrderSheetPreview({
  task,
  token,
  caption = "Visible to main counsel, proxy counsel, and Legal Connect Admin.",
}: {
  task: PreviewTask;
  token?: string | null;
  caption?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [mime, setMime] = useState(String(task.proofMimeType || ""));
  const [error, setError] = useState("");
  const canShow = proofHasFile(task);

  useEffect(() => {
    if (!canShow) return;
    let href = "";
    let cancelled = false;
    setError("");
    setSrc(null);
    fetchProxyProofBlob(String(task.id), token)
      .then(({ blob, mimeType }) => {
        const next = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(next);
          return;
        }
        href = next;
        setSrc(next);
        setMime(mimeType);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not open the order sheet.");
        }
      });
    return () => {
      cancelled = true;
      if (href) URL.revokeObjectURL(href);
    };
  }, [canShow, task.id, task.proofStatus, task.proofStored, task.proofViewUrl, token]);

  if (!canShow) return null;

  const isImage = mime.startsWith("image/");
  const isPdf = mime.includes("pdf") || String(task.proofFileName || "").toLowerCase().endsWith(".pdf");

  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden">
      <div className="px-3 py-2 border-b border-border">
        <p className="text-xs font-semibold text-foreground">Order sheet</p>
        <p className="text-[11px] text-muted-foreground">{caption}</p>
      </div>
      {error ? (
        <p className="px-3 py-3 text-xs text-destructive">{error}</p>
      ) : !src ? (
        <p className="px-3 py-6 text-xs text-muted-foreground text-center">Loading scan…</p>
      ) : isImage ? (
        <img src={src} alt="Order sheet scan" className="w-full max-h-80 object-contain bg-muted/40" />
      ) : isPdf ? (
        <iframe title="Order sheet PDF" src={src} className="w-full h-80 bg-muted/40" />
      ) : (
        <p className="px-3 py-3 text-xs text-muted-foreground">Scan saved. Use View order sheet to open it.</p>
      )}
    </div>
  );
}
