import { useState } from "react";
import { format } from "date-fns";
import { Calendar, Clock, Phone, Mail, User, Briefcase, CheckCircle2, XCircle, Trash2, ShieldQuestion } from "lucide-react";
import { useListBookings, useUpdateBooking, useDeleteBooking } from "@workspace/api-client-react";
import type { Booking } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type FilterStatus = "All" | "Pending" | "Confirmed" | "Completed" | "Cancelled";

export function Bookings() {
  const [filter, setFilter] = useState<FilterStatus>("All");
  const { toast } = useToast();

  const { data: bookings = [], isLoading, refetch } = useListBookings();
  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();

  const filteredBookings = bookings.filter((b) => filter === "All" || b.status === filter);
  const pendingCount = bookings.filter((b) => b.status === "Pending").length;

  const handleUpdateStatus = async (id: number, status: Booking["status"]) => {
    try {
      await updateBooking.mutateAsync({
        id,
        data: { status } as any // sending partial payload
      });
      toast({
        title: "Status Updated",
        description: `Booking is now ${status}.`,
      });
      refetch();
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Could not update the booking status.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this booking?")) return;
    try {
      await deleteBooking.mutateAsync({ id });
      toast({
        title: "Booking Deleted",
        description: "The booking has been removed from the system.",
      });
      refetch();
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Could not delete the booking.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending": return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
      case "Confirmed": return "text-primary bg-primary/10 border-primary/20";
      case "Completed": return "text-green-500 bg-green-500/10 border-green-500/20";
      case "Cancelled": return "text-destructive bg-destructive/10 border-destructive/20";
      default: return "text-muted-foreground bg-muted border-border";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-serif font-bold text-foreground">Client Bookings</h1>
            {pendingCount > 0 && (
              <span className="bg-primary text-primary-foreground text-sm font-bold px-3 py-1 rounded-full shadow-md shadow-primary/20">
                {pendingCount} Pending
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-lg">Manage incoming consultation requests from the public portal.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-2 bg-card border border-border rounded-2xl w-fit shadow-sm">
        {(["All", "Pending", "Confirmed", "Completed", "Cancelled"] as FilterStatus[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
              filter === f 
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Bookings Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-3xl p-6 border border-border h-80 animate-pulse flex flex-col">
              <div className="w-1/3 h-6 bg-muted rounded-full mb-4" />
              <div className="w-2/3 h-8 bg-muted rounded-lg mb-6" />
              <div className="space-y-3 flex-1">
                <div className="w-full h-4 bg-muted rounded" />
                <div className="w-5/6 h-4 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-card border border-border border-dashed rounded-3xl p-16 text-center shadow-sm">
          <Calendar className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-serif font-bold text-foreground mb-2">No Bookings Found</h3>
          <p className="text-muted-foreground">There are no {filter !== "All" ? filter.toLowerCase() : ""} client bookings currently.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredBookings.map((booking) => (
            <div 
              key={booking.id} 
              className="bg-card border border-border hover:border-primary/50 rounded-3xl p-6 shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={cn("px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider", getStatusColor(booking.status))}>
                  {booking.status}
                </div>
                <div className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                  ID: #{booking.id}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-2xl font-serif font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{booking.clientName}</h3>
                <div className="flex items-center gap-2 text-sm text-primary/80 font-medium">
                  <Briefcase className="w-4 h-4" /> {booking.legalIssueType}
                </div>
              </div>

              <div className="space-y-3 mb-6 flex-1 bg-secondary/30 rounded-2xl p-4 border border-border/50">
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a href={`mailto:${booking.clientEmail}`} className="hover:text-primary transition-colors truncate">{booking.clientEmail}</a>
                </div>
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a href={`tel:${booking.clientPhone}`} className="hover:text-primary transition-colors">{booking.clientPhone}</a>
                </div>
                <div className="flex items-center gap-3 text-sm text-foreground mt-4 pt-3 border-t border-border/50">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="font-semibold">{format(new Date(booking.preferredDate), "MMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="font-semibold">{booking.preferredTime}</span>
                </div>
              </div>

              {booking.briefDescription && (
                <div className="mb-6 text-sm text-muted-foreground line-clamp-3 italic border-l-2 border-primary/30 pl-3">
                  "{booking.briefDescription}"
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-auto grid grid-cols-2 gap-3">
                {booking.status === "Pending" && (
                  <>
                    <button 
                      onClick={() => handleUpdateStatus(booking.id, "Confirmed")}
                      className="col-span-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Confirm Booking
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus(booking.id, "Cancelled")}
                      className="py-2.5 rounded-xl bg-secondary text-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:bg-muted transition-colors border border-border"
                    >
                      <XCircle className="w-4 h-4" /> Cancel
                    </button>
                    <button 
                      onClick={() => handleDelete(booking.id)}
                      className="py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold flex items-center justify-center gap-2 hover:bg-destructive hover:text-destructive-foreground transition-colors border border-destructive/20"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </>
                )}
                
                {booking.status === "Confirmed" && (
                  <>
                    <button 
                      onClick={() => handleUpdateStatus(booking.id, "Completed")}
                      className="col-span-2 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-[#1A2332] text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-md shadow-green-900/20"
                    >
                      <ShieldQuestion className="w-4 h-4" /> Mark Completed
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus(booking.id, "Cancelled")}
                      className="py-2.5 rounded-xl bg-secondary text-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:bg-muted transition-colors border border-border"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => handleDelete(booking.id)}
                      className="py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold flex items-center justify-center gap-2 hover:bg-destructive hover:text-destructive-foreground transition-colors border border-destructive/20"
                    >
                      Delete
                    </button>
                  </>
                )}

                {(booking.status === "Completed" || booking.status === "Cancelled") && (
                  <button 
                    onClick={() => handleDelete(booking.id)}
                    className="col-span-2 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold flex items-center justify-center gap-2 hover:bg-destructive hover:text-destructive-foreground transition-colors border border-destructive/20 mt-2"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Record
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
