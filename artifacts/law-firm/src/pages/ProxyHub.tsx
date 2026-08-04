import { useState } from "react";
import { useListTasks, useDeleteTask } from "@workspace/api-client-react";
import type { Task } from "@workspace/api-client-react";
import { Plus, MapPin, HandCoins, Edit2, Trash2, UserRoundSearch, ShieldCheck, Camera, Star, MessageSquareText, CheckCircle2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { StatusBadge, TaskTypeBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { TaskDialog } from "@/components/forms/TaskDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth, normaliseRole } from "@/lib/auth";
import { workspaceRequest } from "@/lib/workspace";
import { ActivityAuditTimeline } from "@/components/ActivityAuditTimeline";

const COMPLETION_TIMES = [
  "Within 24 hours",
  "1–2 days",
  "3–5 days",
  "1 week",
  "2 weeks",
];

type ProxyTask = Task & {
  cnr?: string;
  roomNo?: string;
  room?: string;
  hearingDate?: string;
  proofStatus?: string;
  proofHash?: string;
  conflictDeclaredAt?: string;
  checkedInAt?: string;
  acceptedBy?: string | number;
  postedBy?: string | number;
  escrowStatus?: string;
  adminQuery?: string;
  barEnrollment?: string;
  completionEta?: string;
  amount?: number;
  fee?: string | number;
  court?: string;
  title?: string;
  posterProofDecision?: string;
  posterProofReason?: string;
  settlement?: {
    gross?: number;
    platformFee?: number;
    appTaxGst?: number;
    netToProxy?: number;
  };
  settlementPreview?: {
    gross?: number;
    platformFee?: number;
    appTaxGst?: number;
    netToProxy?: number;
  };
};

export function ProxyHub() {
  const { data: tasks, isLoading } = useListTasks();
  const [filter, setFilter] = useState<string>("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [busyId, setBusyId] = useState<string>("");
  const [proxyByTask, setProxyByTask] = useState<Record<string, string>>({});
  const [acceptTask, setAcceptTask] = useState<ProxyTask | null>(null);
  const [enrollmentNo, setEnrollmentNo] = useState("");
  const [completionEta, setCompletionEta] = useState(COMPLETION_TIMES[0]);
  const [queryNote, setQueryNote] = useState<Record<string, string>>({});
  const [respondNote, setRespondNote] = useState<Record<string, string>>({});
  const [proofRejectReason, setProofRejectReason] = useState<Record<string, string>>({});
  const { session } = useAuth();
  const role = normaliseRole(session?.user?.role);
  const isAdmin = role === "admin";
  const isAdvocate = role === "advocate" || isAdmin;
  const userId = session?.user?.id;

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const advocates = useQuery({
    queryKey: ["admin-advocates-proxy"],
    queryFn: () => workspaceRequest<Array<{ id: string; name: string; enrollmentNo?: string }>>("/api/admin/advocates", session?.token),
    enabled: Boolean(isAdmin && session?.token),
    staleTime: 30_000,
  });

  const { mutate: deleteTask, isPending: isDeleting } = useDeleteTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        toast({ title: "Task deleted" });
      },
    },
  });

  const [isAssigning, setIsAssigning] = useState(false);
  const advocateList = Array.isArray(advocates.data) ? advocates.data : [];

  const filteredTasks = (tasks as ProxyTask[] | undefined)?.filter((t) => {
    if (filter === "All") return true;
    if (filter === "Pending Admin") {
      return ["pending_admin_review", "query_raised", "Awaiting Admin Assignment"].includes(String(t.status));
    }
    if (filter === "Open") return t.status === "Open";
    if (filter === "Accepted") return t.status === "Accepted" || t.status === "Assigned";
    if (filter === "Proof Uploaded") return t.status === "Proof Uploaded" || t.status === "Proof Submitted" || t.proofStatus === "submitted";
    if (filter === "Completed") return t.status === "Completed" || /payment released|closed/i.test(String(t.status));
    return t.status === filter;
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
  };

  const runAction = async (taskId: string | number, path: string, init?: RequestInit, successTitle?: string) => {
    setBusyId(String(taskId));
    try {
      await workspaceRequest(`${path}`, session?.token, init);
      await refresh();
      toast({ title: successTitle || "Updated" });
    } catch (error) {
      toast({ title: "Action failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setBusyId("");
    }
  };

  const handleAssign = async (id: number | string) => {
    if (!isAdmin) {
      toast({
        title: "Admin assignment only",
        description: "Legal Connect Admin searches and assigns proxy counsel after payment.",
        variant: "destructive",
      });
      return;
    }
    const proxyId = proxyByTask[String(id)];
    const proxy = advocateList.find((item) => item.id === proxyId);
    if (!proxyId || !proxy) {
      toast({
        title: "Select proxy counsel",
        description: "Choose a verified advocate before assigning this mission.",
        variant: "destructive",
      });
      return;
    }
    setIsAssigning(true);
    try {
      await workspaceRequest(`/api/admin/proxy-tasks/${id}/assign-proxy`, session?.token, {
        method: "POST",
        body: JSON.stringify({
          proxyAdvocateId: proxy.id,
          proxyAdvocateName: proxy.name,
        }),
      });
      await refresh();
      toast({
        title: "Proxy assigned by LC",
        description: "State: proxy_assigned_by_lc. Assigned counsel must declare conflict before check-in.",
      });
    } catch (error) {
      toast({ title: "Assignment failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this proxy task?")) {
      deleteTask({ id });
    }
  };

  const openEdit = (t: Task) => {
    setEditingTask(t);
    setDialogOpen(true);
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
        toast({ title: "Proof submitted", description: "Awaiting main counsel satisfaction. Escrow stays locked." });
      } catch (error) {
        toast({ title: "Proof upload failed", description: (error as Error).message, variant: "destructive" });
      } finally {
        setBusyId("");
      }
    };
    input.click();
  };

  const rateTask = async (task: ProxyTask) => {
    const starsRaw = window.prompt("Rate this ProxyHub mission (1-5 stars)", "5");
    if (!starsRaw) return;
    const stars = Number(starsRaw);
    const comment = window.prompt("Optional comment", "") || "";
    await runAction(task.id, `/api/tasks/${task.id}/rate`, {
      method: "POST",
      body: JSON.stringify({ stars, comment }),
    }, "Rating saved");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">
            {isAdmin ? "Proxy Desk · Assign → Proof → Taxed release" : "ProxyHub · Pay, post & track"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Pay &amp; post → funds held → LC assigns proxy → proof upload → main counsel OK/Not OK → LC releases net after 10% platform + 3% tax.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingTask(null);
            setDialogOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-4 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all hover:-translate-y-1 hover:shadow-xl min-h-[48px]"
        >
          <Plus className="w-5 h-5" />
          Pay & Post Task
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {["All", "Pending Admin", "Open", "Accepted", "Checked In", "Proof Uploaded", "Completed"].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
              filter === status
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-card border border-border text-foreground hover:border-primary/50"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      <ActivityAuditTimeline
        title="ProxyHub · Live Acceptance Feed"
        emptyText="Posted missions, accepts and proof uploads sync here across ProxyHub, Chamber Vault and Admin Desk."
        limit={12}
        compact
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-card rounded-2xl animate-pulse border border-border" />
          ))}
        </div>
      ) : filteredTasks?.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border">
          <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground">No proxy tasks yet</h3>
          <p className="text-muted-foreground mt-2">
            {isAdmin ? "Paid posts from advocates will appear here for assignment." : "Post a paid task with mandatory CNR and passover details."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks?.map((t) => {
            const pendingAdmin = ["pending_admin_review", "query_raised", "Awaiting Admin Assignment"].includes(String(t.status));
            const marketplaceOpen = t.status === "Open";
            const isProxy = String(t.acceptedBy || "") === String(userId || "");
            const isPoster = String(t.postedBy || "") === String(userId || "");
            const acceptedLike = t.status === "Accepted" || t.status === "Assigned" || t.status === "Checked In" || t.status === "Proof Uploaded" || t.status === "Proof Submitted";
            const canLifecycle = isProxy || isAdmin;
            return (
              <div
                key={t.id}
                className="bg-card border border-border rounded-2xl p-5 hover:border-primary/50 transition-all shadow-sm flex flex-col group relative overflow-hidden"
              >
                {pendingAdmin && <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-bl-[100%] z-0" />}

                <div className="flex justify-between items-start mb-3 relative z-10">
                  <TaskTypeBadge type={t.taskType || "Other"} />
                  <StatusBadge status={t.status} />
                </div>

                <h3 className="text-lg font-bold text-foreground mb-2 relative z-10 leading-snug">{t.taskDescription || t.title}</h3>
                <div className="space-y-2 mb-4 flex-1 relative z-10 text-sm text-muted-foreground">
                  {(t.cnr || (t as any).CNR) && <div>CNR {(t as any).cnr}</div>}
                  {(t.roomNo || t.room) && <div>Room {t.roomNo || t.room}</div>}
                  {t.hearingDate && <div>Hearing {String(t.hearingDate).slice(0, 10)}</div>}
                  {t.location || t.court ? (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span>{t.location || t.court}</span>
                    </div>
                  ) : null}
                  {t.fee || t.amount ? (
                    <div className="flex items-center gap-2 font-semibold text-foreground bg-accent/10 w-fit px-2 py-1 rounded-md">
                      <HandCoins className="w-4 h-4" />
                      <span>₹{t.fee || t.amount}</span>
                    </div>
                  ) : null}
                  <div>Proof: {t.proofStatus || "none"}{t.proofHash ? ` · ${String(t.proofHash).slice(0, 8)}…` : ""}</div>
                  <div>Escrow: {t.escrowStatus || "—"}</div>
                  {t.posterProofDecision ? (
                    <div>
                      Main counsel: {t.posterProofDecision === "ok" ? "Satisfied" : "Not satisfied"}
                      {t.posterProofReason ? ` — ${t.posterProofReason}` : ""}
                    </div>
                  ) : null}
                  {(t.settlement || t.settlementPreview) ? (
                    <div>
                      Settlement preview: gross ₹{(t.settlement || t.settlementPreview)?.gross}
                      {" → "}net ₹{(t.settlement || t.settlementPreview)?.netToProxy}
                      {" "}(−10% platform −3% tax)
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2 pt-4 border-t border-border mt-auto relative z-10">
                  {isAdmin && pendingAdmin ? (
                    <div className="space-y-2">
                      <button
                        className="w-full bg-primary text-primary-foreground font-bold py-2.5 rounded-xl flex items-center justify-center gap-2"
                        disabled={busyId === String(t.id)}
                        onClick={() => runAction(t.id, `/api/tasks/${t.id}/admin-approve`, { method: "POST", body: "{}" }, "Marketplace Open")}
                      >
                        <CheckCircle2 className="w-4 h-4" /> Approve → Open marketplace
                      </button>
                      <textarea
                        value={queryNote[String(t.id)] || ""}
                        onChange={(e) => setQueryNote((c) => ({ ...c, [String(t.id)]: e.target.value }))}
                        placeholder="Raise query for poster…"
                        className="w-full p-3 rounded-xl bg-background border border-border outline-none min-h-[72px]"
                      />
                      <button
                        className="w-full border border-border font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2"
                        disabled={busyId === String(t.id) || (queryNote[String(t.id)] || "").trim().length < 8}
                        onClick={() => runAction(t.id, `/api/tasks/${t.id}/raise-query`, {
                          method: "POST",
                          body: JSON.stringify({ query: queryNote[String(t.id)] }),
                        }, "Query raised")}
                      >
                        <MessageSquareText className="w-4 h-4" /> Raise query
                      </button>
                      <select
                        value={proxyByTask[String(t.id)] || ""}
                        onChange={(event) => setProxyByTask((current) => ({ ...current, [String(t.id)]: event.target.value }))}
                        className="w-full p-3 rounded-xl bg-background border border-border outline-none"
                      >
                        <option value="">Or assign proxy directly</option>
                        {advocateList.map((advocate) => (
                          <option key={advocate.id} value={advocate.id}>
                            {advocate.name}{advocate.enrollmentNo ? ` · ${advocate.enrollmentNo}` : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAssign(t.id)}
                        disabled={isAssigning || busyId === String(t.id) || !proxyByTask[String(t.id)]}
                        className="w-full border border-border font-bold py-2.5 rounded-xl flex items-center justify-center gap-2"
                      >
                        <UserRoundSearch className="w-5 h-5" />
                        Assign Proxy
                      </button>
                    </div>
                  ) : null}

                  {isPoster && t.status === "query_raised" ? (
                    <div className="space-y-2">
                      {t.adminQuery ? <p className="text-xs text-muted-foreground">Admin query: {t.adminQuery}</p> : null}
                      <textarea
                        value={respondNote[String(t.id)] || ""}
                        onChange={(e) => setRespondNote((c) => ({ ...c, [String(t.id)]: e.target.value }))}
                        placeholder="Update info for Admin…"
                        className="w-full p-3 rounded-xl bg-background border border-border outline-none min-h-[72px]"
                      />
                      <button
                        className="w-full bg-primary text-primary-foreground font-bold py-2.5 rounded-xl"
                        disabled={busyId === String(t.id) || (respondNote[String(t.id)] || "").trim().length < 4}
                        onClick={() => runAction(t.id, `/api/tasks/${t.id}/respond-query`, {
                          method: "POST",
                          body: JSON.stringify({ response: respondNote[String(t.id)] }),
                        }, "Returned to Open marketplace")}
                      >
                        Respond & reopen
                      </button>
                    </div>
                  ) : null}

                  {isAdvocate && marketplaceOpen && !isPoster ? (
                    <button
                      className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl"
                      onClick={() => {
                        setAcceptTask(t);
                        setEnrollmentNo("");
                        setCompletionEta(COMPLETION_TIMES[0]);
                      }}
                    >
                      Accept mission
                    </button>
                  ) : null}

                  {canLifecycle && acceptedLike && !t.conflictDeclaredAt ? (
                    <button
                      className="w-full border border-border rounded-xl py-2.5 font-semibold flex items-center justify-center gap-2"
                      disabled={busyId === String(t.id)}
                      onClick={() => runAction(t.id, `/api/tasks/${t.id}/conflict-declare`, {
                        method: "POST",
                        body: JSON.stringify({ declared: true, note: "No conflict of interest for this appearance." }),
                      }, "Conflict declaration signed")}
                    >
                      <ShieldCheck className="w-4 h-4" /> Declare no conflict
                    </button>
                  ) : null}

                  {canLifecycle && t.conflictDeclaredAt && !t.checkedInAt ? (
                    <button
                      className="w-full border border-border rounded-xl py-2.5 font-semibold"
                      disabled={busyId === String(t.id)}
                      onClick={() => runAction(t.id, `/api/tasks/${t.id}/check-in`, { method: "POST", body: "{}" }, "Checked in · proof window open")}
                    >
                      Day-of check-in
                    </button>
                  ) : null}

                  {canLifecycle && t.checkedInAt && !["submitted", "poster_approved", "approved"].includes(String(t.proofStatus || "")) ? (
                    <button
                      className="w-full border border-border rounded-xl py-2.5 font-semibold flex items-center justify-center gap-2"
                      disabled={busyId === String(t.id)}
                      onClick={() => uploadProof(t)}
                    >
                      <Camera className="w-4 h-4" /> {t.proofStatus === "rejected" ? "Re-upload order sheet" : "Upload order sheet"}
                    </button>
                  ) : null}

                  {isPoster && t.proofStatus === "submitted" ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Review the proxy order-sheet proof. Escrow stays held until you confirm satisfaction.</p>
                      <button
                        className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 font-bold"
                        disabled={busyId === String(t.id)}
                        onClick={() => runAction(t.id, `/api/tasks/${t.id}/proof-review`, {
                          method: "POST",
                          body: JSON.stringify({ decision: "ok" }),
                        }, "Proof marked satisfactory")}
                      >
                        <CheckCircle2 className="w-4 h-4 inline mr-1" /> Proof OK — satisfied
                      </button>
                      <textarea
                        value={proofRejectReason[String(t.id)] || ""}
                        onChange={(e) => setProofRejectReason((c) => ({ ...c, [String(t.id)]: e.target.value }))}
                        placeholder="If not satisfied, state the reason…"
                        className="w-full p-3 rounded-xl bg-background border border-border outline-none min-h-[72px]"
                      />
                      <button
                        className="w-full border border-destructive/40 text-destructive font-semibold py-2.5 rounded-xl"
                        disabled={busyId === String(t.id) || (proofRejectReason[String(t.id)] || "").trim().length < 8}
                        onClick={() => runAction(t.id, `/api/tasks/${t.id}/proof-review`, {
                          method: "POST",
                          body: JSON.stringify({
                            decision: "not_ok",
                            reason: proofRejectReason[String(t.id)],
                          }),
                        }, "Proof rejected — proxy must re-upload")}
                      >
                        Not OK — request fresh proof
                      </button>
                    </div>
                  ) : null}

                  {isAdmin && t.proofStatus === "submitted" ? (
                    <button
                      className="w-full border border-border rounded-xl py-2.5 font-semibold"
                      disabled={busyId === String(t.id)}
                      onClick={() => runAction(t.id, "/api/admin/task-action", {
                        method: "POST",
                        body: JSON.stringify({ taskId: t.id, action: "mark_proof_approved", reason: "Admin override while awaiting counsel" }),
                      }, "Admin override · proof approved")}
                    >
                      Admin override: approve proof
                    </button>
                  ) : null}

                  {isAdmin && ["poster_approved", "approved"].includes(String(t.proofStatus || "")) && t.escrowStatus !== "Released" ? (
                    <button
                      className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 font-bold"
                      disabled={busyId === String(t.id)}
                      onClick={() => {
                        if (!window.confirm("Release escrow after deducting 10% platform fee + 3% app/GST tax? Net payout to proxy is manual (not automated Razorpay).")) return;
                        runAction(t.id, "/api/admin/task-action", {
                          method: "POST",
                          body: JSON.stringify({ taskId: t.id, action: "release_payment" }),
                        }, "Completed · net funds released after tax");
                      }}
                    >
                      Release net funds (after tax)
                    </button>
                  ) : null}

                  {(isPoster || isProxy || isAdmin) && !pendingAdmin ? (
                    <div className="space-y-2">
                      <textarea
                        value={queryNote[String(t.id)] || ""}
                        onChange={(e) => setQueryNote((c) => ({ ...c, [String(t.id)]: e.target.value }))}
                        placeholder="Supervised inter-counsel Q&A (LC moderated)…"
                        className="w-full p-3 rounded-xl bg-background border border-border outline-none min-h-[72px]"
                      />
                      <button
                        className="w-full border border-border font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2"
                        disabled={busyId === String(t.id) || (queryNote[String(t.id)] || "").trim().length < 4}
                        onClick={() => runAction(t.id, `/api/proxy-tasks/${t.id}/qa`, {
                          method: "POST",
                          body: JSON.stringify({
                            message: queryNote[String(t.id)],
                            kind: isAdmin ? "lc_moderation" : "counsel_query",
                          }),
                        }, "Supervised Q&A posted")}
                      >
                        <MessageSquareText className="w-4 h-4" /> Post supervised Q&A
                      </button>
                    </div>
                  ) : null}

                  {(isPoster || isProxy) && (t.escrowStatus === "Released" || /completed|closed|payment released/i.test(String(t.status || ""))) ? (
                    <button
                      className="w-full border border-border rounded-xl py-2.5 font-semibold flex items-center justify-center gap-2"
                      disabled={busyId === String(t.id)}
                      onClick={() => rateTask(t)}
                    >
                      <Star className="w-4 h-4" /> Rate counterpart
                    </button>
                  ) : null}

                  <div className="flex items-center gap-2">
                    {(isAdmin || pendingAdmin || marketplaceOpen) && (
                      <>
                        <button onClick={() => openEdit(t)} className="p-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-colors">
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleDelete(t.id)} disabled={isDeleting} className="p-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} editingTask={editingTask} />

      <Dialog open={Boolean(acceptTask)} onOpenChange={(open) => !open && setAcceptTask(null)}>
        <DialogContent className="sm:max-w-[480px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif">Counsel acceptance</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{acceptTask?.title}</p>
          <div className="space-y-3 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Bar enrollment number</label>
              <input
                value={enrollmentNo}
                onChange={(e) => setEnrollmentNo(e.target.value)}
                placeholder="e.g. D/1234/2018"
                className="w-full p-3 rounded-xl bg-background border border-border outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Estimated completion time</label>
              <select
                value={completionEta}
                onChange={(e) => setCompletionEta(e.target.value)}
                className="w-full p-3 rounded-xl bg-background border border-border outline-none"
              >
                {COMPLETION_TIMES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <button
              className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl"
              disabled={!acceptTask || enrollmentNo.trim().length < 3 || busyId === String(acceptTask?.id || "")}
              onClick={async () => {
                if (!acceptTask) return;
                await runAction(acceptTask.id, `/api/tasks/${acceptTask.id}/counsel-accept`, {
                  method: "POST",
                  body: JSON.stringify({ enrollmentNo, completionEta }),
                }, "Mission accepted");
                setAcceptTask(null);
              }}
            >
              Confirm acceptance
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Briefcase(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}
