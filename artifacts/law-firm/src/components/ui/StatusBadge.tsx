import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  let colors = "bg-muted text-muted-foreground border-muted-border";
  
  switch (status.toLowerCase()) {
    case "active":
    case "in progress":
    case "open":
      colors = "bg-blue-500/10 text-blue-400 border-blue-500/20";
      break;
    case "completed":
    case "disposed":
      colors = "bg-green-500/10 text-green-400 border-green-500/20";
      break;
    case "pending":
    case "accepted":
      colors = "bg-primary/10 text-primary border-primary/20";
      break;
    case "adjourned":
    case "cancelled":
      colors = "bg-destructive/10 text-destructive-foreground border-destructive/20";
      break;
  }

  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold border", colors, className)}>
      {status}
    </span>
  );
}

export function TaskTypeBadge({ type, className }: { type: string; className?: string }) {
  let colors = "bg-muted text-muted-foreground border-border";
  
  switch (type?.toLowerCase()) {
    case "pass-over":
      colors = "bg-purple-500/10 text-purple-400 border-purple-500/20";
      break;
    case "adjournment":
      colors = "bg-orange-500/10 text-orange-400 border-orange-500/20";
      break;
    case "evidence":
      colors = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      break;
    case "arguments":
      colors = "bg-rose-500/10 text-rose-400 border-rose-500/20";
      break;
  }

  return (
    <span className={cn("px-2.5 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-bold border", colors, className)}>
      {type || "Other"}
    </span>
  );
}
