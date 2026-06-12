import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Scale, ArrowLeft, CheckCircle2, Loader2, Calendar as CalendarIcon, Clock, Phone, Mail, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCreateBooking } from "@workspace/api-client-react";

// Form Schema based on OpenAPI spec
const bookingSchema = z.object({
  clientName: z.string().min(2, "Full name is required"),
  clientEmail: z.string().email("Please enter a valid email address"),
  clientPhone: z.string().min(10, "Valid phone number is required"),
  legalIssueType: z.enum(["Criminal", "Civil", "Family", "Property", "Corporate", "Labour", "Other"], {
    errorMap: () => ({ message: "Please select a legal issue type" })
  }),
  preferredLawyer: z.string().optional(),
  preferredDate: z.string().min(1, "Please select a preferred date"),
  preferredTime: z.enum(["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"], {
    errorMap: () => ({ message: "Please select a preferred time" })
  }),
  briefDescription: z.string().max(500, "Description must be under 500 characters").optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

export function BookLawyer() {
  const [isSuccess, setIsSuccess] = useState(false);
  const [bookingRef, setBookingRef] = useState<string>("");

  const createBooking = useCreateBooking();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      preferredLawyer: "",
      briefDescription: "",
    }
  });

  const onSubmit = async (data: BookingFormData) => {
    try {
      const result = await createBooking.mutateAsync({
        data: {
          ...data,
          status: "Pending"
        }
      });
      setBookingRef(`LC-${new Date().getFullYear()}-${result.id.toString().padStart(4, '0')}`);
      setIsSuccess(true);
    } catch (error) {
      console.error("Booking failed:", error);
    }
  };

  // Get today's date formatted for the min attribute of date input
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans selection:bg-primary/30 selection:text-primary-foreground relative overflow-hidden">
      
      {/* Left Branding Panel */}
      <div className="hidden md:flex md:w-1/3 lg:w-[40%] relative flex-col justify-between p-10 lg:p-16 border-r border-[#1A2E2A]/10 isolate">
        <div className="absolute inset-0 -z-10">
          <img 
            src={`${import.meta.env.BASE_URL}images/law-library-bg.png`} 
            alt="Law Library Background" 
            className="w-full h-full object-cover opacity-30 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/95 to-background" />
        </div>

        <Link href="/" className="inline-flex items-center gap-3 group w-fit transition-transform hover:-translate-x-1">
          <ArrowLeft className="w-5 h-5 text-primary" />
          <span className="font-semibold text-[#1A2E2A]/80 group-hover:text-[#1A2E2A] transition-colors">Back to Home</span>
        </Link>

        <div className="my-auto">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 mb-8 shadow-xl shadow-primary/5">
            <Scale className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl lg:text-5xl font-serif font-bold text-[#1A2E2A] mb-6 leading-tight">
            Expert Legal <br />
            <span className="text-primary">Counsel</span> in New Delhi.
          </h1>
          <p className="text-lg text-[#1A2E2A]/70 max-w-md leading-relaxed">
            Schedule a free 30-minute consultation with our experienced advocates. 
            We provide strategic guidance and rigorous representation tailored to your needs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-semibold uppercase tracking-widest text-primary/80">Available for Consultation</span>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex flex-col relative overflow-y-auto">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-6 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <Link href="/" className="flex items-center gap-2">
            <ArrowLeft className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sm">Back</span>
          </Link>
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            <span className="font-serif font-bold text-base">Legal Connect</span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 md:p-12 lg:p-20">
          <AnimatePresence mode="wait">
            {!isSuccess ? (
              <motion.div 
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-2xl bg-card border border-border rounded-3xl p-8 sm:p-10 shadow-2xl"
              >
                <div className="mb-10">
                  <h2 className="text-3xl font-serif font-bold text-foreground mb-3">Book a Lawyer</h2>
                  <p className="text-muted-foreground text-sm">Fill out the form below and our team will get back to you within 24 hours to confirm your consultation.</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                  {/* Personal Info */}
                  <div className="space-y-5">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-primary border-b border-border pb-2">1. Your Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-sm font-medium text-foreground flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" /> Full Name <span className="text-destructive">*</span>
                        </label>
                        <input 
                          {...register("clientName")}
                          className="w-full px-4 py-3.5 bg-input border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground"
                          placeholder="John Doe"
                        />
                        {errors.clientName && <p className="text-destructive text-xs mt-1">{errors.clientName.message}</p>}
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" /> Email Address <span className="text-destructive">*</span>
                        </label>
                        <input 
                          type="email"
                          {...register("clientEmail")}
                          className="w-full px-4 py-3.5 bg-input border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground"
                          placeholder="john@example.com"
                        />
                        {errors.clientEmail && <p className="text-destructive text-xs mt-1">{errors.clientEmail.message}</p>}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" /> Phone Number <span className="text-destructive">*</span>
                        </label>
                        <input 
                          {...register("clientPhone")}
                          className="w-full px-4 py-3.5 bg-input border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground"
                          placeholder="+91 98765 43210"
                        />
                        {errors.clientPhone && <p className="text-destructive text-xs mt-1">{errors.clientPhone.message}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Case Details */}
                  <div className="space-y-5">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-primary border-b border-border pb-2">2. Case Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Legal Issue Type <span className="text-destructive">*</span></label>
                        <select 
                          {...register("legalIssueType")}
                          className="w-full px-4 py-3.5 bg-input border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground appearance-none"
                        >
                          <option value="">Select an issue type...</option>
                          <option value="Criminal">Criminal Law</option>
                          <option value="Civil">Civil Dispute</option>
                          <option value="Family">Family Law / Divorce</option>
                          <option value="Property">Property & Real Estate</option>
                          <option value="Corporate">Corporate / Commercial</option>
                          <option value="Labour">Labour & Employment</option>
                          <option value="Other">Other</option>
                        </select>
                        {errors.legalIssueType && <p className="text-destructive text-xs mt-1">{errors.legalIssueType.message}</p>}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Preferred Lawyer <span className="text-muted-foreground font-normal">(Optional)</span></label>
                        <input 
                          {...register("preferredLawyer")}
                          className="w-full px-4 py-3.5 bg-input border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground"
                          placeholder="Any available lawyer"
                        />
                      </div>

                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-sm font-medium text-foreground">Brief Description <span className="text-muted-foreground font-normal">(Optional)</span></label>
                        <textarea 
                          {...register("briefDescription")}
                          rows={3}
                          className="w-full px-4 py-3.5 bg-input border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground resize-none"
                          placeholder="Briefly describe what you need help with..."
                        />
                        {errors.briefDescription && <p className="text-destructive text-xs mt-1">{errors.briefDescription.message}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Scheduling */}
                  <div className="space-y-5">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-primary border-b border-border pb-2">3. Scheduling</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-muted-foreground" /> Preferred Date <span className="text-destructive">*</span>
                        </label>
                        <input 
                          type="date"
                          min={today}
                          {...register("preferredDate")}
                          className="w-full px-4 py-3.5 bg-input border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground"
                        />
                        {errors.preferredDate && <p className="text-destructive text-xs mt-1">{errors.preferredDate.message}</p>}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" /> Preferred Time <span className="text-destructive">*</span>
                        </label>
                        <select 
                          {...register("preferredTime")}
                          className="w-full px-4 py-3.5 bg-input border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground appearance-none"
                        >
                          <option value="">Select a time slot...</option>
                          <option value="9:00 AM">9:00 AM</option>
                          <option value="10:00 AM">10:00 AM</option>
                          <option value="11:00 AM">11:00 AM</option>
                          <option value="12:00 PM">12:00 PM</option>
                          <option value="2:00 PM">2:00 PM</option>
                          <option value="3:00 PM">3:00 PM</option>
                          <option value="4:00 PM">4:00 PM</option>
                          <option value="5:00 PM">5:00 PM</option>
                        </select>
                        {errors.preferredTime && <p className="text-destructive text-xs mt-1">{errors.preferredTime.message}</p>}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full min-h-[56px] bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-6 h-6 animate-spin" /> Submitting Request...</>
                    ) : (
                      "Request Consultation"
                    )}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-lg bg-card border border-border rounded-3xl p-10 text-center shadow-2xl"
              >
                <div className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-serif font-bold text-foreground mb-4">Request Received</h2>
                <p className="text-muted-foreground text-lg mb-8">
                  Thank you for reaching out. We have received your consultation request and will contact you within 24 hours to confirm the appointment.
                </p>
                
                <div className="bg-input/50 border border-border rounded-2xl p-6 mb-10">
                  <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold mb-1">Booking Reference</p>
                  <p className="text-2xl font-mono text-primary font-bold">{bookingRef}</p>
                </div>

                <Link 
                  href="/" 
                  className="w-full inline-flex min-h-[56px] bg-secondary hover:bg-secondary/80 border border-border text-foreground text-lg font-bold rounded-xl shadow-md transition-all items-center justify-center"
                >
                  Return to Home
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          <Link href="/dashboard" className="absolute bottom-6 right-6 text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            Staff Login
          </Link>
        </div>
      </div>
    </div>
  );
}
