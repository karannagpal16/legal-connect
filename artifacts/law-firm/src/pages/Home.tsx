import { Link } from "wouter";
import { ArrowRight, Scale, BookOpen, CalendarCheck } from "lucide-react";
import { motion } from "framer-motion";

export function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/30 selection:text-primary-foreground">
      {/* Navigation */}
      <nav className="fixed w-full z-50 top-0 border-b border-white/10 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scale className="w-8 h-8 text-primary" />
            <div className="flex flex-col">
              <span className="font-serif font-bold text-xl leading-tight text-white tracking-wide">Rishika Nagpal & Associates</span>
              <span className="text-[10px] uppercase tracking-widest text-primary font-semibold">Legal Connect App</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/book" className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors uppercase tracking-wider">Book Consultation</Link>
            <Link href="/dashboard" className="hidden md:inline-flex bg-secondary hover:bg-secondary/80 border border-border text-foreground px-6 py-2.5 rounded-full text-sm font-bold shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5">
              Staff Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 relative isolate overflow-hidden pt-20">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-tr from-background via-background/90 to-background/50 z-10" />
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-24 sm:py-32 lg:py-40 flex flex-col lg:flex-row items-center gap-16">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex-1 text-left"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-8 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-widest">Delhi High Court & Supreme Court Practice</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif font-bold tracking-tight text-white mb-8 leading-[1.1]">
              Integrity in <br/>
              <span className="text-primary">Legal Practice.</span>
            </h1>
            
            <p className="text-lg text-white/70 mb-10 leading-relaxed max-w-xl">
              A leading law firm in New Delhi. 
              Delivering strategic counsel, rigorous representation, and unwavering 
              commitment to our clients' success.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link href="/book" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-xl text-base font-bold shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:-translate-y-1">
                <CalendarCheck className="w-5 h-5" />
                Book a Consultation
              </Link>
              <Link href="/dashboard" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-8 py-4 rounded-xl text-base font-bold transition-all hover:-translate-y-1">
                Firm Dashboard
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="flex-1 w-full max-w-lg lg:max-w-none relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 to-transparent blur-2xl rounded-full" />
            <div className="relative bg-card/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
              <div className="aspect-square bg-gradient-to-b from-white/5 to-transparent rounded-2xl border border-white/5 flex items-center justify-center">
                <Scale className="w-48 h-48 text-primary/80 drop-shadow-2xl" strokeWidth={1} />
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
