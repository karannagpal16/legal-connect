import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateTask, useUpdateTask } from "@workspace/api-client-react";
import type { CreateTaskRequestStatus, CreateTaskRequestTaskType } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const PROXY_MIN_FEE = 400;

const taskSchema = z.object({
  taskDescription: z.string().min(1, "Description required"),
  taskType: z.enum(["Pass-over", "Adjournment", "Evidence", "Arguments", "Other"]).optional().nullable(),
  fee: z.string().min(1, "Fee is required"),
  location: z.string().min(1, "Court / location is required"),
  room: z.string().optional().nullable(),
  itemNo: z.string().optional().nullable(),
  hearingDate: z.string().optional().nullable(),
  status: z.enum(["Open", "Accepted", "Completed", "Cancelled", "Awaiting Admin Assignment", "Assigned"]).optional(),
});

function parseFee(value: string) {
  const amount = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(amount) ? Math.round(amount) : 0;
}

export function TaskDialog({ open, onOpenChange, editingTask }: any) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: editingTask || {
      taskDescription: "",
      taskType: "Pass-over" as CreateTaskRequestTaskType,
      fee: String(PROXY_MIN_FEE),
      location: "",
      room: "",
      itemNo: "",
      hearingDate: "",
      status: "Awaiting Admin Assignment" as CreateTaskRequestStatus,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(editingTask || {
      taskDescription: "",
      taskType: "Pass-over" as CreateTaskRequestTaskType,
      fee: String(PROXY_MIN_FEE),
      location: "",
      room: "",
      itemNo: "",
      hearingDate: "",
      status: "Awaiting Admin Assignment" as CreateTaskRequestStatus,
    });
  }, [editingTask, form, open]);

  const { mutate: create, isPending: isCreating } = useCreateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        onOpenChange(false);
        form.reset();
        toast({
          title: "Proxy task posted & paid",
          description: "Legal Connect Admin will search and assign a proxy counsel.",
        });
      },
      onError: (error) => toast({ title: "Task could not be posted", description: error.message, variant: "destructive" }),
    },
  });

  const { mutate: update, isPending: isUpdating } = useUpdateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        onOpenChange(false);
        toast({ title: "Task updated" });
      },
      onError: (error) => toast({ title: "Task could not be updated", description: error.message, variant: "destructive" }),
    },
  });

  const onSubmit = (data: any) => {
    const feeAmount = parseFee(data.fee);
    if (!editingTask && feeAmount < PROXY_MIN_FEE) {
      toast({
        title: `Minimum proxy fee is ₹${PROXY_MIN_FEE}`,
        description: "Increase the fee, then pay to post for Admin assignment.",
        variant: "destructive",
      });
      return;
    }
    if (!editingTask) {
      const confirmed = window.confirm(
        `Pay ₹${feeAmount} and post this proxy task?\n\nAfter payment, Legal Connect Admin will assign a proxy counsel. Peer accept is disabled.`,
      );
      if (!confirmed) return;
    }

    const payload = {
      ...data,
      fee: String(feeAmount),
      amount: feeAmount,
      proxyTask: true,
      paymentConfirmed: true,
      status: editingTask ? data.status : "Awaiting Admin Assignment",
      taskDescription: [
        data.taskDescription,
        data.room ? `Room ${data.room}` : null,
        data.itemNo ? `Item ${data.itemNo}` : null,
        data.hearingDate ? `Date ${data.hearingDate}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    };

    if (editingTask) {
      update({ id: editingTask.id, data: payload });
    } else {
      create({ data: payload });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">{editingTask ? "Edit Proxy Task" : "Post Proxy Task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Task details / instructions</label>
            <textarea
              {...form.register("taskDescription")}
              className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none min-h-[100px]"
              placeholder="Passover instructions, room notes. Do not add client secrets."
            />
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
              <label className="text-sm font-semibold">Fee (min ₹{PROXY_MIN_FEE})</label>
              <input {...form.register("fee")} className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none" placeholder="400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Court</label>
              <input {...form.register("location")} className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none" placeholder="Saket / Tis Hazari / DHC" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Hearing date</label>
              <input type="date" {...form.register("hearingDate")} className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Room No.</label>
              <input {...form.register("room")} className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none" placeholder="204" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Item No.</label>
              <input {...form.register("itemNo")} className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none" placeholder="12" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Pay the fee to post. Legal Connect Admin searches panel counsel and assigns the task. Advocates cannot accept peer proxy tasks here.
          </p>
          {Object.values(form.formState.errors)[0]?.message && (
            <p className="text-sm text-destructive" role="alert">{String(Object.values(form.formState.errors)[0]?.message)}</p>
          )}
          <button type="submit" disabled={isCreating || isUpdating} className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl mt-4 hover:opacity-90 transition-all text-lg shadow-lg shadow-primary/20 disabled:opacity-60">
            {isCreating || isUpdating ? "Saving..." : editingTask ? "Save Changes" : "Pay & Post Task"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
