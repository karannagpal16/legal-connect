import { ExternalLink } from "lucide-react";

export function CourtSourceBadge({
  sourceUrl,
  sourceCourt,
  provider,
}: {
  sourceUrl?: string | null;
  sourceCourt?: string | null;
  provider?: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px]">
      <span className="rounded-md border border-[#1A2332]/15 bg-[#1A2332]/5 px-2 py-1 font-semibold text-[#1A2332]/70">
        {sourceCourt || "Official court source"}
      </span>
      {provider ? (
        <span className="rounded-md border border-[#1A2332]/10 px-2 py-1 text-[#1A2332]/45">
          via {provider === "fixture" ? "demo fixture" : provider}
        </span>
      ) : null}
      {sourceUrl ? (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
        >
          Open official record <ExternalLink className="h-3 w-3" />
        </a>
      ) : null}
    </div>
  );
}
