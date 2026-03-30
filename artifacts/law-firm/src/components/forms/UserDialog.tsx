import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateUser, useUpdateUser, getListUsersQueryKey, type User } from "@workspace/api-client-react";
import { userSchema, type UserFormValues } from "@/lib/schemas";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userItem?: User | null;
}

export function UserDialog({ open, onOpenChange, userItem }: UserDialogProps) {
  const isEditing = !!userItem;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      barId: "",
      role: "Advocate",
    },
  });

  useEffect(() => {
    if (open && userItem) {
      form.reset({
        name: userItem.name,
        email: userItem.email,
        barId: userItem.barId || "",
        role: userItem.role as any,
      });
    } else if (open && !userItem) {
      form.reset({
        name: "",
        email: "",
        barId: "",
        role: "Advocate",
      });
    }
  }, [open, userItem, form]);

  const createMutation = useCreateUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: "User created successfully" });
        onOpenChange(false);
      },
      onError: (err: any) => {
        toast({ title: "Failed to create user", description: err.message, variant: "destructive" });
      }
    }
  });

  const updateMutation = useUpdateUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: "User updated successfully" });
        onOpenChange(false);
      },
      onError: (err: any) => {
        toast({ title: "Failed to update user", description: err.message, variant: "destructive" });
      }
    }
  });

  const onSubmit = (data: UserFormValues) => {
    const payload = {
      ...data,
      barId: data.barId || null,
    };

    if (isEditing && userItem) {
      updateMutation.mutate({ id: userItem.id, data: payload as any });
    } else {
      createMutation.mutate({ data: payload as any });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border/50 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-primary">{isEditing ? "Edit Personnel" : "Add Firm Member"}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEditing ? "Update member profile details." : "Register a new advocate or intern to the system."}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground/90">Full Name</Label>
            <Input 
              id="name" 
              placeholder="e.g. Ramesh Kumar" 
              className="bg-background border-border/50 focus-visible:ring-primary/30 h-11"
              {...form.register("name")} 
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground/90">Email Address</Label>
            <Input 
              id="email" 
              type="email"
              placeholder="name@firm.com" 
              className="bg-background border-border/50 focus-visible:ring-primary/30 h-11"
              {...form.register("email")} 
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="barId" className="text-foreground/90">Bar ID (Optional)</Label>
              <Input 
                id="barId" 
                placeholder="e.g. D/1234/2010" 
                className="bg-background border-border/50 focus-visible:ring-primary/30 h-11"
                {...form.register("barId")} 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role" className="text-foreground/90">Firm Role</Label>
              <Select 
                onValueChange={(val) => form.setValue("role", val as any)} 
                defaultValue={form.getValues("role")}
              >
                <SelectTrigger className="bg-background border-border/50 focus-visible:ring-primary/30 h-11">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Advocate">Advocate</SelectItem>
                  <SelectItem value="Intern">Intern</SelectItem>
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
              {isEditing ? "Save Changes" : "Add Member"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
