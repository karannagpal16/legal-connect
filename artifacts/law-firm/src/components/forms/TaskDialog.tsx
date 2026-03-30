import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateTask, useUpdateTask, getListTasksQueryKey, type Task } from "@workspace/api-client-react";
import { taskSchema, type TaskFormValues } from "@/lib/schemas";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskItem?: Task | null;
}

export function TaskDialog({ open, onOpenChange, taskItem }: TaskDialogProps) {
  const isEditing = !!taskItem;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      taskDescription: "",
      fee: "",
      location: "",
      status: "Pending",
    },
  });

  useEffect(() => {
    if (open && taskItem) {
      form.reset({
        taskDescription: taskItem.taskDescription,
        fee: taskItem.fee || "",
        location: taskItem.location || "",
        status: taskItem.status as any,
      });
    } else if (open && !taskItem) {
      form.reset({
        taskDescription: "",
        fee: "",
        location: "",
        status: "Pending",
      });
    }
  }, [open, taskItem, form]);

  const createMutation = useCreateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        toast({ title: "Task created successfully" });
        onOpenChange(false);
      },
      onError: (err: any) => {
        toast({ title: "Failed to create task", description: err.message, variant: "destructive" });
      }
    }
  });

  const updateMutation = useUpdateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        toast({ title: "Task updated successfully" });
        onOpenChange(false);
      },
      onError: (err: any) => {
        toast({ title: "Failed to update task", description: err.message, variant: "destructive" });
      }
    }
  });

  const onSubmit = (data: TaskFormValues) => {
    const payload = {
      ...data,
      fee: data.fee || null,
      location: data.location || null,
    };

    if (isEditing && taskItem) {
      updateMutation.mutate({ id: taskItem.id, data: payload as any });
    } else {
      createMutation.mutate({ data: payload as any });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border/50 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-primary">{isEditing ? "Edit Task" : "Assign Proxy Task"}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEditing ? "Update proxy task details." : "Create a new proxy task assignment."}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4">
          <div className="space-y-2">
            <Label htmlFor="taskDescription" className="text-foreground/90">Task Description</Label>
            <Textarea 
              id="taskDescription" 
              placeholder="Detail the proxy assignment..." 
              className="bg-background border-border/50 focus-visible:ring-primary/30 min-h-[100px] resize-none"
              {...form.register("taskDescription")} 
            />
            {form.formState.errors.taskDescription && (
              <p className="text-sm text-destructive">{form.formState.errors.taskDescription.message}</p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fee" className="text-foreground/90">Fee Assigned (₹)</Label>
              <Input 
                id="fee" 
                placeholder="e.g. 1500" 
                className="bg-background border-border/50 focus-visible:ring-primary/30 h-11"
                {...form.register("fee")} 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status" className="text-foreground/90">Status</Label>
              <Select 
                onValueChange={(val) => form.setValue("status", val as any)} 
                defaultValue={form.getValues("status")}
              >
                <SelectTrigger className="bg-background border-border/50 focus-visible:ring-primary/30 h-11">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="text-foreground/90">Location / Court</Label>
            <Input 
              id="location" 
              placeholder="e.g. Tis Hazari Court, Room 14" 
              className="bg-background border-border/50 focus-visible:ring-primary/30 h-11"
              {...form.register("location")} 
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="bg-transparent border-border hover:bg-white/5 h-11 px-6 rounded-xl"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11 px-8 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl transition-all"
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? "Save Changes" : "Assign Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
