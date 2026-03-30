import { useState } from "react";
import { useListUsers, useDeleteUser, getListUsersQueryKey, type User } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit2, Trash2, Shield, User as UserIcon, Mail, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { UserDialog } from "@/components/forms/UserDialog";
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
import { cn } from "@/components/layout/Layout";

export function Users() {
  const { data: users, isLoading } = useListUsers();
  const [search, setSearch] = useState("");
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteMutation = useDeleteUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: "User removed successfully" });
        setDeleteOpen(false);
      },
      onError: (err: any) => {
        toast({ title: "Failed to remove user", description: err.message, variant: "destructive" });
      }
    }
  });

  const filteredUsers = users?.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.barId && u.barId.toLowerCase().includes(search.toLowerCase()))
  );

  const handleEdit = (u: User) => {
    setSelectedUser(u);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedUser(null);
    setDialogOpen(true);
  };

  const confirmDelete = (id: number) => {
    setUserToDelete(id);
    setDeleteOpen(true);
  };

  const RoleBadge = ({ role }: { role: string }) => {
    return (
      <div className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider",
        role === "Admin" ? "bg-primary/20 text-primary border border-primary/30" :
        role === "Advocate" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
        "bg-slate-500/10 text-slate-400 border border-slate-500/20"
      )}>
        {role === "Admin" && <Shield className="w-3 h-3 mr-1.5" />}
        {role}
      </div>
    )
  };

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Personnel Directory</h1>
          <p className="text-muted-foreground mt-1">Manage firm members, advocates, and access roles.</p>
        </div>
        <Button 
          onClick={handleAdd}
          className="bg-primary hover:bg-primary/90 text-primary-foreground h-11 px-6 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Member
        </Button>
      </header>

      <div className="bg-card rounded-2xl border border-border/60 shadow-xl shadow-black/10 overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-background/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, email, or Bar ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-background border-border/50 focus-visible:ring-primary/30 h-10 rounded-xl"
            />
          </div>
          <div className="text-sm text-muted-foreground font-medium">
            {filteredUsers?.length || 0} Members
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x border-b border-border/30 divide-border/30">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-6 flex gap-4">
                <Skeleton className="w-12 h-12 rounded-full bg-muted/50 flex-shrink-0" />
                <div className="space-y-3 w-full">
                  <Skeleton className="h-5 w-3/4 bg-muted/50" />
                  <Skeleton className="h-4 w-1/2 bg-muted/50" />
                  <Skeleton className="h-6 w-20 bg-muted/50" />
                </div>
              </div>
            ))
          ) : filteredUsers?.length === 0 ? (
            <div className="col-span-full py-16 text-center text-muted-foreground">
              <UserIcon className="w-12 h-12 mx-auto mb-3 text-border" />
              <p>No personnel found matching your search.</p>
            </div>
          ) : (
            filteredUsers?.map((u) => (
              <div key={u.id} className="p-6 hover:bg-white/[0.02] transition-colors group relative border-b border-border/30 md:border-b-0">
                <div className="absolute top-6 right-6 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(u)} className="h-8 w-8 hover:bg-primary/10 hover:text-primary">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => confirmDelete(u.id)} className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-foreground font-serif text-lg font-bold border border-border flex-shrink-0 uppercase shadow-inner shadow-black/20">
                    {u.name.substring(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-foreground font-semibold text-lg mb-0.5 pr-16 truncate">{u.name}</h3>
                    <div className="flex items-center text-muted-foreground text-sm mb-3">
                      <Mail className="w-3.5 h-3.5 mr-1.5" />
                      <span className="truncate">{u.email}</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <RoleBadge role={u.role} />
                      {u.barId && (
                        <div className="flex items-center text-xs text-muted-foreground font-mono bg-background px-2 py-1 rounded border border-border/50">
                          <Building className="w-3 h-3 mr-1.5" />
                          {u.barId}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <UserDialog open={dialogOpen} onOpenChange={setDialogOpen} userItem={selectedUser} />
      
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Remove Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this user from the firm directory? They will lose all access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-border hover:bg-white/5">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => userToDelete && deleteMutation.mutate({ id: userToDelete })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
            >
              {deleteMutation.isPending ? "Removing..." : "Remove User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
