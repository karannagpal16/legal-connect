import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { workspaceRequest } from "@/lib/workspace";
import { humanProxyStatus } from "@/lib/proxyFlow";

const PROXY_MIN_FEE = 400;

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const taskSchema = z.object({
  taskDescription: z.string().min(12, "Passover script must be at least 12 characters"),
  taskType: z.enum(["Pass-over", "Adjournment", "Evidence", "Arguments", "Other"]),
  fee: z.string().min(1, "Fee is required"),
  location: z.string().min(1, "Court / location is required"),
  cnr: z.string().min(8, "CNR number is required"),
  room: z.string().min(1, "Room number is required"),
  itemNo: z.string().optional().nullable(),
  hearingDate: z.string().min(1, "Hearing date is required"),
});

type TaskFormValues = z.infer<typeof taskSchema>;

function parseFee(value: string) {
  const amount = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(amount) ? Math.round(amount) : 0;
}

function mapEditingDefaults(editingTask: any): TaskFormValues {
  const hearingRaw = editingTask?.hearingDate || "";
  const hearingDate = hearingRaw ? String(hearingRaw).slice(0, 10) : "";
  return {
    taskDescription: String(
      editingTask?.passoverScript
      || editingTask?.passoverInstructions
      || editingTask?.taskDescription
      || editingTask?.title
      || "",
    ),
    taskType: (["Pass-over", "Adjournment", "Evidence", "Arguments", "Other"].includes(String(editingTask?.taskType || editingTask?.appearanceType))
      ? (editingTask?.taskType || editingTask?.appearanceType)
      : "Pass-over") as TaskFormValues["taskType"],
    fee: String(editingTask?.fee ?? editingTask?.amount ?? PROXY_MIN_FEE),
    location: String(editingTask?.location || editingTask?.court || ""),
    cnr: String(editingTask?.cnr || "").toUpperCase(),
    room: String(editingTask?.room || editingTask?.roomNo || ""),
    itemNo: editingTask?.itemNo ? String(editingTask.itemNo) : "",
    hearingDate,
  };
}

const emptyDefaults: TaskFormValues = {
  taskDescription: "",
  taskType: "Pass-over",
  fee: String(PROXY_MIN_FEE),
  location: "",
  cnr: "",
  room: "",
  itemNo: "",
  hearingDate: "",
};

async function loadRazorpay() {
  if (window.Razorpay) return true;
  return new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

export function TaskDialog({ open, onOpenChange, editingTask }: any) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { session } = useAuth();
  const [paying, setPaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(editingTask?.id);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: emptyDefaults,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(editingTask ? mapEditingDefaults(editingTask) : emptyDefaults);
  }, [editingTask, form, open]);

  const finishPosted = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    onOpenChange(false);
    form.reset(emptyDefaults);
    toast({
      title: "Proxy task posted",
      description: "Payment held in escrow. Legal Connect will review and assign a proxy counsel.",
    });
  };

  const verifyAndPost = async (data: TaskFormValues, feeAmount: number, payment: {
    mode?: string;
    orderId?: string;
    paymentId?: string;
    signature?: string;
  }) => {
    await workspaceRequest("/api/proxy-hub/verify-payment", session?.token, {
      method: "POST",
      body: JSON.stringify({
        title: `${data.taskType} · ${String(data.cnr || "").trim().toUpperCase()}`,
        missionTitle: `${data.taskType} · ${String(data.cnr || "").trim().toUpperCase()}`,
        court: data.location,
        location: data.location,
        fee: feeAmount,
        amount: feeAmount,
        cnr: String(data.cnr || "").trim().toUpperCase(),
        room: data.room,
        roomNo: data.room,
        itemNo: data.itemNo,
        passoverScript: data.taskDescription,
        passoverInstructions: data.taskDescription,
        taskDescription: data.taskDescription,
        appearanceType: data.taskType,
        taskType: data.taskType,
        hearingDate: data.hearingDate,
        mode: payment.mode,
        razorpay_order_id: payment.orderId,
        razorpay_payment_id: payment.paymentId,
        razorpay_signature: payment.signature,
      }),
    });
    finishPosted();
  };

  const onSubmit = async (data: TaskFormValues) => {
    const feeAmount = parseFee(data.fee);

    if (isEditing) {
      if (!session?.token) {
        toast({ title: "Sign in required", description: "Please sign in again.", variant: "destructive" });
        return;
      }
      setSaving(true);
      try {
        // Never rewrite workflow status from the edit form — preserve LC/proxy machine state.
        await workspaceRequest(`/api/tasks/${editingTask.id}`, session.token, {
          method: "PUT",
          body: JSON.stringify({
            taskDescription: data.taskDescription,
            title: `${data.taskType} · ${String(data.cnr || "").trim().toUpperCase()}`,
            taskType: data.taskType,
            appearanceType: data.taskType,
            location: data.location,
            court: data.location,
            cnr: String(data.cnr || "").trim().toUpperCase(),
            room: data.room,
            roomNo: data.room,
            itemNo: data.itemNo || null,
            passoverScript: data.taskDescription,
            passoverInstructions: data.taskDescription,
            hearingDate: data.hearingDate,
            // Fee already escrowed; keep amount stable on edit.
            fee: String(editingTask.fee ?? editingTask.amount ?? feeAmount),
            amount: Number(editingTask.amount ?? editingTask.fee ?? feeAmount),
          }),
        });
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        onOpenChange(false);
        toast({ title: "Mission details updated", description: "Workflow status was preserved for LC / proxy transparency." });
      } catch (error) {
        toast({
          title: "Task could not be updated",
          description: error instanceof Error ? error.message : "Please retry.",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
      return;
    }

    if (feeAmount < PROXY_MIN_FEE) {
      toast({
        title: `Minimum proxy fee is ₹${PROXY_MIN_FEE}`,
        description: "Increase the fee, then pay to post for Admin assignment.",
        variant: "destructive",
      });
      return;
    }

    if (!session?.token) {
      toast({ title: "Sign in required", description: "Please sign in again to post a proxy task.", variant: "destructive" });
      return;
    }

    setPaying(true);
    try {
      const order = await workspaceRequest<any>("/api/proxy-hub/create-order", session.token, {
        method: "POST",
        body: JSON.stringify({
          title: `${data.taskType} · ${String(data.cnr || "").trim().toUpperCase()}`,
          fee: feeAmount,
          amount: feeAmount,
        }),
      });

      if (order.mode === "master_test_free" || order.developerAccount) {
        await verifyAndPost(data, feeAmount, {
          mode: "master_test_free",
          orderId: order.orderId,
          paymentId: `pay_dev_${Date.now()}`,
          signature: "developer",
        });
        return;
      }

      if (order.mode === "demo") {
        await verifyAndPost(data, feeAmount, {
          mode: "demo",
          orderId: order.orderId,
          paymentId: `pay_demo_${Date.now()}`,
          signature: "demo",
        });
        return;
      }

      if (!order.orderId || !order.keyId) {
        throw new Error(order.error || "Payment order could not be created.");
      }

      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) {
        throw new Error("Secure checkout could not be loaded. Please retry.");
      }

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || "INR",
        order_id: order.orderId,
        name: "Legal Connect",
        description: order.description || "ProxyHub mission fee",
        prefill: {
          name: session.user.name || "Advocate",
          ...(session.user.email ? { email: session.user.email } : {}),
        },
        theme: { color: "#a87928" },
        handler: async (response: any) => {
          try {
            await verifyAndPost(data, feeAmount, {
              mode: "razorpay",
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
          } catch (error) {
            toast({
              title: "Payment verified but posting failed",
              description: error instanceof Error ? error.message : "Please contact support with your payment id.",
              variant: "destructive",
            });
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
      });
      checkout.open();
      return;
    } catch (error) {
      toast({
        title: "Proxy task could not be posted",
        description: error instanceof Error ? error.message : "Payment could not be started.",
        variant: "destructive",
      });
    } finally {
      setPaying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">{isEditing ? "Edit mission details" : "Post Proxy Task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <p className="text-xs text-muted-foreground">
            Flow: Main counsel pays &amp; posts → LC reviews/assigns → Proxy appears &amp; uploads proof → Main counsel OK/Not OK → LC releases net after 10% + 3% tax.
            Guaranteed-outcome wording is blocked under Bar Council Rule 36.
          </p>
          {isEditing ? (
            <p className="text-xs font-semibold text-foreground bg-muted/40 border border-border rounded-xl px-3 py-2">
              Workflow status (read-only): {humanProxyStatus(editingTask)} · {String(editingTask?.status || "—")}
            </p>
          ) : null}
          <div className="space-y-2">
            <label className="text-sm font-semibold">Passover script / instructions</label>
            <textarea
              {...form.register("taskDescription")}
              className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none min-h-[100px]"
              placeholder="Exact passover script for proxy counsel. Do not add client secrets."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Appearance type</label>
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
              <input
                {...form.register("fee")}
                readOnly={isEditing}
                className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none read-only:opacity-70"
                placeholder="400"
              />
              {isEditing ? <p className="text-[11px] text-muted-foreground">Escrowed fee cannot be changed after payment.</p> : null}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">CNR number</label>
              <input {...form.register("cnr")} className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none" placeholder="DLCT010012342023" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Hearing date</label>
              <input type="date" {...form.register("hearingDate")} className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Court</label>
              <input {...form.register("location")} className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none" placeholder="Saket / Tis Hazari / DHC" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Room No.</label>
              <input {...form.register("room")} className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none" placeholder="204" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Item No. (optional)</label>
            <input {...form.register("itemNo")} className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none" placeholder="12" />
          </div>
          {Object.values(form.formState.errors)[0]?.message && (
            <p className="text-sm text-destructive" role="alert">{String(Object.values(form.formState.errors)[0]?.message)}</p>
          )}
          <button type="submit" disabled={paying || saving} className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl mt-4 hover:opacity-90 transition-all text-lg shadow-lg shadow-primary/20 disabled:opacity-60">
            {paying || saving ? "Processing..." : isEditing ? "Save mission details" : "Pay & Post Task"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
