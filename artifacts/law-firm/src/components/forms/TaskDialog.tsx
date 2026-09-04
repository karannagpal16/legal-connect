import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { workspaceRequest } from "@/lib/workspace";
import {
  PLATFORM_CHARGE_TOTAL_INR,
  PROXY_MIN_FEE,
  PROXY_URGENCY_TIERS,
  humanProxyStatus,
  proxySettlementBreakdown,
  proxyUrgencyMeta,
  resolveProxyUrgency,
  type ProxyUrgencyTier,
} from "@/lib/proxyFlow";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const taskSchema = z.object({
  taskDescription: z.string().min(12, "Passover script must be at least 12 characters"),
  taskType: z.enum(["Pass-over", "Adjournment", "Evidence", "Arguments", "Other"]),
  urgency: z.enum(["urgent", "priority", "standard"]),
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
  const urgency = resolveProxyUrgency(editingTask?.urgency || editingTask?.timingTier);
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
    urgency,
    fee: String(editingTask?.fee ?? editingTask?.amount ?? PROXY_URGENCY_TIERS[urgency].fee),
    location: String(editingTask?.location || editingTask?.court || ""),
    cnr: String(editingTask?.cnr || "").toUpperCase(),
    room: String(editingTask?.room || editingTask?.roomNo || ""),
    itemNo: editingTask?.itemNo ? String(editingTask.itemNo) : "",
    hearingDate,
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive" role="alert">{message}</p>;
}

const emptyDefaults: TaskFormValues = {
  taskDescription: "",
  taskType: "Pass-over",
  urgency: "standard",
  fee: String(PROXY_URGENCY_TIERS.standard.fee),
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

  const watchedUrgency = form.watch("urgency") as ProxyUrgencyTier;
  const urgencyMeta = proxyUrgencyMeta(watchedUrgency);
  const feeBreakdown = proxySettlementBreakdown(urgencyMeta.fee);

  useEffect(() => {
    if (!open) return;
    form.reset(editingTask ? mapEditingDefaults(editingTask) : emptyDefaults);
  }, [editingTask, form, open]);

  useEffect(() => {
    if (!open || isEditing) return;
    form.setValue("fee", String(urgencyMeta.fee), { shouldValidate: true });
  }, [form, isEditing, open, urgencyMeta.fee]);

  const finishPosted = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    onOpenChange(false);
    form.reset(emptyDefaults);
    toast({
      title: "Proxy task posted",
      description: `${urgencyMeta.label}: Work Completion Hold recorded. Legal Connect will review and assign a proxy counsel.`,
    });
  };

  const verifyAndPost = async (data: TaskFormValues, feeAmount: number, payment: {
    mode?: string;
    orderId?: string;
    paymentId?: string;
    signature?: string;
  }) => {
    const urgency = resolveProxyUrgency(data.urgency);
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
        urgency,
        timingTier: urgency,
        slaAfterAssign: PROXY_URGENCY_TIERS[urgency].slaAfterAssign,
        mode: payment.mode,
        razorpay_order_id: payment.orderId,
        razorpay_payment_id: payment.paymentId,
        razorpay_signature: payment.signature,
      }),
    });
    finishPosted();
  };

  const onSubmit = async (data: TaskFormValues) => {
    const urgency = resolveProxyUrgency(data.urgency);
    const catalogFee = PROXY_URGENCY_TIERS[urgency].fee;
    const feeAmount = isEditing ? parseFee(data.fee) : catalogFee;

    if (isEditing) {
      if (!session?.token) {
        toast({ title: "Sign in required", description: "Please sign in again.", variant: "destructive" });
        return;
      }
      setSaving(true);
      try {
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
            urgency: resolveProxyUrgency(editingTask?.urgency || data.urgency),
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
        description: "Select a timing tier, then pay to post for Admin assignment.",
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
          urgency,
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

  const errors = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px] bg-card border-border">
        <DialogHeader className="shrink-0 px-6 pb-2 pt-6 pr-12">
          <DialogTitle className="text-2xl font-serif">{isEditing ? "Edit mission details" : "Post Proxy Task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 pb-3 max-h-[calc(92dvh-10.5rem)]">
            <p className="text-xs text-muted-foreground">
              Pay &amp; post → LC assigns → proxy uploads proof → you confirm → LC split-settles. Flat ₹{PLATFORM_CHARGE_TOTAL_INR} technology fee (incl. GST); no share of the professional fee.
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
                className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none min-h-[72px]"
                placeholder="Exact passover script for proxy counsel (min. 12 characters). Do not add client secrets."
              />
              <FieldError message={errors.taskDescription?.message} />
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
                <label className="text-sm font-semibold">Posting time / urgency</label>
                <select
                  {...form.register("urgency")}
                  disabled={isEditing}
                  className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none disabled:opacity-70"
                >
                  {(Object.keys(PROXY_URGENCY_TIERS) as ProxyUrgencyTier[]).map((key) => {
                    const tier = PROXY_URGENCY_TIERS[key];
                    return (
                      <option key={key} value={key}>
                        {tier.label} · ₹{tier.fee.toLocaleString("en-IN")}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground space-y-1">
              <p><strong className="text-foreground">{urgencyMeta.label}</strong> — {urgencyMeta.postingHint}. After assign: {urgencyMeta.slaAfterAssign}.</p>
              <p>
                You pay <strong className="text-foreground">₹{urgencyMeta.fee.toLocaleString("en-IN")}</strong>. LC locks it against a booking ID.
                Split on release: advocate <strong className="text-foreground">₹{feeBreakdown.professionalFee.toLocaleString("en-IN")}</strong>
                {" "}· ProxyHub <strong className="text-foreground">₹{(feeBreakdown.platformFee + feeBreakdown.gstOnPlatformFee).toLocaleString("en-IN")}</strong>
                {" "}(₹{feeBreakdown.platformFee} + ₹{feeBreakdown.gstOnPlatformFee} GST).
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Fee (set by urgency)</label>
              <input
                {...form.register("fee")}
                readOnly
                className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none opacity-80"
              />
              {isEditing ? <p className="text-[11px] text-muted-foreground">Held fee and urgency cannot be changed after payment.</p> : null}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">CNR number</label>
                <input {...form.register("cnr")} className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none uppercase" placeholder="DLCT010012342023" />
                <FieldError message={errors.cnr?.message} />
                <p className="text-[11px] text-muted-foreground">16-character CNR, or an 8+ character court diary number.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Hearing date</label>
                <input type="date" {...form.register("hearingDate")} className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none" />
                <FieldError message={errors.hearingDate?.message} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Court</label>
                <input {...form.register("location")} className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none" placeholder="Saket / Tis Hazari / DHC" />
                <FieldError message={errors.location?.message} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Room No.</label>
                <input {...form.register("room")} className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none" placeholder="204" />
                <FieldError message={errors.room?.message} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Item No. (optional)</label>
              <input {...form.register("itemNo")} className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none" placeholder="12" />
            </div>
          </div>
          <div className="shrink-0 border-t border-border bg-card px-6 py-4 space-y-2">
            {Object.values(errors)[0]?.message ? (
              <p className="text-sm text-destructive" role="alert">{String(Object.values(errors)[0]?.message)}</p>
            ) : null}
            <button type="submit" disabled={paying || saving} className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-all text-lg shadow-lg shadow-primary/20 disabled:opacity-60">
              {paying || saving ? "Processing..." : isEditing ? "Save mission details" : `Pay ₹${urgencyMeta.fee.toLocaleString("en-IN")} & Post Task`}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
