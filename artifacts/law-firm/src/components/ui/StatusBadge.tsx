import { cn } from "@/lib/utils";
import { humanProxyStatus, type ProxyFlowTaskLike } from "@/lib/proxyFlow";

interface StatusBadgeProps {
  status: string;
  className?: string;
  task?: ProxyFlowTaskLike;
}

export function StatusBadge({ status, className, task }: StatusBadgeProps) {
  const label = task ? humanProxyStatus({ ...task, status }) : status;
  const key = String(label || status || "").toLowerCase();
  let colors = "bg-muted text-muted-foreground border-border";

  if (key.includes("release") || key.includes("complete") || key.includes("ok")) {
    colors = "bg-green-500/10 text-green-700 border-green-500/20";
  } else if (key.includes("proof") || key.includes("check")) {
    colors = "bg-amber-500/10 text-amber-800 border-amber-500/25";
  } else if (key.includes("assign") || key.includes("proxy")) {
    colors = "bg-sky-500/10 text-sky-800 border-sky-500/20";
  } else if (key.includes("review") || key.includes("pending") || key.includes("lc") || key.includes("query")) {
    colors = "bg-primary/10 text-primary border-primary/20";
  } else if (key.includes("open") || key.includes("paid") || key.includes("posted")) {
    colors = "bg-blue-500/10 text-blue-700 border-blue-500/20";
  } else if (key.includes("cancel") || key.includes("reject")) {
    colors = "bg-destructive/10 text-destructive border-destructive/20";
  }

  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold border", colors, className)}>
      {label}
    </span>
  );
}

export function TaskTypeBadge({ type, className }: { type: string; className?: string }) {
  let colors = "bg-muted text-muted-foreground border-border";

  switch (type?.toLowerCase()) {
    case "pass-over":
      colors = "bg-violet-500/10 text-violet-700 border-violet-500/20";
      break;
    case "adjournment":
      colors = "bg-orange-500/10 text-orange-700 border-orange-500/20";
      break;
    case "evidence":
      colors = "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
      break;
    case "arguments":
      colors = "bg-rose-500/10 text-rose-700 border-rose-500/20";
      break;
  }

  return (
    <span className={cn("px-2.5 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-bold border", colors, className)}>
      {type || "Other"}
    </span>
  );
}
