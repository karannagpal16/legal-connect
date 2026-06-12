import { useState } from "react";
import { useListInternQuests, useCreateInternQuest, useUpdateInternQuest, useDeleteInternQuest } from "@workspace/api-client-react";
import type { InternQuest, CreateInternQuestRequestStatus } from "@workspace/api-client-react";
import { Plus, Target, CheckCircle, Clock, Trash2, Edit2, Zap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const questSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  xpPoints: z.coerce.number().min(1, "XP must be at least 1"),
  deadline: z.string().optional().nullable(),
  status: z.enum(["Open", "In Progress", "Completed"]),
});

export function InternQuests() {
  const { data: quests, isLoading } = useListInternQuests();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState<InternQuest | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { mutate: deleteQuest } = useDeleteInternQuest({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/intern-quests"] });
        toast({ title: "Quest deleted" });
      }
    }
  });

  const { mutate: updateQuest } = useUpdateInternQuest({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/intern-quests"] });
      }
    }
  });

  const totalXp = quests?.filter(q => q.status === "Completed").reduce((sum, q) => sum + q.xpPoints, 0) || 0;

  const handleDelete = (id: number) => {
    if (confirm("Delete this quest?")) {
      deleteQuest({ id });
    }
  };

  const markComplete = (quest: InternQuest) => {
    updateQuest({
      id: quest.id,
      data: {
        title: quest.title,
        description: quest.description,
        xpPoints: quest.xpPoints,
        deadline: quest.deadline,
        status: "Completed"
      }
    });
    toast({ title: `Quest Completed! +${quest.xpPoints} XP earned.`, variant: "default" });
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
            <p className="text-muted-foreground font-medium">Level up your legal skills.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-background px-6 py-3 rounded-xl border border-border flex flex-col items-center">
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Total XP</span>
            <span className="text-2xl font-black text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]">{totalXp}</span>
          </div>
          <button 
            onClick={() => { setEditingQuest(null); setDialogOpen(true); }}
            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-4 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all hover:-translate-y-1 min-h-[48px]"
          >
            <Plus className="w-5 h-5" />
            Add Quest
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          [1,2,3].map(i => <div key={i} className="h-64 bg-card rounded-2xl animate-pulse" />)
        ) : quests?.map((q) => (
          <div key={q.id} className={`bg-card border-2 rounded-2xl p-6 relative overflow-hidden flex flex-col transition-all hover:-translate-y-1 ${
            q.status === 'Completed' ? 'border-green-500/30 bg-green-500/5' : 
            q.status === 'In Progress' ? 'border-primary/50' : 'border-border hover:border-primary/30'
          }`}>
            <div className="flex justify-between items-start mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                q.status === 'Completed' ? 'bg-green-500 text-[#1A2E2A]' :
                q.status === 'In Progress' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
              }`}>
                {q.status}
              </span>
              <div className="flex items-center gap-1 bg-accent/20 text-accent px-3 py-1 rounded-full font-black text-sm">
                <Zap className="w-3.5 h-3.5 fill-accent" />
                {q.xpPoints} XP
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
            
            <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border">
              {q.status !== "Completed" && (
                <button 
                  onClick={() => markComplete(q)}
                  className="flex-1 bg-background hover:bg-green-500/10 hover:text-green-500 border border-border hover:border-green-500/50 text-foreground font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Complete
                </button>
              )}
              <button onClick={() => { setEditingQuest(q); setDialogOpen(true); }} className="p-2.5 bg-background border border-border rounded-lg text-muted-foreground hover:text-primary">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(q.id)} className="p-2.5 bg-background border border-border rounded-lg text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <QuestDialog open={dialogOpen} onOpenChange={setDialogOpen} editingQuest={editingQuest} />
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
      status: "Open" as CreateInternQuestRequestStatus
    }
  });

  const { mutate: create } = useCreateInternQuest({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/intern-quests"] });
        onOpenChange(false);
        form.reset();
        toast({ title: "Quest created" });
      }
    }
  });

  const { mutate: update } = useUpdateInternQuest({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/intern-quests"] });
        onOpenChange(false);
        toast({ title: "Quest updated" });
      }
    }
  });

  const onSubmit = (data: any) => {
    if (editingQuest) {
      update({ id: editingQuest.id, data });
    } else {
      create({ data });
    }
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
              <option value="In Progress">In Progress</option>
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
