import { useState } from "react";
import { useListCases, useDeleteCase } from "@workspace/api-client-react";
import type { Case } from "@workspace/api-client-react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Calendar,
  MapPin,
  Scale,
  User as UserIcon,
  BookOpen,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CaseDialog } from "@/components/forms/CaseDialog";

export function MyDiary() {
  const { data: cases, isLoading } = useListCases();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { mutate: deleteCase, isPending: isDeleting } = useDeleteCase({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
        toast({ title: "Case deleted successfully" });
      },
    },
  });

  const filteredCases = cases?.filter(
    (c) =>
      c.caseTitle.toLowerCase().includes(search.toLowerCase()) ||
      c.caseNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.courtName.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this case?")) {
      deleteCase({ id });
    }
  };

  const openEdit = (c: Case) => {
    setEditingCase(c);
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingCase(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">My Diary</h1>
          <p className="mt-1 text-muted-foreground">
            Manage all your ongoing and pending matters.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-4 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all hover:-translate-y-1 hover:shadow-xl w-full sm:w-auto min-h-[48px]"
        >
          <Plus className="w-5 h-5" />
          Add New Case
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by case title, number, or court..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-card border-2 border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-base"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-card rounded-2xl animate-pulse border border-border" />
          ))}
        </div>
      ) : filteredCases?.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground">No cases found</h3>
          <p className="text-muted-foreground mt-2">
            Try adjusting your search or add a new case.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredCases?.map((c) => (
            <div
              key={c.id}
              className="bg-card border border-border rounded-2xl p-5 hover:border-primary/50 transition-colors shadow-sm flex flex-col"
            >
              <div className="flex justify-between items-start mb-3 gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground leading-tight">
                    {c.caseTitle}
                  </h3>
                  <span className="text-sm font-mono text-muted-foreground mt-1 inline-block bg-background px-2 py-0.5 rounded border border-border">
                    {c.caseNumber}
                  </span>
                </div>

                <StatusBadge status={c.status} />
              </div>

              <div className="grid grid-cols-2 gap-y-3 gap-x-4 mt-2 mb-4 flex-1">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Scale className="w-4 h-4 text-primary" />
                  <span className="truncate" title={c.courtName}>
                    {c.courtName}
                  </span>
                </div>

                {c.courtRoomNo && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span>Room: {c.courtRoomNo}</span>
                  </div>
                )}

                {c.judgeName && (
                  <div className="flex items-center gap-2 text-sm text-foreground col-span-2">
                    <UserIcon className="w-4 h-4 text-primary" />
                    <span>Hon&apos;ble {c.judgeName}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-foreground col-span-2 font-medium">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className={c.nextDate === format(new Date(), "yyyy-MM-dd") ? "text-primary" : ""}>
                    Next Date: {c.nextDate ? format(new Date(c.nextDate), "dd MMM yyyy") : "TBD"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border mt-auto">
                <button
                  onClick={() => openEdit(c)}
                  className="p-2.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  title="Edit Case"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDelete(c.id)}
                  disabled={isDeleting}
                  className="p-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  title="Delete Case"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CaseDialog open={dialogOpen} onOpenChange={setDialogOpen} editingCase={editingCase} />
    </div>
  );
}