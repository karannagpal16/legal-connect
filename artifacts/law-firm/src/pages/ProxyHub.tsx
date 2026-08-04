import { useMemo, useState } from "react";
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
  Star,
  MessageSquareText,
  CheckCircle2,
  Briefcase,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { StatusBadge, TaskTypeBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { TaskDialog } from "@/components/forms/TaskDialog";
import { useAuth, normaliseRole } from "@/lib/auth";
import { workspaceRequest } from "@/lib/workspace";
import { ActivityAuditTimeline } from "@/components/ActivityAuditTimeline";
import { ProxyFlowBanner, ProxyMissionTimeline } from "@/components/proxy/ProxyFlowTimeline";
import {
  canEditProxyMissionDetails,
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
  acceptedBy?: string | number;
  postedBy?: string | number;
  escrowStatus?: string;
  adminQuery?: string;
  amount?: number;
  fee?: string | number;
  court?: string;
  title?: string;
  urgency?: string;
  timingTier?: string;
  appearanceType?: string;
  assignedProxyName?: string;
  posterProofDecision?: string;
  posterProofReason?: string;
  settlement?: { netToProxy?: number; gross?: number };
  settlementPreview?: { netToProxy?: number; gross?: number };
};

type SimpleFilter = "needs_you" | "waiting" | "done" | "all";

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
  const stage = resolveProxyFlowStage(task);
  const next = nextProxyActor(task);
  if (role === "admin") {
    return next.actor === "lc" || (stage === "proof_submitted" && !task.posterProofDecision);
  }
  if (role === "proxy") return next.actor === "proxy";
  if (role === "poster") return next.actor === "main_counsel" || String(task.status || "").toLowerCase().includes("query");
  return false;
}

export function ProxyHub() {
  const { data: tasks, isLoading } = useListTasks();
  const [filter, setFilter] = useState<SimpleFilter>("needs_you");
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

  const advocates = useQuery({
    queryKey: ["admin-advocates-proxy"],
    queryFn: () => workspaceRequest<Array<{ id: string; name: string; enrollmentNo?: string }>>("/api/admin/advocates", session?.token),
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
    return allTasks.filter((task) => {
      const myRole = roleOnMission(task, userId, isAdmin);
      const stage = resolveProxyFlowStage(task);
      const needsYou = missionNeedsYou(task, myRole);
      if (filter === "all") return true;
      if (filter === "done") return stage === "escrow_released";
      if (filter === "needs_you") return needsYou;
      return !needsYou && stage !== "escrow_released";
    });
  }, [allTasks, filter, isAdmin, userId]);

  const counts = useMemo(() => {
    let needsYou = 0;
    let waiting = 0;
    let done = 0;
    for (const task of allTasks) {
      const myRole = roleOnMission(task, userId, isAdmin);
      const stage = resolveProxyFlowStage(task);
      if (stage === "escrow_released") done += 1;
      else if (missionNeedsYou(task, myRole)) needsYou += 1;
      else waiting += 1;
    }
    return { needsYou, waiting, done, all: allTasks.length };
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

  const rateTask = async (task: ProxyTask) => {
    const starsRaw = window.prompt("Rate this mission (1-5)", "5");
    if (!starsRaw) return;
    const stars = Number(starsRaw);
    const comment = window.prompt("Optional comment", "") || "";
    await runAction(task.id, `/api/tasks/${task.id}/rate`, {
      method: "POST",
      body: JSON.stringify({ stars, comment }),
    }, "Rating saved");
  };

  const filters: Array<{ id: SimpleFilter; label: string; count: number }> = [
    { id: "needs_you", label: "Needs you", count: counts.needsYou },
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
              ? "Assign a proxy, then release payment after proof is confirmed."
              : "Post a court appearance, or complete missions Legal Connect assigns to you."}
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
            {filter === "needs_you" ? "Nothing needs you right now" : "No missions here"}
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {isAdmin ? "New paid posts will show up under Needs you." : "Post a mission, or wait for Legal Connect to assign you one."}
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
            const acceptedLike = stage === "proxy_assigned" || stage === "proxy_checked_in";
            const canLifecycle = isProxy || isAdmin;
            const canEditDetails = (isAdmin || isPoster) && canEditProxyMissionDetails(t);
            const detailsOpen = Boolean(openDetails[String(t.id)]);
            const fee = Number(t.amount ?? t.fee ?? 0);
            const assignedName = t.assignedProxyName
              || advocateList.find((a) => a.id === String(t.acceptedBy || ""))?.name
              || (t.acceptedBy ? "Assigned proxy" : null);
            const whoLine = isAdmin
              ? (assignedName ? `Proxy: ${assignedName}` : "Waiting for assignment")
              : isProxy
                ? "Assigned to you"
                : isPoster
                  ? (assignedName ? `Proxy: ${assignedName}` : "Waiting for Legal Connect")
                  : "Court mission";

            return (
              <article
                key={t.id}
                className={`bg-card border rounded-2xl p-5 flex flex-col shadow-sm ${
                  isProxy || missionNeedsYou(t, myRole) ? "border-primary/50" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <TaskTypeBadge type={String(t.taskType || t.appearanceType || "Other")} />
                  <StatusBadge status={String(t.status || humanProxyStatus(t))} task={t} />
                </div>

                <h3 className="text-xl font-serif font-bold text-foreground leading-snug">
                  {String(t.taskType || t.appearanceType || "Appearance")}
                  {" · "}
                  {t.location || t.court || "Court"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{whoLine}</p>

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
                      ₹{fee.toLocaleString("en-IN")} held
                      <span className="font-normal text-muted-foreground">· {urgency.label}</span>
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 mb-4">
                  <ProxyMissionTimeline task={t} />
                </div>

                <div className="mt-auto space-y-2 pt-3 border-t border-border">
                  {/* Admin: assign */}
                  {isAdmin && pendingAdmin ? (
                    <div className="space-y-2">
                      <select
                        value={proxyByTask[String(t.id)] || ""}
                        onChange={(event) => setProxyByTask((current) => ({ ...current, [String(t.id)]: event.target.value }))}
                        className="w-full p-3 rounded-xl bg-background border border-border outline-none"
                      >
                        <option value="">Choose advocate…</option>
                        {advocateList.map((advocate) => (
                          <option key={advocate.id} value={advocate.id}>
                            {advocate.name}{advocate.enrollmentNo ? ` · ${advocate.enrollmentNo}` : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAssign(t.id)}
                        disabled={isAssigning || busyId === String(t.id) || !proxyByTask[String(t.id)]}
                        className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                      >
                        <UserRoundSearch className="w-5 h-5" />
                        {isAssigning ? "Assigning…" : "Assign proxy"}
                      </button>
                    </div>
                  ) : null}

                  {/* Poster answering LC query */}
                  {isPoster && String(t.status) === "query_raised" ? (
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
                  {canLifecycle && acceptedLike && !t.conflictDeclaredAt ? (
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

                  {canLifecycle && t.conflictDeclaredAt && !t.checkedInAt ? (
                    <button
                      className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold"
                      disabled={busyId === String(t.id)}
                      onClick={() => runAction(t.id, `/api/tasks/${t.id}/check-in`, { method: "POST", body: "{}" }, "Checked in")}
                    >
                      Check in at court
                    </button>
                  ) : null}

                  {canLifecycle && t.checkedInAt && !["submitted", "poster_approved", "approved"].includes(String(t.proofStatus || "")) ? (
                    <button
                      className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold flex items-center justify-center gap-2"
                      disabled={busyId === String(t.id)}
                      onClick={() => uploadProof(t)}
                    >
                      <Camera className="w-4 h-4" />
                      {t.proofStatus === "rejected" ? "Re-upload order sheet" : "Upload order sheet"}
                    </button>
                  ) : null}

                  {/* Poster reviews proof */}
                  {isPoster && t.proofStatus === "submitted" ? (
                    <div className="space-y-2">
                      <button
                        className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold"
                        disabled={busyId === String(t.id)}
                        onClick={() => runAction(t.id, `/api/tasks/${t.id}/proof-review`, {
                          method: "POST",
                          body: JSON.stringify({ decision: "ok" }),
                        }, "Proof confirmed")}
                      >
                        <CheckCircle2 className="w-4 h-4 inline mr-1" /> Proof looks good
                      </button>
                      <textarea
                        value={proofRejectReason[String(t.id)] || ""}
                        onChange={(e) => setProofRejectReason((c) => ({ ...c, [String(t.id)]: e.target.value }))}
                        placeholder="If not OK, say why…"
                        className="w-full p-3 rounded-xl bg-background border border-border outline-none min-h-[64px]"
                      />
                      <button
                        className="w-full border border-destructive/40 text-destructive font-semibold py-2.5 rounded-xl"
                        disabled={busyId === String(t.id) || (proofRejectReason[String(t.id)] || "").trim().length < 8}
                        onClick={() => runAction(t.id, `/api/tasks/${t.id}/proof-review`, {
                          method: "POST",
                          body: JSON.stringify({ decision: "not_ok", reason: proofRejectReason[String(t.id)] }),
                        }, "Asked for fresh proof")}
                      >
                        Not OK — ask again
                      </button>
                    </div>
                  ) : null}

                  {/* Admin release / override */}
                  {isAdmin && t.proofStatus === "submitted" && !isPoster ? (
                    <button
                      className="w-full border border-border rounded-xl py-2.5 font-semibold"
                      disabled={busyId === String(t.id)}
                      onClick={() => runAction(t.id, "/api/admin/task-action", {
                        method: "POST",
                        body: JSON.stringify({ taskId: t.id, action: "mark_proof_approved", reason: "Admin override" }),
                      }, "Proof approved")}
                    >
                      Approve proof (admin)
                    </button>
                  ) : null}

                  {isAdmin && ["poster_approved", "approved"].includes(String(t.proofStatus || "")) && String(t.escrowStatus || "").toLowerCase() !== "released" ? (
                    <button
                      className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold"
                      disabled={busyId === String(t.id)}
                      onClick={() => {
                        if (!window.confirm("Release payment to proxy after 10% platform + 3% tax?")) return;
                        runAction(t.id, "/api/admin/task-action", {
                          method: "POST",
                          body: JSON.stringify({ taskId: t.id, action: "release_payment" }),
                        }, "Payment released");
                      }}
                    >
                      Release payment
                      {t.settlement?.netToProxy != null || t.settlementPreview?.netToProxy != null
                        ? ` · ₹${Number(t.settlement?.netToProxy ?? t.settlementPreview?.netToProxy).toLocaleString("en-IN")} net`
                        : ""}
                    </button>
                  ) : null}

                  {/* Waiting state — no button, just calm copy */}
                  {!missionNeedsYou(t, myRole) && stage !== "escrow_released" && !(isAdmin && pendingAdmin) ? (
                    <p className="text-sm text-muted-foreground text-center py-1">
                      Waiting on {next.label.toLowerCase()} — {next.action.toLowerCase()}
                    </p>
                  ) : null}

                  {(isPoster || isProxy) && stage === "escrow_released" ? (
                    <button
                      className="w-full border border-border rounded-xl py-2.5 font-semibold flex items-center justify-center gap-2"
                      disabled={busyId === String(t.id)}
                      onClick={() => rateTask(t)}
                    >
                      <Star className="w-4 h-4" /> Rate counterpart
                    </button>
                  ) : null}

                  <button
                    type="button"
                    className="w-full text-xs font-semibold text-muted-foreground py-1.5 flex items-center justify-center gap-1"
                    onClick={() => setOpenDetails((c) => ({ ...c, [String(t.id)]: !detailsOpen }))}
                  >
                    {detailsOpen ? <>Hide details <ChevronUp className="w-3.5 h-3.5" /></> : <>More details <ChevronDown className="w-3.5 h-3.5" /></>}
                  </button>

                  {detailsOpen ? (
                    <div className="space-y-2 rounded-xl bg-muted/30 border border-border p-3 text-xs text-muted-foreground">
                      <p>Due: {urgency.slaShort}</p>
                      <p>Proof: {t.proofStatus || "not uploaded yet"}</p>
                      <p>Payment hold: {t.escrowStatus || "—"}</p>
                      {t.taskDescription ? <p className="text-foreground">Instructions: {t.taskDescription}</p> : null}

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
