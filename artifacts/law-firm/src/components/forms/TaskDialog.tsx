import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateTask, useUpdateTask } from "@workspace/api-client-react";
import type { CreateTaskRequestStatus, CreateTaskRequestTaskType } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const taskSchema = z.object({
  taskDescription: z.string().min(1, "Description required"),
  taskType: z.enum(["Pass-over", "Adjournment", "Evidence", "Arguments", "Other"]).optional().nullable(),
  fee: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  status: z.enum(["Open", "Accepted", "Completed", "Cancelled"]),
});

export function TaskDialog({ open, onOpenChange, editingTask }: any) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const form = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: editingTask || {
      taskDescription: "",
      taskType: "Pass-over" as CreateTaskRequestTaskType,
      fee: "",
      location: "",
      status: "Open" as CreateTaskRequestStatus
    }
  });

  const { mutate: create } = useCreateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        onOpenChange(false);
        form.reset();
        toast({ title: "Task posted" });
      }
    }
  });

  const { mutate: update } = useUpdateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        onOpenChange(false);
        toast({ title: "Task updated" });
      }
    }
  });

  const onSubmit = (data: any) => {
    if (editingTask) {
      update({ id: editingTask.id, data });
    } else {
      create({ data });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">{editingTask ? "Edit Proxy Task" : "Post Proxy Task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Task Description</label>
            <textarea {...form.register("taskDescription")} className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none min-h-[100px]" placeholder="Detailed instructions for the proxy counsel..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Task Type</label>
              <select {...form.register("taskType")} className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none">
                <option value="Pass-over">Pass-over</option>
                <option value="Adjournment">Adjournment</option>
                <option value="Evidence">Evidence</option>
                <option value="Arguments">Arguments</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Fee Amount</label>
              <input {...form.register("fee")} className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none" placeholder="e.g. ₹1500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Location / Court</label>
              <input {...form.register("location")} className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none" placeholder="e.g. Tis Hazari Court 12" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Status</label>
              <select {...form.register("status")} className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none">
                <option value="Open">Open (Marketplace)</option>
                <option value="Accepted">Accepted</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <button type="submit" className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl mt-4 hover:opacity-90 transition-all text-lg shadow-lg shadow-primary/20">
            {editingTask ? "Save Changes" : "Post to Marketplace"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
