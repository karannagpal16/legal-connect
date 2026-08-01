import { useEffect, useState } from "react";
import { useListInternQuests, useCreateInternQuest, useUpdateInternQuest, useDeleteInternQuest } from "@workspace/api-client-react";
import type { InternQuest, CreateInternQuestRequestStatus } from "@workspace/api-client-react";
import { Plus, Target, CheckCircle, Clock, Trash2, Edit2, Zap, Upload, Award } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { normaliseRole, useAuth } from "@/lib/auth";
import { workspaceRequest } from "@/lib/workspace";

const COMPLETION_TIMES = [
  "Within 24 hours",
  "1–2 days",
  "3–5 days",
  "1 week",
  "2 weeks",
];

type QuestRow = InternQuest & {
  assignedTo?: string | null;
  studentId?: string | null;
  completionEta?: string | null;
  submissionUrl?: string | null;
  submissionNotes?: string | null;
  awardedXp?: number | null;
};

const questSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  xpPoints: z.coerce.number().min(1, "XP must be at least 1"),
  deadline: z.string().optional().nullable(),
  status: z.enum(["Open", "In Progress", "Completed", "Submitted for Review", "Assigned"]),
});

export function InternQuests() {
  const { data: quests, isLoading } = useListInternQuests();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState<InternQuest | null>(null);
  const [acceptQuest, setAcceptQuest] = useState<QuestRow | null>(null);
  const [submitQuest, setSubmitQuest] = useState<QuestRow | null>(null);
  const [awardQuest, setAwardQuest] = useState<QuestRow | null>(null);
  const [studentId, setStudentId] = useState("");
  const [completionEta, setCompletionEta] = useState(COMPLETION_TIMES[1]);
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [awardXp, setAwardXp] = useState(10);
  const [busy, setBusy] = useState(false);

  const { session } = useAuth();
  const role = normaliseRole(session?.user?.role);
  const isAdmin = role === "admin";
  const isIntern = role === "intern" || isAdmin;

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { mutate: deleteQuest } = useDeleteInternQuest({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/intern-quests"] });
        toast({ title: "Quest deleted" });
      },
    },
  });

  const rows = (quests || []) as QuestRow[];
  const totalXp = rows
    .filter((q) => q.status === "Completed")
    .reduce((sum, q) => sum + Number(q.awardedXp ?? q.xpPoints ?? 0), 0);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/intern-quests"] });

  const runQuestAction = async (id: string | number, action: string, body: Record<string, unknown>, success: string) => {
    setBusy(true);
    try {
      await workspaceRequest(`/api/intern-quests/${id}/${action}`, session?.token, {
        method: "POST",
        body: JSON.stringify(body),
      });
      await refresh();
      toast({ title: success });
      setAcceptQuest(null);
      setSubmitQuest(null);
      setAwardQuest(null);
    } catch (error) {
      toast({ title: "Action failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this quest?")) deleteQuest({ id });
  };

  const statusClass = (status: string) => {
    if (status === "Completed") return "border-green-500/30 bg-green-500/5";
    if (status === "Submitted for Review") return "border-amber-500/40 bg-amber-500/5";
    if (status === "In Progress") return "border-primary/50";
    return "border-border hover:border-primary/30";
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-lg shadow-black/5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center border-4 border-background shadow-inner">
            <Zap className="w-8 h-8 text-primary-foreground fill-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Intern Quests</h1>
            <p className="text-muted-foreground font-medium">
              Open → Accept → Submit draft → Admin awards XP
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-background px-6 py-3 rounded-xl border border-border flex flex-col items-center">
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Total XP</span>
            <span className="text-2xl font-black text-primary">{totalXp}</span>
          </div>
          {(isAdmin || role === "advocate") && (
            <button
              onClick={() => {
                setEditingQuest(null);
                setDialogOpen(true);
              }}
              className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-4 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all hover:-translate-y-1 min-h-[48px]"
            >
              <Plus className="w-5 h-5" />
              Add Quest
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          [1, 2, 3].map((i) => <div key={i} className="h-64 bg-card rounded-2xl animate-pulse" />)
        ) : (
          rows.map((q) => (
            <div
              key={q.id}
              className={`bg-card border-2 rounded-2xl p-6 relative overflow-hidden flex flex-col transition-all hover:-translate-y-1 ${statusClass(q.status)}`}
            >
              <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-muted text-foreground">
                  {q.status}
                </span>
                <div className="flex items-center gap-1 bg-accent/20 text-accent px-3 py-1 rounded-full font-black text-sm">
                  <Zap className="w-3.5 h-3.5 fill-accent" />
                  {q.awardedXp ?? q.xpPoints} XP
                </div>
              </div>

              <h3 className="text-xl font-bold text-foreground mb-2 leading-tight">{q.title}</h3>
              <p className="text-muted-foreground text-sm flex-1">{q.description}</p>

              {q.deadline && (
                <div className="flex items-center gap-2 mt-4 text-sm font-medium text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  Deadline: {q.deadline}
                </div>
              )}
              {q.completionEta ? (
                <p className="text-xs text-muted-foreground mt-2">ETA: {q.completionEta}</p>
              ) : null}
              {q.submissionNotes ? (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">Notes: {q.submissionNotes}</p>
              ) : null}

              <div className="flex flex-col gap-2 mt-6 pt-4 border-t border-border">
                {isIntern && (q.status === "Open" || q.status === "Assigned") && (
                  <button
                    onClick={() => {
                      setAcceptQuest(q);
                      setStudentId("");
                      setCompletionEta(COMPLETION_TIMES[1]);
                    }}
                    className="w-full bg-primary text-primary-foreground font-bold py-2.5 rounded-lg flex items-center justify-center gap-2"
                  >
                    <Target className="w-4 h-4" /> Accept quest
                  </button>
                )}
                {isIntern && q.status === "In Progress" && (
                  <button
                    onClick={() => {
                      setSubmitQuest(q);
                      setSubmissionNotes("");
                      setSubmissionUrl("");
                    }}
                    className="w-full border border-border font-bold py-2.5 rounded-lg flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" /> Submit for review
                  </button>
                )}
                {isAdmin && q.status === "Submitted for Review" && (
                  <button
                    onClick={() => {
                      setAwardQuest(q);
                      setAwardXp(Number(q.xpPoints || 10));
                    }}
                    className="w-full bg-primary text-primary-foreground font-bold py-2.5 rounded-lg flex items-center justify-center gap-2"
                  >
                    <Award className="w-4 h-4" /> Award XP
                  </button>
                )}
                {q.status === "Completed" && (
                  <div className="flex items-center justify-center gap-2 text-green-600 font-bold py-2">
                    <CheckCircle className="w-4 h-4" /> XP awarded
                  </div>
                )}
                {(isAdmin || role === "advocate") && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingQuest(q);
                        setDialogOpen(true);
                      }}
                      className="p-2.5 bg-background border border-border rounded-lg text-muted-foreground hover:text-primary"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="p-2.5 bg-background border border-border rounded-lg text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <QuestDialog open={dialogOpen} onOpenChange={setDialogOpen} editingQuest={editingQuest} />

      <Dialog open={Boolean(acceptQuest)} onOpenChange={(open) => !open && setAcceptQuest(null)}>
        <DialogContent className="sm:max-w-[480px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif">Accept quest</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{acceptQuest?.title}</p>
          <div className="space-y-3 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Student ID</label>
              <input
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="College / student ID"
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
              disabled={busy || studentId.trim().length < 3}
              onClick={() =>
                acceptQuest &&
                runQuestAction(acceptQuest.id, "accept", { studentId, completionEta }, "Quest accepted — now In Progress")
              }
              className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl"
            >
              Confirm acceptance
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(submitQuest)} onOpenChange={(open) => !open && setSubmitQuest(null)}>
        <DialogContent className="sm:max-w-[480px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif">Submit for review</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Draft PDF / file URL</label>
              <input
                value={submissionUrl}
                onChange={(e) => setSubmissionUrl(e.target.value)}
                placeholder="https://… or storage link"
                className="w-full p-3 rounded-xl bg-background border border-border outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Research notes</label>
              <textarea
                value={submissionNotes}
                onChange={(e) => setSubmissionNotes(e.target.value)}
                className="w-full p-3 rounded-xl bg-background border border-border outline-none min-h-[100px]"
                placeholder="Summarise research / draft findings"
              />
            </div>
            <button
              disabled={busy}
              onClick={() =>
                submitQuest &&
                runQuestAction(
                  submitQuest.id,
                  "submit",
                  { submissionUrl, submissionNotes },
                  "Submitted for Admin review",
                )
              }
              className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl"
            >
              Submit draft
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(awardQuest)} onOpenChange={(open) => !open && setAwardQuest(null)}>
        <DialogContent className="sm:max-w-[480px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif">Award XP</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{awardQuest?.title}</p>
          {awardQuest?.submissionNotes ? (
            <p className="text-sm border border-border rounded-xl p-3 bg-background">{awardQuest.submissionNotes}</p>
          ) : null}
          <div className="space-y-3 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Awarded XP points</label>
              <input
                type="number"
                min={1}
                value={awardXp}
                onChange={(e) => setAwardXp(Number(e.target.value))}
                className="w-full p-3 rounded-xl bg-background border border-border outline-none"
              />
            </div>
            <button
              disabled={busy || awardXp < 1}
              onClick={() =>
                awardQuest &&
                runQuestAction(awardQuest.id, "award-xp", { awardedXp: awardXp }, `+${awardXp} XP awarded`)
              }
              className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl"
            >
              Complete & award XP
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuestDialog({ open, onOpenChange, editingQuest }: any) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(questSchema),
    defaultValues: editingQuest || {
      title: "",
      description: "",
      xpPoints: 10,
      deadline: "",
      status: "Open" as CreateInternQuestRequestStatus,
    },
  });

  useEffect(() => {
    form.reset(
      editingQuest || {
        title: "",
        description: "",
        xpPoints: 10,
        deadline: "",
        status: "Open" as CreateInternQuestRequestStatus,
      },
    );
  }, [editingQuest, form, open]);

  const { mutate: create } = useCreateInternQuest({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/intern-quests"] });
        onOpenChange(false);
        form.reset();
        toast({ title: "Quest created" });
      },
    },
  });

  const { mutate: update } = useUpdateInternQuest({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/intern-quests"] });
        onOpenChange(false);
        toast({ title: "Quest updated" });
      },
    },
  });

  const onSubmit = (data: any) => {
    if (editingQuest) update({ id: editingQuest.id, data });
    else create({ data });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">{editingQuest ? "Edit Quest" : "Create New Quest"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Quest Title</label>
            <input {...form.register("title")} className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Description</label>
            <textarea {...form.register("description")} className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none min-h-[100px]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">XP Points</label>
              <input type="number" {...form.register("xpPoints")} className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Deadline</label>
              <input type="date" {...form.register("deadline")} className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Status</label>
            <select {...form.register("status")} className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none">
              <option value="Open">Open</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Submitted for Review">Submitted for Review</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <button type="submit" className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl mt-4 hover:opacity-90">
            {editingQuest ? "Save Changes" : "Create Quest"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
