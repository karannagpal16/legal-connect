import { cn } from "@/components/layout/Layout";

type StatusType = "Active" | "Pending" | "Closed" | "Adjourned" | "In Progress" | "Completed" | "Cancelled";

export function StatusBadge({ status, className }: { status: StatusType | string, className?: string }) {
  const getStyles = () => {
    switch (status) {
      case "Active":
      case "In Progress":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "Completed":
      case "Closed":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "Pending":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "Adjourned":
      case "Cancelled":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm shadow-sm whitespace-nowrap", getStyles(), className)}>
      {status}
    </span>
  );
}
