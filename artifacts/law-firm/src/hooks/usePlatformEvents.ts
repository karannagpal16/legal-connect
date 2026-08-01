import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { workspaceRequest } from "@/lib/workspace";

export type PlatformEvent = {
  eventId: string;
  timestamp: string;
  eventType: string;
  title?: string;
  message?: string;
  actor?: {
    userId?: string | null;
    name?: string;
    role?: string;
    barEnrollmentNo?: string | null;
  };
  targets?: {
    clientId?: string | null;
    advocateId?: string | null;
    caseId?: string | null;
    bookingId?: string | null;
    taskId?: string | null;
    questId?: string | null;
  };
  payload?: Record<string, unknown>;
};

type LiveFeed = {
  ok: boolean;
  events: PlatformEvent[];
  count: number;
  latestTimestamp?: string | null;
  serverTime?: string;
};

const INVALIDATION_PREFIXES = [
  "notifications-unread-count",
  "notifications-feed",
  "client-workspace",
  "advocate-workspace",
  "admin-intakes",
  "admin-control-desk",
  "admin-control-desk-tasks",
  "admin-advocates-proxy",
  "/api/tasks",
  "/api/bookings",
  "/api/cases",
  "/api/intern-quests",
  "platform-events",
] as const;

/**
 * Polls /api/events/live every ~2.5s and invalidates portal caches when new events arrive.
 * Mount once in PortalLayout so Client / Advocate / Admin / Intern dashboards stay in sync.
 */
export function usePlatformLiveSync(pollMs = 2500) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const latestRef = useRef<string | null>(null);
  const token = session?.token;

  const feed = useQuery({
    queryKey: ["platform-events-live", token],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "40" });
      if (latestRef.current) params.set("since", latestRef.current);
      return workspaceRequest<LiveFeed>(`/api/events/live?${params.toString()}`, token);
    },
    enabled: Boolean(token),
    refetchInterval: pollMs,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const events = feed.data?.events || [];
    if (!events.length) return;

    const newest = events[0]?.timestamp || null;
    const previous = latestRef.current;
    if (newest && (!previous || new Date(newest).getTime() > new Date(previous).getTime())) {
      // First successful snapshot: seed cursor without forcing a full refetch storm.
      if (!previous) {
        latestRef.current = newest;
        return;
      }
      latestRef.current = newest;
      for (const key of INVALIDATION_PREFIXES) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
    }
  }, [feed.data, queryClient]);

  return feed;
}

export function usePlatformEventTimeline(options?: {
  caseId?: string | null;
  taskId?: string | null;
  bookingId?: string | null;
  limit?: number;
  enabled?: boolean;
}) {
  const { session } = useAuth();
  const token = session?.token;
  const caseId = options?.caseId || "";
  const taskId = options?.taskId || "";
  const bookingId = options?.bookingId || "";
  const limit = options?.limit ?? 30;

  return useQuery({
    queryKey: ["platform-events", token, caseId, taskId, bookingId, limit],
    queryFn: () => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (caseId) params.set("caseId", caseId);
      if (taskId) params.set("taskId", taskId);
      if (bookingId) params.set("bookingId", bookingId);
      return workspaceRequest<LiveFeed>(`/api/events/live?${params.toString()}`, token);
    },
    enabled: Boolean(token) && (options?.enabled ?? true),
    refetchInterval: 4000,
    staleTime: 2000,
  });
}
