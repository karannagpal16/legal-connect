import { ExternalLink, FileText } from "lucide-react";

export function CourtOrdersList({
  orders,
  onDownload,
}: {
  orders: Array<{
    id: string;
    title?: string | null;
    documentDate?: string | null;
    officialSourceUrl?: string | null;
    isOfficial?: boolean;
  }>;
  onDownload?: (orderId: string) => void;
}) {
  if (!orders.length) {
    return <p className="text-sm text-[#1A2332]/40">No orders or judgments linked yet.</p>;
  }
  return (
    <ul className="space-y-2">
      {orders.map((order) => (
        <li key={order.id} className="flex items-start justify-between gap-3 rounded-xl border border-[#1A2332]/10 px-3 py-2.5">
          <div className="flex items-start gap-2 min-w-0">
            <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#1A2332] truncate">{order.title || "Court order"}</p>
              <p className="text-[11px] text-[#1A2332]/45">
                {order.documentDate ? String(order.documentDate).slice(0, 10) : "Date unknown"}
                {order.isOfficial !== false ? " · Official court document" : " · Unverified copy"}
              </p>
            </div>
          </div>
          {order.officialSourceUrl ? (
            <a
              href={order.officialSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onDownload?.(order.id)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-primary shrink-0"
            >
              Official PDF <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
