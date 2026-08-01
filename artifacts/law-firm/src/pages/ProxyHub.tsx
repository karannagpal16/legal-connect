import { useState } from "react";
import { useListTasks, useDeleteTask, useAcceptTask } from "@workspace/api-client-react";
import type { Task } from "@workspace/api-client-react";
import { Plus, MapPin, HandCoins, Edit2, Trash2, UserRoundSearch, ShieldCheck, Camera, Star } from "lucide-react";
import { StatusBadge, TaskTypeBadge } from "@/components/ui/StatusBadge";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { TaskDialog } from "@/components/forms/TaskDialog";
import { useAuth, normaliseRole } from "@/lib/auth";
import { workspaceRequest } from "@/lib/workspace";

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
};

export function ProxyHub() {
  const { data: tasks, isLoading } = useListTasks();
  const [filter, setFilter] = useState<string>("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [busyId, setBusyId] = useState<string>("");
  const { session } = useAuth();
  const role = normaliseRole(session?.user?.role);
  const isAdmin = role === "admin";
  const userId = session?.user?.id;

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { mutate: deleteTask, isPending: isDeleting } = useDeleteTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        toast({ title: "Task deleted" });
      },
    },
  });

  const { mutate: assignTask, isPending: isAssigning } = useAcceptTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        toast({
          title: "Proxy counsel assigned",
          description: "Layer 2: assigned counsel must declare conflict before check-in.",
        });
      },
      onError: (error) => toast({ title: "Assignment failed", description: error.message, variant: "destructive" }),
    },
  });

  const filteredTasks = (tasks as ProxyTask[] | undefined)?.filter((t) => {
    if (filter === "All") return true;
    if (filter === "Pending Admin") return t.status === "Awaiting Admin Assignment" || t.status === "Open";
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

  const handleAssign = (id: number) => {
    if (!isAdmin) {
      toast({
        title: "Admin assignment only",
        description: "Legal Connect Admin searches and assigns proxy counsel after payment.",
        variant: "destructive",
      });
      return;
    }
    assignTask({ id });
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
        toast({ title: "Proof submitted", description: "Layer 4: awaiting Admin review before escrow unlock." });
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
            {isAdmin ? "Proxy Desk · Assign Counsel" : "ProxyHub · 5-Layer Transparency"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Posting → Conflict declaration → Check-in → Hash-checked proof → Admin escrow release. Clients are notified at every layer.
          </p>
        </div>
        {!isAdmin && (
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
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {["All", "Pending Admin", "Assigned", "Checked In", "Proof Submitted", "Completed"].map((status) => (
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
            const pending = t.status === "Open" || t.status === "Awaiting Admin Assignment";
            const isProxy = String(t.acceptedBy || "") === String(userId || "");
            const isPoster = String(t.postedBy || "") === String(userId || "");
            const canLifecycle = isProxy || isAdmin;
            return (
              <div
                key={t.id}
                className="bg-card border border-border rounded-2xl p-5 hover:border-primary/50 transition-all shadow-sm flex flex-col group relative overflow-hidden"
              >
                {pending && <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-bl-[100%] z-0" />}

                <div className="flex justify-between items-start mb-3 relative z-10">
                  <TaskTypeBadge type={t.taskType || "Other"} />
                  <StatusBadge status={t.status === "Open" ? "Awaiting Admin Assignment" : t.status} />
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
                </div>

                <div className="flex flex-col gap-2 pt-4 border-t border-border mt-auto relative z-10">
                  {isAdmin && pending ? (
                    <button
                      onClick={() => handleAssign(t.id)}
                      disabled={isAssigning || busyId === String(t.id)}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 min-h-[48px]"
                    >
                      <UserRoundSearch className="w-5 h-5" />
                      Assign Proxy
                    </button>
                  ) : null}

                  {canLifecycle && !t.conflictDeclaredAt ? (
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

                  {canLifecycle && t.checkedInAt && t.proofStatus !== "submitted" && t.proofStatus !== "approved" ? (
                    <button
                      className="w-full border border-border rounded-xl py-2.5 font-semibold flex items-center justify-center gap-2"
                      disabled={busyId === String(t.id)}
                      onClick={() => uploadProof(t)}
                    >
                      <Camera className="w-4 h-4" /> Upload order sheet
                    </button>
                  ) : null}

                  {isAdmin && t.proofStatus === "submitted" ? (
                    <button
                      className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 font-bold"
                      disabled={busyId === String(t.id)}
                      onClick={() => runAction(t.id, "/api/admin/task-action", {
                        method: "POST",
                        body: JSON.stringify({ taskId: t.id, action: "mark_proof_approved" }),
                      }, "Proof approved")}
                    >
                      Approve proof
                    </button>
                  ) : null}

                  {isAdmin && t.proofStatus === "approved" && t.escrowStatus !== "Released" ? (
                    <button
                      className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 font-bold"
                      disabled={busyId === String(t.id)}
                      onClick={() => runAction(t.id, "/api/admin/task-action", {
                        method: "POST",
                        body: JSON.stringify({ taskId: t.id, action: "release_payment" }),
                      }, "Escrow released")}
                    >
                      Release escrow
                    </button>
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
                    {(isAdmin || pending) && (
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
