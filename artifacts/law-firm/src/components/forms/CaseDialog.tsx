import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateCase, useUpdateCase, getListCasesQueryKey, type Case } from "@workspace/api-client-react";
import { caseSchema, type CaseFormValues } from "@/lib/schemas";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface CaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseItem?: Case | null;
}

export function CaseDialog({ open, onOpenChange, caseItem }: CaseDialogProps) {
  const isEditing = !!caseItem;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CaseFormValues>({
    resolver: zodResolver(caseSchema),
    defaultValues: {
      caseTitle: "",
      caseNumber: "",
      courtName: "",
      nextDate: "",
      status: "Active",
    },
  });

  useEffect(() => {
    if (open && caseItem) {
      form.reset({
        caseTitle: caseItem.caseTitle,
        caseNumber: caseItem.caseNumber,
        courtName: caseItem.courtName,
        nextDate: caseItem.nextDate ? new Date(caseItem.nextDate).toISOString().split('T')[0] : "",
        status: caseItem.status as any,
      });
    } else if (open && !caseItem) {
      form.reset({
        caseTitle: "",
        caseNumber: "",
        courtName: "",
        nextDate: "",
        status: "Active",
      });
    }
  }, [open, caseItem, form]);

  const createMutation = useCreateCase({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCasesQueryKey() });
        toast({ title: "Case created successfully", variant: "default" });
        onOpenChange(false);
      },
      onError: (err: any) => {
        toast({ title: "Failed to create case", description: err.message, variant: "destructive" });
      }
    }
  });

  const updateMutation = useUpdateCase({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCasesQueryKey() });
        toast({ title: "Case updated successfully" });
        onOpenChange(false);
      },
      onError: (err: any) => {
        toast({ title: "Failed to update case", description: err.message, variant: "destructive" });
      }
    }
  });

  const onSubmit = (data: CaseFormValues) => {
    // Convert empty string date to null if needed, but schema allows string
    const payload = {
      ...data,
      nextDate: data.nextDate || null,
    };

    if (isEditing && caseItem) {
      updateMutation.mutate({ id: caseItem.id, data: payload as any });
    } else {
      createMutation.mutate({ data: payload as any });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border/50 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-primary">{isEditing ? "Edit Case" : "Add New Case"}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEditing ? "Update the details of the existing case." : "Enter the details for the new case record."}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4">
          <div className="space-y-2">
            <Label htmlFor="caseTitle" className="text-foreground/90">Case Title</Label>
            <Input 
              id="caseTitle" 
              placeholder="e.g. State vs. Sharma" 
              className="bg-background border-border/50 focus-visible:ring-primary/30 h-11"
              {...form.register("caseTitle")} 
            />
            {form.formState.errors.caseTitle && (
              <p className="text-sm text-destructive">{form.formState.errors.caseTitle.message}</p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="caseNumber" className="text-foreground/90">Case Number</Label>
              <Input 
                id="caseNumber" 
                placeholder="e.g. CS-102/24" 
                className="bg-background border-border/50 focus-visible:ring-primary/30 h-11"
                {...form.register("caseNumber")} 
              />
              {form.formState.errors.caseNumber && (
                <p className="text-sm text-destructive">{form.formState.errors.caseNumber.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="courtName" className="text-foreground/90">Court Name</Label>
              <Input 
                id="courtName" 
                placeholder="e.g. Delhi High Court" 
                className="bg-background border-border/50 focus-visible:ring-primary/30 h-11"
                {...form.register("courtName")} 
              />
              {form.formState.errors.courtName && (
                <p className="text-sm text-destructive">{form.formState.errors.courtName.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nextDate" className="text-foreground/90">Next Date</Label>
              <Input 
                id="nextDate" 
                type="date"
                className="bg-background border-border/50 focus-visible:ring-primary/30 h-11 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                {...form.register("nextDate")} 
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
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                  <SelectItem value="Adjourned">Adjourned</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              {isEditing ? "Save Changes" : "Create Case"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
