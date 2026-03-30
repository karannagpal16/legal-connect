import { Link } from "wouter";
import { ArrowRight, Scale, ShieldCheck, Clock, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

export function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/30 selection:text-primary-foreground">
      {/* Navigation */}
      <nav className="fixed w-full z-50 top-0 border-b border-white/10 bg-background/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scale className="w-8 h-8 text-primary" />
            <div className="flex flex-col">
              <span className="font-serif font-bold text-xl leading-tight text-white tracking-wide">Rishika Nagpal & Associates</span>
              <span className="text-[10px] uppercase tracking-widest text-primary font-semibold">Legal Connect App</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm font-medium text-white/80 hover:text-white transition-colors">Client Portal</Link>
            <Link href="/dashboard" className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:-translate-y-0.5">
              Admin Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 relative isolate overflow-hidden pt-20">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 -z-10">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
            alt="Law firm background" 
            className="w-full h-full object-cover opacity-40 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-6 py-24 sm:py-32 lg:py-40">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="max-w-2xl"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-8">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Delhi High Court & Supreme Court Practice
              </div>
              
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif font-bold text-white leading-[1.1] mb-6 tracking-tight">
                Integrity in <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-200">Legal Practice.</span>
              </h1>
              
              <p className="text-lg text-white/70 mb-10 leading-relaxed max-w-xl">
                A premier boutique law firm based in Subhash Nagar, New Delhi. 
                Delivering strategic counsel, rigorous representation, and unwavering 
                commitment to our clients' success.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/diary" 
                  className="inline-flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground h-14 px-8 rounded-xl font-bold text-lg shadow-[0_0_40px_-10px_rgba(218,165,32,0.5)] transition-all hover:scale-105"
                >
                  <BookOpen className="w-5 h-5 mr-2" />
                  Add New Case
                </Link>
                <Link 
                  href="/dashboard" 
                  className="inline-flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 text-white h-14 px-8 rounded-xl font-bold text-lg backdrop-blur-md transition-all"
                >
                  Firm Dashboard <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-full blur-3xl opacity-50" />
              <img 
                src={`${import.meta.env.BASE_URL}images/logo-mark.png`} 
                alt="Rishika Nagpal Logo Mark" 
                className="w-full max-w-md mx-auto drop-shadow-[0_0_60px_rgba(218,165,32,0.15)] relative z-10"
              />
            </motion.div>

          </div>
        </div>

        {/* Value Props */}
        <div className="border-t border-white/10 bg-black/20 backdrop-blur-md relative z-10">
          <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-white">Trusted Counsel</h4>
                <p className="text-sm text-white/60">Years of proven litigation success</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-white">Responsive Strategy</h4>
                <p className="text-sm text-white/60">Agile execution in critical matters</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Scale className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-white">Complete Management</h4>
                <p className="text-sm text-white/60">End-to-end proxy and diary tracking</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
