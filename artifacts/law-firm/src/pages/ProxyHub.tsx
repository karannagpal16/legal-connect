import { useState } from "react";
import { useListTasks, useDeleteTask, useAcceptTask } from "@workspace/api-client-react";
import type { Task } from "@workspace/api-client-react";
import { Plus, MapPin, HandCoins, Edit2, Trash2, CheckCircle2 } from "lucide-react";
import { StatusBadge, TaskTypeBadge } from "@/components/ui/StatusBadge";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { TaskDialog } from "@/components/forms/TaskDialog";

export function ProxyHub() {
  const { data: tasks, isLoading } = useListTasks();
  const [filter, setFilter] = useState<string>("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { mutate: deleteTask, isPending: isDeleting } = useDeleteTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        toast({ title: "Task deleted" });
      }
    }
  });

  const { mutate: acceptTask, isPending: isAccepting } = useAcceptTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        toast({ title: "Task Accepted successfully!", description: "It has been added to your dashboard." });
      }
    }
  });

  const filteredTasks = tasks?.filter(t => filter === "All" || t.status === filter);

  const handleAccept = (id: number) => {
    acceptTask({ id });
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Proxy Marketplace</h1>
          <p className="mt-1 text-muted-foreground">Find and accept proxy appearance tasks.</p>
        </div>
        <button 
          onClick={() => { setEditingTask(null); setDialogOpen(true); }}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-4 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all hover:-translate-y-1 hover:shadow-xl min-h-[48px]"
        >
          <Plus className="w-5 h-5" />
          Post a Task
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {["All", "Open", "Accepted", "Completed"].map(status => (
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
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-card rounded-2xl animate-pulse border border-border" />)}
        </div>
      ) : filteredTasks?.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border">
          <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground">No tasks available</h3>
          <p className="text-muted-foreground mt-2">Check back later for new proxy opportunities.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks?.map((t) => (
            <div key={t.id} className="bg-card border border-border rounded-2xl p-5 hover:border-primary/50 transition-all shadow-sm flex flex-col group relative overflow-hidden">
              {t.status === "Open" && (
                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-bl-[100%] z-0" />
              )}
              
              <div className="flex justify-between items-start mb-3 relative z-10">
                <TaskTypeBadge type={t.taskType || "Other"} />
                <StatusBadge status={t.status} />
              </div>
              
              <h3 className="text-lg font-bold text-foreground mb-4 relative z-10 leading-snug">{t.taskDescription}</h3>
              
              <div className="space-y-2 mb-6 flex-1 relative z-10">
                {t.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span>{t.location}</span>
                  </div>
                )}
                {t.fee && (
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground bg-accent/10 w-fit px-2 py-1 rounded-md text-accent">
                    <HandCoins className="w-4 h-4" />
                    <span>{t.fee}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-border mt-auto relative z-10">
                {t.status === "Open" ? (
                  <button 
                    onClick={() => handleAccept(t.id)}
                    disabled={isAccepting}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 min-h-[48px]"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Accept Task
                  </button>
                ) : (
                  <div className="flex-1 text-center py-3 text-sm font-bold text-muted-foreground bg-muted rounded-xl">
                    {t.status}
                  </div>
                )}
                
                <button 
                  onClick={() => openEdit(t)}
                  className="p-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-colors border border-transparent hover:border-primary/20"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleDelete(t.id)}
                  disabled={isDeleting}
                  className="p-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors border border-transparent hover:border-destructive/20"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        editingTask={editingTask}
      />
    </div>
  );
}

function Briefcase(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
}
