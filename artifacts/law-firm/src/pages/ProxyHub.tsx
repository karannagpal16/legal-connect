import { useEffect, useMemo, useState } from "react";
import { useListTasks, useDeleteTask } from "@workspace/api-client-react";
import type { Task } from "@workspace/api-client-react";
import {
  Plus,
  MapPin,
  HandCoins,
  Edit2,
  Trash2,
  UserRoundSearch,
  ShieldCheck,
  Camera,
  ClipboardCheck,
  MessageSquareText,
  CheckCircle2,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { StatusBadge, TaskTypeBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { TaskDialog } from "@/components/forms/TaskDialog";
import { useAuth, normaliseRole } from "@/lib/auth";
import { workspaceRequest } from "@/lib/workspace";
import { ActivityAuditTimeline } from "@/components/ActivityAuditTimeline";
import { ProxyFlowBanner, ProxyMissionTimeline } from "@/components/proxy/ProxyFlowTimeline";
import { onNotificationAction } from "@/lib/notificationBus";
import {
  canEditProxyMissionDetails,
  courtMatchScore,
  humanProxyStatus,
  nextActionButtonLabel,
  nextProxyActor,
  proxyUrgencyMeta,
  resolveProxyFlowStage,
} from "@/lib/proxyFlow";

type ProxyTask = Task & {
  cnr?: string;
  roomNo?: string;
  room?: string;
  hearingDate?: string;
  proofStatus?: string;
  conflictDeclaredAt?: string;
  checkedInAt?: string;
  proxyAcceptedAt?: string;
  acceptedBy?: string | number;
  postedBy?: string | number;
  escrowStatus?: string;
  adminQuery?: string;
  amount?: number;
  fee?: string | number;
  court?: string;
  location?: string;
  title?: string;
  urgency?: string;
  timingTier?: string;
  appearanceType?: string;
  assignedProxyName?: string;
  posterName?: string;
  posterProofDecision?: string;
  posterProofReason?: string;
  refundRequested?: boolean;
  passoverScript?: string;
  passoverInstructions?: string;
  taskDescription?: string;
  teaserOnly?: boolean;
  interestStatus?: "interested" | "declined" | null;
  interestCount?: number;
  interests?: Array<{ userId?: string; name?: string; interested?: boolean; at?: string; note?: string | null }>;
  settlement?: { netToProxy?: number; gross?: number; platformFee?: number };
  settlementPreview?: { netToProxy?: number; gross?: number; platformFee?: number };
  mainCounsel?: { name?: string; practiceLabel?: string; practiceCourts?: string };
  proxyCounsel?: { name?: string; practiceLabel?: string; practiceCourts?: string };
  liveTrack?: { headline?: string; nodes?: Array<{ id: string; label: string; state: string; detail?: string }> };
  bookingId?: string;
  paymentLockStatus?: string;
  lockedPayment?: {
    bookingId?: string;
    status?: string;
    collected?: number;
    proxyhubShare?: number;
    proxyShare?: number;
    autoReleaseAt?: string | null;
    complimentary?: boolean;
  };
};

type SimpleFilter = "needs_you" | "waiting" | "available" | "done" | "all";

function formatHearing(value?: string | null) {
  if (!value) return null;
  const date = new Date(String(value).slice(0, 10));
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function roleOnMission(task: ProxyTask, userId?: string | number, isAdmin?: boolean) {
  if (isAdmin) return "admin" as const;
  if (String(task.acceptedBy || "") === String(userId || "")) return "proxy" as const;
  if (String(task.postedBy || "") === String(userId || "")) return "poster" as const;
  return "other" as const;
}

function missionNeedsYou(task: ProxyTask, role: ReturnType<typeof roleOnMission>) {
  if (task.teaserOnly) return task.interestStatus !== "interested" && task.interestStatus !== "declined";
  const stage = resolveProxyFlowStage(task);
  const next = nextProxyActor(task);
  if (role === "admin") {
    return next.actor === "lc" || stage === "proof_submitted" || stage === "counsel_ok" || stage === "counsel_unsatisfied";
  }
  if (role === "proxy") return next.actor === "proxy";
  if (role === "poster") return next.actor === "main_counsel" || String(task.status || "").toLowerCase().includes("query");
  return false;
}

function counselNotes(task: ProxyTask) {
  return String(task.passoverScript || task.passoverInstructions || task.taskDescription || "").trim();
}

export function ProxyHub() {
  const { data: tasks, isLoading } = useListTasks();
  const [filter, setFilter] = useState<SimpleFilter>("needs_you");
  const [textSearch, setTextSearch] = useState("");
  const [focusTaskId, setFocusTaskId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [busyId, setBusyId] = useState("");
  const [proxyByTask, setProxyByTask] = useState<Record<string, string>>({});
  const [proofRejectReason, setProofRejectReason] = useState<Record<string, string>>({});
  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>({});
  const [showLiveSync, setShowLiveSync] = useState(false);
  const [queryNote, setQueryNote] = useState<Record<string, string>>({});
  const [respondNote, setRespondNote] = useState<Record<string, string>>({});
  const { session } = useAuth();
  const role = normaliseRole(session?.user?.role);
  const isAdmin = role === "admin";
  const userId = session?.user?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isAssigning, setIsAssigning] = useState(false);
  const searchString = useSearch();

  const applyTaskFocus = (taskId: string) => {
    if (!taskId) return;
    setFocusTaskId(taskId);
    setTextSearch(taskId);
    setFilter("all");
    window.setTimeout(() => {
      document.getElementById(`proxy-mission-${taskId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
  };

  useEffect(() => {
    const params = new URLSearchParams(searchString.startsWith("?") ? searchString : `?${searchString}`);
    const taskId = params.get("taskId") || "";
    if (taskId) applyTaskFocus(taskId);
  }, [searchString]);

  useEffect(() => onNotificationAction((detail) => {
    const url = detail.resolved.targetUrl || "";
    if (!url.includes("/proxy") && !url.includes("/missions")) return;
    const query = url.includes("?") ? url.slice(url.indexOf("?")) : "";
    const params = new URLSearchParams(query);
    const taskId = params.get("taskId") || detail.resolved.actionPayload?.taskId || "";
    applyTaskFocus(taskId);
  }), []);

  const advocates = useQuery({
    queryKey: ["admin-advocates-proxy"],
    queryFn: () => workspaceRequest<Array<{
      id: string;
      name: string;
      enrollmentNo?: string;
      practiceCourts?: string;
      practiceAreas?: string;
      officeAddress?: string;
    }>>("/api/admin/advocates", session?.token),
    enabled: Boolean(isAdmin && session?.token),
    staleTime: 30_000,
  });
  const advocateList = Array.isArray(advocates.data) ? advocates.data : [];

  const { mutate: deleteTask, isPending: isDeleting } = useDeleteTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        toast({ title: "Mission deleted" });
      },
    },
  });

  const allTasks = useMemo(() => (Array.isArray(tasks) ? (tasks as ProxyTask[]) : []), [tasks]);

  const filteredTasks = useMemo(() => {
    const needle = textSearch.trim().toLowerCase();
    return allTasks.filter((task) => {
      const myRole = roleOnMission(task, userId, isAdmin);
      const stage = resolveProxyFlowStage(task);
      const needsYou = missionNeedsYou(task, myRole);
      const isAvailable = Boolean(task.teaserOnly) || (!task.acceptedBy && !isAdmin && myRole === "other");
      let statusOk = true;
      if (filter === "done") statusOk = stage === "escrow_released" || stage === "refunded";
      else if (filter === "needs_you") statusOk = needsYou && !task.teaserOnly;
      else if (filter === "available") statusOk = Boolean(task.teaserOnly) || (isAvailable && stage === "lc_review");
      else if (filter === "waiting") statusOk = !needsYou && !task.teaserOnly && stage !== "escrow_released" && stage !== "refunded";
      // filter === "all" → statusOk stays true

      if (!statusOk && !needle) return false;
      if (!needle) return statusOk;

      const haystack = [
        task.title,
        task.court,
        task.cnr,
        task.status,
        task.assignedProxyName,
        task.id,
        task.appearanceType,
        task.taskType,
        task.hearingDate,
        task.roomNo,
        task.room,
        counselNotes(task),
        humanProxyStatus(task),
      ].map((value) => String(value || "").toLowerCase());
      const matches = haystack.some((value) => value.includes(needle));
      return matches;
    });
  }, [allTasks, filter, isAdmin, userId, textSearch]);

  const counts = useMemo(() => {
    let needsYou = 0;
    let waiting = 0;
    let done = 0;
    let available = 0;
    for (const task of allTasks) {
      const myRole = roleOnMission(task, userId, isAdmin);
      const stage = resolveProxyFlowStage(task);
      if (task.teaserOnly) available += 1;
      else if (stage === "escrow_released" || stage === "refunded") done += 1;
      else if (missionNeedsYou(task, myRole)) needsYou += 1;
      else waiting += 1;
    }
    return { needsYou, waiting, done, all: allTasks.length, available };
  }, [allTasks, isAdmin, userId]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
  };

  const runAction = async (taskId: string | number, path: string, init?: RequestInit, successTitle?: string) => {
    setBusyId(String(taskId));
    try {
      await workspaceRequest(path, session?.token, init);
      await refresh();
      toast({ title: successTitle || "Updated" });
    } catch (error) {
      toast({ title: "Could not update", description: (error as Error).message, variant: "destructive" });
    } finally {
      setBusyId("");
    }
  };

  const handleAssign = async (id: number | string) => {
    const proxyId = proxyByTask[String(id)];
    const proxy = advocateList.find((item) => item.id === proxyId);
    if (!proxyId || !proxy) {
      toast({ title: "Pick an advocate", description: "Choose who should appear in court.", variant: "destructive" });
      return;
    }
    setIsAssigning(true);
    try {
      try {
        await workspaceRequest(`/api/admin/proxy-tasks/${id}/assign-proxy`, session?.token, {
          method: "POST",
          body: JSON.stringify({ proxyAdvocateId: proxy.id, proxyAdvocateName: proxy.name }),
        });
      } catch {
        await workspaceRequest(`/api/tasks/${id}/accept`, session?.token, {
          method: "POST",
          body: JSON.stringify({ proxyAdvocateId: proxy.id, proxyAdvocateName: proxy.name }),
        });
      }
      await refresh();
      toast({ title: "Proxy assigned", description: `${proxy.name} can now check in and upload proof.` });
    } catch (error) {
      toast({ title: "Assignment failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsAssigning(false);
    }
  };

  const uploadProof = async (task: ProxyTask) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf,image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setBusyId(String(task.id));
      try {
        const response = await fetch(`/api/tasks/${task.id}/proof`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.token}`,
            "Content-Type": file.type || "application/octet-stream",
            "X-File-Name": file.name,
          },
          body: file,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Proof upload failed.");
        await refresh();
        toast({ title: "Order sheet uploaded", description: "Waiting for the posting counsel to confirm." });
      } catch (error) {
        toast({ title: "Upload failed", description: (error as Error).message, variant: "destructive" });
      } finally {
        setBusyId("");
      }
    };
    input.click();
  };

  // Operational record of the agreed service window — never a quality rating of an advocate.
  const logServiceRecord = async (task: ProxyTask) => {
    const serviceWindowMet = window.confirm("Was the appearance completed within the agreed service window?\n\nOK = yes · Cancel = no");
    const recordComplete = window.confirm("Is the appearance record (order sheet and next date) complete?\n\nOK = yes · Cancel = no");
    const note = window.prompt("Optional operational note (no comments on competence)", "") || "";
    await runAction(task.id, `/api/tasks/${task.id}/service-record`, {
      method: "POST",
      body: JSON.stringify({ serviceWindowMet, recordComplete, note }),
    }, "Service record saved");
  };

  const filters: Array<{ id: SimpleFilter; label: string; count: number }> = [
    { id: "needs_you", label: "Needs you", count: counts.needsYou },
    ...(!isAdmin ? [{ id: "available" as const, label: "Open board", count: counts.available }] : []),
    { id: "waiting", label: "Waiting", count: counts.waiting },
    { id: "done", label: "Done", count: counts.done },
    { id: "all", label: "All", count: counts.all },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">
            {isAdmin ? "Court missions" : "My court missions"}
          </h1>
          <p className="mt-1 text-muted-foreground max-w-xl">
            {isAdmin
              ? "Assign a proxy. LC locks the fee against a booking ID, then split-settles to ProxyHub and the appearing advocate after proof."
              : "Post a court appearance. Legal Connect locks your payment until the work is done, then split-settles ProxyHub and the proxy."}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingTask(null);
            setDialogOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-3.5 rounded-xl font-bold shadow-md min-h-[48px]"
        >
          <Plus className="w-5 h-5" />
          Post a mission
        </button>
      </div>

      <ProxyFlowBanner />

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {filters.map((item) => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
              filter === item.id
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-card border border-border text-foreground hover:border-primary/40"
            }`}
          >
            {item.label}
            <span className="ml-1.5 opacity-70">{item.count}</span>
          </button>
        ))}
      </div>

      <label className="relative block">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={textSearch}
          onChange={(event) => {
            setTextSearch(event.target.value);
            if (focusTaskId) setFocusTaskId("");
          }}
          placeholder="Search CNR, court, mission title, proxy…"
          aria-label="Search court missions"
          className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary/40"
        />
      </label>

      {isAdmin ? (
        <div className="rounded-2xl border border-border bg-card">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 text-left"
            onClick={() => setShowLiveSync((value) => !value)}
          >
            <span className="text-sm font-semibold text-foreground">Live activity (admin)</span>
            {showLiveSync ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showLiveSync ? (
            <div className="px-2 pb-3">
              <ActivityAuditTimeline
                title="Live Sync"
                emptyText="Assignments and proof updates appear here."
                limit={8}
                compact
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 bg-card rounded-2xl animate-pulse border border-border" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <Briefcase className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-bold text-foreground">
            {textSearch.trim()
              ? "No missions match that search"
              : filter === "needs_you"
                ? "Nothing needs you right now"
                : "No missions here"}
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {textSearch.trim()
              ? "Try CNR, court name, or clear the search box."
              : isAdmin
                ? "New paid posts will show up under Needs you."
                : "Post a mission, or wait for Legal Connect to assign you one."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((t) => {
            const myRole = roleOnMission(t, userId, isAdmin);
            const isProxy = myRole === "proxy";
            const isPoster = myRole === "poster";
            const stage = resolveProxyFlowStage(t);
            const urgency = proxyUrgencyMeta(t.urgency || t.timingTier);
            const next = nextProxyActor(t);
            const pendingAdmin = stage === "lc_review" || stage === "posted_escrow";
            const needsProxyAccept = stage === "proxy_assigned" && !t.proxyAcceptedAt;
            const acceptedLike = stage === "proxy_accepted" || stage === "proxy_checked_in";
            const canLifecycle = isProxy || isAdmin;
            const canEditDetails = (isAdmin || isPoster) && canEditProxyMissionDetails(t);
            const detailsOpen = Boolean(openDetails[String(t.id)]);
            const fee = Number(t.amount ?? t.fee ?? 0);
            const notes = counselNotes(t);
            const interested = (t.interests || []).filter((entry) => entry.interested !== false);
            const assignedName = t.proxyCounsel?.name
              || t.assignedProxyName
              || advocateList.find((a) => a.id === String(t.acceptedBy || ""))?.name
              || (t.acceptedBy ? "Assigned proxy" : null);
            const whoLine = t.teaserOnly
              ? (t.interestStatus === "interested"
                ? "You marked interest — waiting for Legal Connect"
                : t.interestStatus === "declined"
                  ? "You passed on this mission"
                  : "Open for interest — limited details until assigned")
              : isAdmin
                ? (assignedName
                  ? `Main: ${t.mainCounsel?.name || t.posterName || "Counsel"}${t.mainCounsel?.practiceLabel ? ` · ${t.mainCounsel.practiceLabel}` : ""} → Proxy: ${assignedName}${t.proxyCounsel?.practiceLabel ? ` · ${t.proxyCounsel.practiceLabel}` : ""}`
                  : `Waiting for assignment${interested.length ? ` · ${interested.length} interested` : ""}`)
                : isProxy
                  ? "Assigned to you"
                  : isPoster
                    ? (assignedName ? `Proxy: ${assignedName}${t.proxyCounsel?.practiceLabel ? ` · ${t.proxyCounsel.practiceLabel}` : ""}` : "Waiting for Legal Connect")
                    : "Court mission";

            return (
              <article
                id={`proxy-mission-${t.id}`}
                key={t.id}
                className={`bg-card border rounded-2xl p-5 flex flex-col shadow-sm ${
                  String(focusTaskId) === String(t.id)
                    ? "border-primary ring-2 ring-primary/30"
                    : isProxy || missionNeedsYou(t, myRole)
                      ? "border-primary/50"
                      : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <TaskTypeBadge type={String(t.taskType || t.appearanceType || "Other")} />
                  <StatusBadge status={String(t.teaserOnly ? "Open board" : t.status || humanProxyStatus(t))} task={t} />
                </div>

                <h3 className="text-xl font-serif font-bold text-foreground leading-snug">
                  {String(t.taskType || t.appearanceType || "Appearance")}
                  {" · "}
                  {t.location || t.court || "Court"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{whoLine}</p>

                {t.teaserOnly ? (
                  <div className="mt-4 mb-2 rounded-xl bg-muted/40 border border-border p-3 text-sm text-muted-foreground">
                    Court and appearance type only. Full counsel notes, CNR, room, and fee unlock after Legal Connect assigns you.
                  </div>
                ) : (
                  <>
                    <div className="mt-3 space-y-1.5 text-sm text-foreground">
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                        <span>
                          {formatHearing(t.hearingDate) || "Hearing date TBD"}
                          {t.roomNo || t.room ? ` · Room ${t.roomNo || t.room}` : ""}
                          {t.cnr ? ` · CNR ${t.cnr}` : ""}
                        </span>
                      </p>
                      {fee > 0 ? (
                        <p className="flex items-center gap-2 font-semibold">
                          <HandCoins className="w-4 h-4 text-primary shrink-0" />
                          ₹{fee.toLocaleString("en-IN")} locked
                          <span className="font-normal text-muted-foreground">
                            · {urgency.label}
                            {t.lockedPayment?.bookingId || t.bookingId ? ` · ${t.lockedPayment?.bookingId || t.bookingId}` : ""}
                            {t.lockedPayment?.status ? ` · ${t.lockedPayment.status}` : ""}
                          </span>
                        </p>
                      ) : null}
                      {(isProxy || isAdmin || isPoster) && notes ? (
                        <p className="rounded-lg bg-primary/5 border border-primary/15 p-2.5 text-foreground">
                          <span className="font-semibold text-primary">Main counsel notes: </span>
                          {notes}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-4 mb-4">
                      <ProxyMissionTimeline task={t} />
                    </div>
                  </>
                )}

                <div className="mt-auto space-y-2 pt-3 border-t border-border">
                  {/* Open board — interest */}
                  {t.teaserOnly ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        className="bg-primary text-primary-foreground font-bold py-3 rounded-xl"
                        disabled={busyId === String(t.id) || t.interestStatus === "interested"}
                        onClick={() => runAction(t.id, `/api/tasks/${t.id}/interest`, {
                          method: "POST",
                          body: JSON.stringify({ interested: true }),
                        }, "Interest sent to Legal Connect")}
                      >
                        {t.interestStatus === "interested" ? "Interested" : "I'm interested"}
                      </button>
                      <button
                        className="border border-border font-semibold py-3 rounded-xl"
                        disabled={busyId === String(t.id) || t.interestStatus === "declined"}
                        onClick={() => runAction(t.id, `/api/tasks/${t.id}/interest`, {
                          method: "POST",
                          body: JSON.stringify({ interested: false }),
                        }, "Marked as not interested")}
                      >
                        {t.interestStatus === "declined" ? "Passed" : "Not interested"}
                      </button>
                    </div>
                  ) : null}

                  {/* Admin: assign — prefer interested advocates */}
                  {isAdmin && pendingAdmin && !t.teaserOnly ? (
                    <div className="space-y-2">
                      {interested.length ? (
                        <p className="text-xs text-muted-foreground">
                          Interested: {interested.map((entry) => entry.name || entry.userId).join(", ")}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">No interest yet — you can still assign any verified advocate.</p>
                      )}
                      <select
                        value={proxyByTask[String(t.id)] || ""}
                        onChange={(event) => setProxyByTask((current) => ({ ...current, [String(t.id)]: event.target.value }))}
                        className="w-full p-3 rounded-xl bg-background border border-border outline-none"
                      >
                        <option value="">Choose advocate…</option>
                        {[...advocateList].sort((a, b) => {
                          const aInt = interested.some((entry) => String(entry.userId) === String(a.id)) ? 0 : 1;
                          const bInt = interested.some((entry) => String(entry.userId) === String(b.id)) ? 0 : 1;
                          if (aInt !== bInt) return aInt - bInt;
                          const aCourt = courtMatchScore(t.court || t.location, a.practiceCourts) * -1;
                          const bCourt = courtMatchScore(t.court || t.location, b.practiceCourts) * -1;
                          if (aCourt !== bCourt) return aCourt - bCourt;
                          return String(a.name).localeCompare(String(b.name));
                        }).map((advocate) => {
                          const isInt = interested.some((entry) => String(entry.userId) === String(advocate.id));
                          const match = courtMatchScore(t.court || t.location, advocate.practiceCourts);
                          return (
                            <option key={advocate.id} value={advocate.id}>
                              {isInt ? "★ " : ""}{match ? "◎ " : ""}{advocate.name}
                              {advocate.practiceCourts ? ` · ${advocate.practiceCourts}` : ""}
                              {advocate.enrollmentNo ? ` · ${advocate.enrollmentNo}` : ""}
                            </option>
                          );
                        })}
                      </select>
                      <button
                        onClick={() => handleAssign(t.id)}
                        disabled={isAssigning || busyId === String(t.id) || !proxyByTask[String(t.id)]}
                        className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                      >
                        <UserRoundSearch className="w-5 h-5" />
                        {isAssigning ? "Assigning…" : "Acknowledge & assign proxy"}
                      </button>
                    </div>
                  ) : null}

                  {/* Proxy accepts after LC assignment */}
                  {!t.teaserOnly && canLifecycle && needsProxyAccept ? (
                    <button
                      className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold"
                      disabled={busyId === String(t.id)}
                      onClick={() => runAction(t.id, `/api/tasks/${t.id}/proxy-accept`, {
                        method: "POST",
                        body: "{}",
                      }, "Mission accepted")}
                    >
                      Accept this mission
                    </button>
                  ) : null}

                  {/* Poster answering LC query */}
                  {!t.teaserOnly && isPoster && String(t.status) === "query_raised" ? (
                    <div className="space-y-2">
                      {t.adminQuery ? <p className="text-xs text-muted-foreground">Question: {t.adminQuery}</p> : null}
                      <textarea
                        value={respondNote[String(t.id)] || ""}
                        onChange={(e) => setRespondNote((c) => ({ ...c, [String(t.id)]: e.target.value }))}
                        placeholder="Your reply…"
                        className="w-full p-3 rounded-xl bg-background border border-border outline-none min-h-[72px]"
                      />
                      <button
                        className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl"
                        disabled={busyId === String(t.id) || (respondNote[String(t.id)] || "").trim().length < 4}
                        onClick={() => runAction(t.id, `/api/tasks/${t.id}/respond-query`, {
                          method: "POST",
                          body: JSON.stringify({ response: respondNote[String(t.id)] }),
                        }, "Reply sent")}
                      >
                        Send reply
                      </button>
                    </div>
                  ) : null}

                  {/* Proxy lifecycle — one clear button */}
                  {!t.teaserOnly && canLifecycle && acceptedLike && !t.conflictDeclaredAt ? (
                    <button
                      className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold flex items-center justify-center gap-2"
                      disabled={busyId === String(t.id)}
                      onClick={() => runAction(t.id, `/api/tasks/${t.id}/conflict-declare`, {
                        method: "POST",
                        body: JSON.stringify({ declared: true, note: "No conflict of interest for this appearance." }),
                      }, "No conflict confirmed")}
                    >
                      <ShieldCheck className="w-4 h-4" /> Confirm no conflict
                    </button>
                  ) : null}

                  {!t.teaserOnly && canLifecycle && t.conflictDeclaredAt && !t.checkedInAt ? (
                    <button
                      className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold"
                      disabled={busyId === String(t.id)}
                      onClick={() => runAction(t.id, `/api/tasks/${t.id}/check-in`, { method: "POST", body: "{}" }, "Checked in")}
                    >
                      Check in at court
                    </button>
                  ) : null}

                  {!t.teaserOnly && canLifecycle && t.checkedInAt && !["submitted", "lc_verified", "poster_approved", "approved"].includes(String(t.proofStatus || "")) ? (
                    <button
                      className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold flex items-center justify-center gap-2"
                      disabled={busyId === String(t.id)}
                      onClick={() => uploadProof(t)}
                    >
                      <Camera className="w-4 h-4" />
                      {t.proofStatus === "rejected" ? "Re-upload order sheet" : "Upload order sheet"}
                    </button>
                  ) : null}

                  {/* Poster reviews proof — only after LC verification */}
                  {!t.teaserOnly && isPoster && t.proofStatus === "lc_verified" ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Legal Connect verified this order sheet. Satisfied releases a split settlement to ProxyHub and the appearing advocate. No reply within 24–48 hours auto-approves.</p>
                      <button
                        className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold"
                        disabled={busyId === String(t.id)}
                        onClick={() => runAction(t.id, `/api/tasks/${t.id}/proof-review`, {
                          method: "POST",
                          body: JSON.stringify({ decision: "ok" }),
                        }, "Marked satisfied")}
                      >
                        <CheckCircle2 className="w-4 h-4 inline mr-1" /> Satisfied
                      </button>
                      <textarea
                        value={proofRejectReason[String(t.id)] || ""}
                        onChange={(e) => setProofRejectReason((c) => ({ ...c, [String(t.id)]: e.target.value }))}
                        placeholder="If not satisfied, give the reason…"
                        className="w-full p-3 rounded-xl bg-background border border-border outline-none min-h-[64px]"
                      />
                      <button
                        className="w-full border border-destructive/40 text-destructive font-semibold py-2.5 rounded-xl"
                        disabled={busyId === String(t.id) || (proofRejectReason[String(t.id)] || "").trim().length < 8}
                        onClick={() => runAction(t.id, `/api/tasks/${t.id}/proof-review`, {
                          method: "POST",
                          body: JSON.stringify({ decision: "not_ok", reason: proofRejectReason[String(t.id)] }),
                        }, "Not satisfied — refund requested")}
                      >
                        Not satisfied — request refund
                      </button>
                      <button
                        className="w-full border border-border font-semibold py-2 rounded-xl text-sm"
                        disabled={busyId === String(t.id) || (proofRejectReason[String(t.id)] || "").trim().length < 8}
                        onClick={() => runAction(t.id, `/api/tasks/${t.id}/proof-review`, {
                          method: "POST",
                          body: JSON.stringify({ decision: "reupload", reason: proofRejectReason[String(t.id)] }),
                        }, "Asked for fresh proof")}
                      >
                        Ask for a fresh scan instead
                      </button>
                    </div>
                  ) : null}

                  {/* LC verifies proof first, then forwards to poster */}
                  {!t.teaserOnly && isAdmin && t.proofStatus === "submitted" ? (
                    <button
                      className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold"
                      disabled={busyId === String(t.id)}
                      onClick={() => runAction(t.id, "/api/admin/task-action", {
                        method: "POST",
                        body: JSON.stringify({ taskId: t.id, action: "mark_proof_approved", reason: "LC verified order sheet" }),
                      }, "Proof verified — sent to posting counsel")}
                    >
                      Verify proof & send to counsel
                    </button>
                  ) : null}

                  {/* After satisfied: Release OR Refund */}
                  {!t.teaserOnly && isAdmin && stage === "counsel_ok" && String(t.escrowStatus || "").toLowerCase() !== "released" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold"
                        disabled={busyId === String(t.id)}
                        onClick={() => {
                          if (!window.confirm("Release split settlement? ProxyHub receives only its flat merchant share; the appearing advocate receives the professional fee. Gross is not sent to ProxyHub first.")) return;
                          runAction(t.id, "/api/admin/task-action", {
                            method: "POST",
                            body: JSON.stringify({ taskId: t.id, action: "release_payment" }),
                          }, "Payment released");
                        }}
                      >
                        Release funds
                        {t.settlement?.netToProxy != null || t.settlementPreview?.netToProxy != null
                          ? ` · ₹${Number(t.settlement?.netToProxy ?? t.settlementPreview?.netToProxy).toLocaleString("en-IN")}`
                          : ""}
                      </button>
                      <button
                        className="w-full border border-destructive/40 text-destructive font-semibold rounded-xl py-3"
                        disabled={busyId === String(t.id)}
                        onClick={() => {
                          const reason = window.prompt("Refund reason (required)", "Admin chose refund after counsel satisfaction review") || "";
                          if (reason.trim().length < 8) {
                            toast({ title: "Reason required", description: "Enter at least 8 characters.", variant: "destructive" });
                            return;
                          }
                          if (!window.confirm("Mark this Work Completion Hold refunded? Money movement stays manual.")) return;
                          runAction(t.id, "/api/admin/task-action", {
                            method: "POST",
                            body: JSON.stringify({ taskId: t.id, action: "refund", reason }),
                          }, "Refund acknowledged");
                        }}
                      >
                        Refund instead
                      </button>
                    </div>
                  ) : null}

                  {/* After not satisfied: Acknowledge & refund */}
                  {!t.teaserOnly && isAdmin && stage === "counsel_unsatisfied" ? (
                    <div className="space-y-2">
                      {t.posterProofReason ? (
                        <p className="text-xs text-muted-foreground rounded-lg border border-border bg-muted/30 p-2">
                          Main counsel reason: {t.posterProofReason}
                        </p>
                      ) : null}
                      <button
                        className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold"
                        disabled={busyId === String(t.id)}
                        onClick={() => {
                          const reason = t.posterProofReason || window.prompt("Acknowledge refund reason", "") || "";
                          if (String(reason).trim().length < 8) {
                            toast({ title: "Reason required", variant: "destructive" });
                            return;
                          }
                          if (!window.confirm("Acknowledge reason and mark refunded? Manual bank/UPI refund still required.")) return;
                          runAction(t.id, "/api/admin/task-action", {
                            method: "POST",
                            body: JSON.stringify({ taskId: t.id, action: "refund", reason }),
                          }, "Refund acknowledged");
                        }}
                      >
                        Acknowledge reason & refund
                      </button>
                    </div>
                  ) : null}

                  {/* Waiting state — no button, just calm copy */}
                  {!t.teaserOnly && !missionNeedsYou(t, myRole) && stage !== "escrow_released" && stage !== "refunded" && !(isAdmin && pendingAdmin) && stage !== "counsel_ok" && stage !== "counsel_unsatisfied" ? (
                    <p className="text-sm text-muted-foreground text-center py-1">
                      Waiting on {next.label.toLowerCase()} — {next.action.toLowerCase()}
                    </p>
                  ) : null}

                  {!t.teaserOnly && (isPoster || isProxy) && stage === "escrow_released" ? (
                    <button
                      className="w-full border border-border rounded-xl py-2.5 font-semibold flex items-center justify-center gap-2"
                      disabled={busyId === String(t.id)}
                      onClick={() => logServiceRecord(t)}
                    >
                      <ClipboardCheck className="w-4 h-4" /> Log service record
                    </button>
                  ) : null}

                  {!t.teaserOnly ? (
                  <button
                    type="button"
                    className="w-full text-xs font-semibold text-muted-foreground py-1.5 flex items-center justify-center gap-1"
                    onClick={() => setOpenDetails((c) => ({ ...c, [String(t.id)]: !detailsOpen }))}
                  >
                    {detailsOpen ? <>Hide details <ChevronUp className="w-3.5 h-3.5" /></> : <>More details <ChevronDown className="w-3.5 h-3.5" /></>}
                  </button>
                  ) : null}

                  {!t.teaserOnly && detailsOpen ? (
                    <div className="space-y-2 rounded-xl bg-muted/30 border border-border p-3 text-xs text-muted-foreground">
                      <p>Due: {urgency.slaShort}</p>
                      <p>Proof: {t.proofStatus || "not uploaded yet"}</p>
                      <p>Payment lock: {t.lockedPayment?.status || t.escrowStatus || "—"}{t.lockedPayment?.bookingId || t.bookingId ? ` · ${t.lockedPayment?.bookingId || t.bookingId}` : ""}</p>
                      {t.lockedPayment?.autoReleaseAt && String(t.lockedPayment.status || "") === "LOCKED" ? (
                        <p>Auto-approval: {new Date(t.lockedPayment.autoReleaseAt).toLocaleString("en-IN")}</p>
                      ) : null}
                      {t.lockedPayment ? (
                        <p>Split: ProxyHub ₹{(t.lockedPayment.proxyhubShare || 0).toLocaleString("en-IN")} · proxy ₹{(t.lockedPayment.proxyShare || 0).toLocaleString("en-IN")}</p>
                      ) : null}
                      {notes ? <p className="text-foreground"><strong>Main counsel notes:</strong> {notes}</p> : null}
                      {isPoster && String(t.lockedPayment?.status || t.escrowStatus || "").toUpperCase().includes("LOCK") ? (
                        <button
                          className="w-full border border-destructive/40 text-destructive font-semibold py-2 rounded-lg"
                          disabled={busyId === String(t.id)}
                          onClick={() => {
                            const reason = window.prompt("Dispute reason (min 8 characters)", "") || "";
                            if (reason.trim().length < 8) {
                              toast({ title: "Reason required", description: "Enter at least 8 characters.", variant: "destructive" });
                              return;
                            }
                            runAction(t.id, `/api/tasks/${t.id}/dispute`, {
                              method: "POST",
                              body: JSON.stringify({ reason }),
                            }, "Dispute opened — auto-approval paused");
                          }}
                        >
                          Dispute locked payment
                        </button>
                      ) : null}
                      {next.label ? <p>Next actor: {next.label} — {next.action}</p> : null}

                      {(isPoster || isProxy || isAdmin) && !pendingAdmin ? (
                        <div className="space-y-2 pt-2 border-t border-border">
                          <textarea
                            value={queryNote[String(t.id)] || ""}
                            onChange={(e) => setQueryNote((c) => ({ ...c, [String(t.id)]: e.target.value }))}
                            placeholder="Optional note to Legal Connect…"
                            className="w-full p-2.5 rounded-lg bg-background border border-border outline-none min-h-[60px] text-sm"
                          />
                          <button
                            className="w-full border border-border font-semibold py-2 rounded-lg flex items-center justify-center gap-2 text-foreground"
                            disabled={busyId === String(t.id) || (queryNote[String(t.id)] || "").trim().length < 4}
                            onClick={() => runAction(t.id, `/api/proxy-tasks/${t.id}/qa`, {
                              method: "POST",
                              body: JSON.stringify({
                                message: queryNote[String(t.id)],
                                kind: isAdmin ? "lc_moderation" : "counsel_query",
                              }),
                            }, "Note posted")}
                          >
                            <MessageSquareText className="w-4 h-4" /> Send note
                          </button>
                        </div>
                      ) : null}

                      {isAdmin && pendingAdmin ? (
                        <div className="space-y-2 pt-2 border-t border-border">
                          <textarea
                            value={queryNote[String(t.id)] || ""}
                            onChange={(e) => setQueryNote((c) => ({ ...c, [String(t.id)]: e.target.value }))}
                            placeholder="Ask the poster a question (optional)…"
                            className="w-full p-2.5 rounded-lg bg-background border border-border outline-none min-h-[60px] text-sm"
                          />
                          <button
                            className="w-full border border-border font-semibold py-2 rounded-lg text-foreground"
                            disabled={busyId === String(t.id) || (queryNote[String(t.id)] || "").trim().length < 8}
                            onClick={() => runAction(t.id, `/api/tasks/${t.id}/raise-query`, {
                              method: "POST",
                              body: JSON.stringify({ query: queryNote[String(t.id)] }),
                            }, "Question sent")}
                          >
                            Ask poster a question
                          </button>
                        </div>
                      ) : null}

                      <div className="flex items-center gap-2 pt-1">
                        {canEditDetails ? (
                          <button
                            onClick={() => {
                              setEditingTask(t);
                              setDialogOpen(true);
                            }}
                            className="p-2 text-muted-foreground hover:text-primary rounded-lg"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        ) : null}
                        {(isAdmin || (isPoster && pendingAdmin)) ? (
                          <button
                            onClick={() => {
                              if (confirm("Delete this mission?")) deleteTask({ id: Number(t.id) });
                            }}
                            disabled={isDeleting}
                            className="p-2 text-muted-foreground hover:text-destructive rounded-lg"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : null}
                        <span className="ml-auto text-[10px] opacity-60">{nextActionButtonLabel(t)}</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} editingTask={editingTask} />
    </div>
  );
}
