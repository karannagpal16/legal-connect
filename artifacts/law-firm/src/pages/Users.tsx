import { useState } from "react";
import { useListUsers, useCreateUser, useUpdateUser, useDeleteUser } from "@workspace/api-client-react";
import type { User, CreateUserRequestRole } from "@workspace/api-client-react";
import { Plus, Search, Edit2, Trash2, Shield, User as UserIcon, Phone, MapPin, Mail } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional().nullable(),
  barId: z.string().optional().nullable(),
  locationBase: z.string().optional().nullable(),
  role: z.enum(["Admin", "Associate", "Intern", "Proxy"]),
});

export function Users() {
  const { data: users, isLoading } = useListUsers();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { mutate: deleteUser } = useDeleteUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        toast({ title: "User deleted" });
      }
    }
  });

  const filteredUsers = users?.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Firm Members</h1>
          <p className="mt-1 text-muted-foreground">Manage advocates, interns, and proxy network.</p>
        </div>
        <button 
          onClick={() => { setEditingUser(null); setDialogOpen(true); }}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-4 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all hover:-translate-y-1 min-h-[48px]"
        >
          <Plus className="w-5 h-5" />
          Add Member
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input 
          type="text"
          placeholder="Search members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-card border-2 border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-base"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-card rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers?.map((u) => (
            <div key={u.id} className="bg-card border border-border rounded-2xl p-6 hover:border-primary/50 transition-colors shadow-sm relative overflow-hidden group">
              <div className={`absolute top-0 right-0 w-2 h-full ${
                u.role === 'Admin' ? 'bg-primary' :
                u.role === 'Associate' ? 'bg-blue-500' :
                u.role === 'Proxy' ? 'bg-accent' : 'bg-green-500'
              }`} />
              
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-background border border-border flex items-center justify-center text-primary font-bold text-xl">
                  {u.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground leading-tight">{u.name}</h3>
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{u.role}</span>
                </div>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground mb-6">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary/70" />
                  <span className="truncate">{u.email}</span>
                </div>
                {u.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary/70" />
                    <span>{u.phone}</span>
                  </div>
                )}
                {u.barId && (
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary/70" />
                    <span>{u.barId}</span>
                  </div>
                )}
                {u.locationBase && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary/70" />
                    <span>{u.locationBase}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => { setEditingUser(u); setDialogOpen(true); }}
                  className="flex-1 bg-background hover:bg-primary/10 hover:text-primary border border-border text-foreground font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
                <button 
                  onClick={() => { if(confirm("Delete user?")) deleteUser({ id: u.id }) }}
                  className="p-2.5 bg-background border border-border rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <UserDialog open={dialogOpen} onOpenChange={setDialogOpen} editingUser={editingUser} />
    </div>
  );
}

function UserDialog({ open, onOpenChange, editingUser }: any) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const form = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: editingUser || {
      name: "",
      email: "",
      phone: "",
      barId: "",
      locationBase: "",
      role: "Intern" as CreateUserRequestRole
    }
  });

  const { mutate: create } = useCreateUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        onOpenChange(false);
        form.reset();
        toast({ title: "User created" });
      }
    }
  });

  const { mutate: update } = useUpdateUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        onOpenChange(false);
        toast({ title: "User updated" });
      }
    }
  });

  const onSubmit = (data: any) => {
    if (editingUser) {
      update({ id: editingUser.id, data });
    } else {
      create({ data });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">{editingUser ? "Edit Member" : "Add Member"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Full Name</label>
            <input {...form.register("name")} className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Email</label>
            <input type="email" {...form.register("email")} className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Phone</label>
              <input {...form.register("phone")} className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Role</label>
              <select {...form.register("role")} className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none">
                <option value="Admin">Admin</option>
                <option value="Associate">Associate</option>
                <option value="Intern">Intern</option>
                <option value="Proxy">Proxy Network</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Bar ID (Optional)</label>
              <input {...form.register("barId")} className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Location Base</label>
              <input placeholder="e.g. Tis Hazari" {...form.register("locationBase")} className="w-full p-3 rounded-xl bg-background border border-border focus:border-primary outline-none" />
            </div>
          </div>
          <button type="submit" className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl mt-4 hover:opacity-90">
            {editingUser ? "Save Changes" : "Save Member"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
