import { useState } from "react";
import { useListCases, useDeleteCase, getListCasesQueryKey, type Case } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit2, Trash2, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CaseDialog } from "@/components/forms/CaseDialog";
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

export function MyDiary() {
  const { data: cases, isLoading } = useListCases();
  const [search, setSearch] = useState("");
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteMutation = useDeleteCase({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCasesQueryKey() });
        toast({ title: "Case deleted successfully" });
        setDeleteOpen(false);
      },
      onError: (err: any) => {
        toast({ title: "Failed to delete case", description: err.message, variant: "destructive" });
      }
    }
  });

  const filteredCases = cases?.filter(c => 
    c.caseTitle.toLowerCase().includes(search.toLowerCase()) || 
    c.caseNumber.toLowerCase().includes(search.toLowerCase()) ||
    c.courtName.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (c: Case) => {
    setSelectedCase(c);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedCase(null);
    setDialogOpen(true);
  };

  const confirmDelete = (id: number) => {
    setCaseToDelete(id);
    setDeleteOpen(true);
  };

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">My Diary</h1>
          <p className="text-muted-foreground mt-1">Manage and track all ongoing and past matters.</p>
        </div>
        <Button 
          onClick={handleAdd}
          className="bg-primary hover:bg-primary/90 text-primary-foreground h-11 px-6 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add New Case
        </Button>
      </header>

      <div className="bg-card rounded-2xl border border-border/60 shadow-xl shadow-black/10 overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-background/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by title, case number, or court..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-background border-border/50 focus-visible:ring-primary/30 h-10 rounded-xl"
            />
          </div>
          <div className="text-sm text-muted-foreground font-medium">
            {filteredCases?.length || 0} Case(s)
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground bg-background/30">
                <th className="px-6 py-4 font-medium">Case Info</th>
                <th className="px-6 py-4 font-medium">Court Details</th>
                <th className="px-6 py-4 font-medium">Next Hearing</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-10 w-48 bg-muted/50" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-32 bg-muted/50" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-24 bg-muted/50" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full bg-muted/50" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-8 w-16 ml-auto bg-muted/50" /></td>
                  </tr>
                ))
              ) : filteredCases?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-16 h-16 rounded-full bg-background border border-border/50 flex items-center justify-center mb-4">
                        <FileText className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium text-foreground mb-1">No cases found</h3>
                      <p className="text-sm">We couldn't find any cases matching your current search or there are no cases in the diary.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCases?.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-serif font-semibold text-foreground text-base mb-1">{c.caseTitle}</div>
                      <div className="text-xs text-muted-foreground font-mono bg-background inline-block px-2 py-0.5 rounded border border-border/50">{c.caseNumber}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-foreground/90 font-medium">{c.courtName}</div>
                    </td>
                    <td className="px-6 py-4">
                      {c.nextDate ? (
                        <div className="flex items-center text-sm font-medium text-primary">
                          <Calendar className="w-4 h-4 mr-2" />
                          {format(new Date(c.nextDate), "MMMM dd, yyyy")}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">TBD</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(c)} className="h-8 w-8 hover:bg-primary/10 hover:text-primary">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => confirmDelete(c.id)} className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CaseDialog open={dialogOpen} onOpenChange={setDialogOpen} caseItem={selectedCase} />
      
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the case
              and remove its data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-border hover:bg-white/5">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => caseToDelete && deleteMutation.mutate({ id: caseToDelete })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Case"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
