import { FormEvent, useEffect, useState } from "react";
import { ExternalLink, FileText, Loader2, X } from "lucide-react";
import { workspaceRequest } from "@/lib/workspace";

interface AiBullet {
  label: string;
  text: string;
}

interface OrderRow {
  id: string;
  title?: string | null;
  documentDate?: string | null;
  officialSourceUrl?: string | null;
  isOfficial?: boolean;
  aiSummary?: { bullets?: AiBullet[]; disclaimer?: string } | null;
}

export function OrderPDFViewerModal({
  order,
  token,
  open,
  onClose,
}: {
  order: OrderRow | null;
  token?: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [aiSummary, setAiSummary] = useState<OrderRow["aiSummary"]>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [error, setError] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !order || !token) return;
    setAiSummary(order.aiSummary || null);
    setError("");
    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(`/api/court-sync/orders/${encodeURIComponent(order.id)}/pdf`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const contentType = response.headers.get("content-type") || "";
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          if (!cancelled) setError(payload.error || "Could not load PDF.");
          return;
        }
        if (contentType.includes("application/json")) {
          const payload = await response.json();
          if (payload.officialSourceUrl && !cancelled) {
            setPdfUrl(null);
            setError("Open the official source link for this order PDF.");
          }
          return;
        }
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setPdfUrl(objectUrl);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load PDF.");
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, order, token]);

  if (!open || !order) return null;

  const generate = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!token) return;
    setLoadingAi(true);
    setError("");
    try {
      const payload = await workspaceRequest<{ aiSummary: OrderRow["aiSummary"] }>(
        `/api/court-sync/orders/${encodeURIComponent(order.id)}/ai`,
        token,
        { method: "POST", body: "{}" },
      );
      setAiSummary(payload.aiSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate summary.");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0b1220]/55 p-3" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl max-h-[92vh] overflow-auto rounded-2xl border border-[#1A2332]/15 bg-[#F7F4EE] shadow-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[#1A2332]/10 bg-[#F7F4EE]/95 px-4 py-3 backdrop-blur">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#1A2332]/40">Order PDF</p>
            <h3 className="text-sm font-bold text-[#1A2332]">{order.title || "Court order"}</h3>
            <p className="text-[11px] text-[#1A2332]/45 mt-0.5">
              {order.documentDate ? String(order.documentDate).slice(0, 10) : "Date unknown"}
              {order.isOfficial !== false ? " · Official court document" : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-[#1A2332]/15 p-2 text-[#1A2332]/60" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="rounded-xl border border-[#1A2332]/10 bg-white overflow-hidden min-h-[280px]">
            {pdfUrl ? (
              <iframe title="Order PDF" src={pdfUrl} className="w-full h-[360px] bg-white" />
            ) : (
              <div className="flex h-[280px] items-center justify-center text-sm text-[#1A2332]/40">
                <FileText className="h-5 w-5 mr-2" /> PDF unavailable
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {order.officialSourceUrl ? (
              <a
                href={order.officialSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#1A2332]/15 px-3 py-2 text-xs font-bold text-[#1A2332]/70"
              >
                Official source <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => generate()}
              disabled={loadingAi || !token}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A2332] px-3 py-2 text-xs font-bold text-[#F7F4EE] disabled:opacity-60"
            >
              {loadingAi ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Generate 3-bullet AI summary
            </button>
          </div>

          {error ? <p className="text-xs text-rose-600">{error}</p> : null}

          {aiSummary?.bullets?.length ? (
            <section className="rounded-xl border border-[#1A2332]/10 bg-white p-3 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A2332]/45">Plain-language summary</h4>
              <ul className="space-y-2">
                {aiSummary.bullets.map((bullet) => (
                  <li key={bullet.label} className="text-sm text-[#1A2332]">
                    <span className="font-bold">{bullet.label}:</span> {bullet.text}
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-[#1A2332]/45">{aiSummary.disclaimer || "AI summary is not legal advice. The signed court order prevails."}</p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
