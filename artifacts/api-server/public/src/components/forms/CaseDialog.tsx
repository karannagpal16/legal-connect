import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateCase, useUpdateCase } from "@workspace/api-client-react";
import type { CreateCaseRequestStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const DELHI_COURTS = [
  "Tis Hazari",
  "Patiala House",
  "Saket",
  "Rohini",
  "Dwarka",
  "Karkardooma",
  "Delhi High Court",
  "Supreme Court of India",
  "Other",
];

const caseSchema = z.object({
  caseTitle: z.string().min(1, "Title required"),
  caseNumber: z.string().min(1, "Number required"),
  courtName: z.string().min(1, "Court required"),
  courtRoomNo: z.string().optional().nullable(),
  judgeName: z.string().optional().nullable(),
  nextDate: z.string().optional().nullable(),
  status: z.enum(["Active", "Pending", "Disposed", "Adjourned"]),
});

export function CaseDialog({ open, onOpenChange, editingCase }: any) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const form = useForm({
    resolver: zodResolver(caseSchema),
    defaultValues: editingCase || {
      caseTitle: "",
      caseNumber: "",
      courtName: "Tis Hazari",
      courtRoomNo: "",
      judgeName: "",
      nextDate: "",
      status: "Active" as CreateCaseRequestStatus
    }
  });

  const { mutate: create } = useCreateCase({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
        onOpenChange(false);
        form.reset();
        toast({ title: "Case created" });
      }
    }
  });

  const { mutate: update } = useUpdateCase({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
        onOpenChange(false);
        toast({ title: "Case updated" });
      }
    }
  });

  const onSubmit = (data: any) => {
    if (editingCase) {
      update({ id: editingCase.id, data });
    } else {
      create({ data });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border p-6 sm:p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-foreground">{editingCase ? "Edit Case Record" : "Add New Case"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Case Title</label>
            <input {...form.register("caseTitle")} className="w-full p-4 rounded-xl bg-background border border-border focus:border-primary outline-none text-foreground" placeholder="e.g. State v. Ramesh" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Case Number</label>
              <input {...form.register("caseNumber")} className="w-full p-4 rounded-xl bg-background border border-border focus:border-primary outline-none text-foreground" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Status</label>
              <select {...form.register("status")} className="w-full p-4 rounded-xl bg-background border border-border focus:border-primary outline-none text-foreground appearance-none">
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Disposed">Disposed</option>
                <option value="Adjourned">Adjourned</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Court Name</label>
            <select {...form.register("courtName")} className="w-full p-4 rounded-xl bg-background border border-border focus:border-primary outline-none text-foreground appearance-none">
              {DELHI_COURTS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Court Room No.</label>
              <input {...form.register("courtRoomNo")} className="w-full p-4 rounded-xl bg-background border border-border focus:border-primary outline-none text-foreground" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Judge Name</label>
              <input {...form.register("judgeName")} className="w-full p-4 rounded-xl bg-background border border-border focus:border-primary outline-none text-foreground" placeholder="e.g. Hon'ble Sharma J." />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Next Date of Hearing</label>
            <input type="date" {...form.register("nextDate")} className="w-full p-4 rounded-xl bg-background border border-border focus:border-primary outline-none text-foreground" />
          </div>

          <button type="submit" className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl mt-6 hover:shadow-lg hover:shadow-primary/20 transition-all text-lg">
            {editingCase ? "Save Case Record" : "Add to Diary"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
