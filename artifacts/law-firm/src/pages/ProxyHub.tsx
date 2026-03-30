import { useState } from "react";
import { useListTasks, useDeleteTask, getListTasksQueryKey, type Task } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit2, Trash2, MapPin, IndianRupee, Briefcase } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskDialog } from "@/components/forms/TaskDialog";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ProxyHub() {
  const { data: tasks, isLoading } = useListTasks();
  const [search, setSearch] = useState("");
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteMutation = useDeleteTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        toast({ title: "Task deleted successfully" });
        setDeleteOpen(false);
      },
      onError: (err: any) => {
        toast({ title: "Failed to delete task", description: err.message, variant: "destructive" });
      }
    }
  });

  const filteredTasks = tasks?.filter(t => 
    t.taskDescription.toLowerCase().includes(search.toLowerCase()) || 
    (t.location && t.location.toLowerCase().includes(search.toLowerCase()))
  );

  const handleEdit = (t: Task) => {
    setSelectedTask(t);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedTask(null);
    setDialogOpen(true);
  };

  const confirmDelete = (id: number) => {
    setTaskToDelete(id);
    setDeleteOpen(true);
  };

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Proxy Hub</h1>
          <p className="text-muted-foreground mt-1">Manage and assign court proxies and tasks.</p>
        </div>
        <Button 
          onClick={handleAdd}
          className="bg-primary hover:bg-primary/90 text-primary-foreground h-11 px-6 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-5 h-5 mr-2" />
          Assign Proxy
        </Button>
      </header>

      <div className="flex items-center justify-between mb-2">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search tasks or locations..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-border/60 focus-visible:ring-primary/30 h-11 rounded-xl shadow-sm"
          />
        </div>
        <div className="text-sm text-muted-foreground font-medium bg-card px-4 py-2.5 rounded-xl border border-border/60 shadow-sm hidden sm:block">
          {filteredTasks?.length || 0} Tasks Active
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border/60 p-6 h-[220px]">
              <Skeleton className="h-6 w-3/4 mb-4 bg-muted/50" />
              <Skeleton className="h-4 w-1/2 mb-8 bg-muted/50" />
              <div className="flex justify-between mt-auto">
                <Skeleton className="h-8 w-20 rounded-full bg-muted/50" />
                <Skeleton className="h-8 w-20 bg-muted/50" />
              </div>
            </div>
          ))
        ) : filteredTasks?.length === 0 ? (
          <div className="col-span-full py-20 bg-card rounded-2xl border border-border/60 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-background border border-border/50 flex items-center justify-center mb-4">
              <Briefcase className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-serif text-foreground mb-2">No proxy tasks found</h3>
            <p className="text-muted-foreground max-w-md">Create a new proxy assignment to keep track of hearings, filings, and court attendances.</p>
          </div>
        ) : (
          filteredTasks?.map((t) => (
            <div key={t.id} className="bg-card rounded-2xl border border-border/60 shadow-lg shadow-black/5 hover:border-primary/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group relative overflow-hidden">
              {t.status === "Completed" && <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 blur-xl rounded-full" />}
              {t.status === "Pending" && <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 blur-xl rounded-full" />}
              
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <StatusBadge status={t.status} />
                  <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(t)} className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => confirmDelete(t.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <p className="text-foreground font-medium text-lg leading-snug mb-6 flex-1">
                  {t.taskDescription}
                </p>
                
                <div className="flex items-center justify-between text-sm pt-4 border-t border-border/50">
                  <div className="flex items-center text-muted-foreground max-w-[60%]">
                    <MapPin className="w-4 h-4 mr-1.5 flex-shrink-0" />
                    <span className="truncate">{t.location || "Location TBD"}</span>
                  </div>
                  <div className="flex items-center font-mono font-semibold text-primary">
                    <IndianRupee className="w-3.5 h-3.5 mr-0.5" />
                    {t.fee || "0"}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} taskItem={selectedTask} />
      
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this proxy task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-border hover:bg-white/5">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => taskToDelete && deleteMutation.mutate({ id: taskToDelete })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
