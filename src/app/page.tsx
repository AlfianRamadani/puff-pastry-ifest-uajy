import Link from "next/link";
import { Zap, BookOpen, Users, BarChart3, CheckCircle, ArrowRight, Flame } from "lucide-react";
import ScrollReveal from "@/app/components/landing/ScrollReveal";

const FEATURES = [
  {
    icon: BookOpen,
    title: "Smart Study Tracking",
    desc: "Track study hours, courses, and GPA in one place. See your progress at a glance.",
    color: "bg-[#B3D4FF]",
  },
  {
    icon: Users,
    title: "Study With Friends",
    desc: "Start live study sessions with friends. Stay accountable and motivated together.",
    color: "bg-[#FFB3C1]",
  },
  {
    icon: BarChart3,
    title: "Burnout Prevention",
    desc: "AI-powered workload analysis catches burnout before it hits. Study smarter, not harder.",
    color: "bg-[#B3FFB3]",
  },
];

const STATS = [
  { value: "2,400+", label: "Study Hours Logged", color: "bg-[#FFC107]" },
  { value: "150+", label: "Active Students", color: "bg-[#B3D4FF]" },
  { value: "98%", label: "Say They Study More", color: "bg-[#FFB3C1]" },
];

const STEPS = [
  { num: "01", title: "Open the App", desc: "No sign-up needed, just jump in", color: "bg-[#FFC107]" },
  { num: "02", title: "Add Courses", desc: "Set up your class schedule", color: "bg-[#B3D4FF]" },
  { num: "03", title: "Start Studying", desc: "Track, collaborate, and grow", color: "bg-[#B3FFB3]" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FFF9F0] scroll-smooth">
      {/* Nav */}
      <nav className="w-full border-b-[3px] border-black bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#FFC107] border-[3px] border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <Zap className="w-5 h-5 text-black" strokeWidth={3} />
            </div>
            <span className="font-black text-sm text-black tracking-wide uppercase">Puff Pastry</span>
          </div>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 bg-[#FFC107] border-[3px] border-black font-black text-xs text-black uppercase tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
          >
            Open App
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="w-full bg-[#FFF9F0] border-b-[3px] border-black">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <div className="inline-block bg-[#B3FFB3] border-[3px] border-black px-4 py-1.5 mb-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hero-badge">
                <span className="font-black text-xs text-black uppercase tracking-widest">
                  🎓 Built for Students
                </span>
              </div>
              <h1 className="font-black text-4xl sm:text-5xl lg:text-6xl text-black uppercase leading-[0.95] tracking-tight hero-headline">
                Study Hard,<br />
                <span className="text-[#7C5CFC]">Burn Out</span><br />
                Never.
              </h1>
              <p className="font-bold text-base sm:text-lg text-black/70 mt-6 max-w-lg leading-relaxed hero-desc">
                The study hub that tracks your progress, keeps you accountable with friends, and makes sure you don&apos;t crash before finals.
              </p>
              <div className="flex flex-wrap gap-3 mt-8 hero-cta">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-7 py-4 bg-[#FFC107] border-[3px] border-black font-black text-sm text-black uppercase tracking-wide shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
                >
                  Start Studying
                  <ArrowRight className="w-4 h-4" strokeWidth={3} />
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center gap-2 px-7 py-4 bg-white border-[3px] border-black font-black text-sm text-black uppercase tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all outline-none focus-visible:ring-2 focus-visible:ring-black"
                >
                  Learn More
                </a>
              </div>
            </div>

            {/* Visual — stacked blocks representing the app */}
            <div className="hidden lg:block relative hero-visual">
              <div className="relative w-full aspect-square max-w-md ml-auto">
                {/* Background decorative block */}
                <div className="absolute top-4 left-4 right-0 bottom-0 bg-[#FFC107] border-[3px] border-black" />
                {/* Main card */}
                <div className="relative bg-white border-[3px] border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                  {/* Mini dashboard preview */}
                  <div className="bg-[#FFC107] border-[3px] border-black p-4 mb-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <p className="font-black text-xs text-black uppercase tracking-widest mb-1">Good Morning</p>
                    <p className="font-black text-lg text-black uppercase">Welcome Back! 👋</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-[#B3FFB3] border-2 border-black p-3">
                      <p className="font-black text-2xl text-black">12</p>
                      <p className="font-black text-[10px] text-black/60 uppercase">Tasks Done</p>
                    </div>
                    <div className="bg-[#B3D4FF] border-2 border-black p-3">
                      <p className="font-black text-2xl text-black">24h</p>
                      <p className="font-black text-[10px] text-black/60 uppercase">Studied</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 h-3 bg-[#B3FFB3] border-2 border-black" />
                    <div className="w-1/3 h-3 bg-[#FFB3C1] border-2 border-black" />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <div className="w-2/5 h-3 bg-[#FFC107] border-2 border-black" />
                    <div className="flex-1 h-3 bg-[#B3D4FF] border-2 border-black" />
                  </div>
                </div>
                {/* Floating elements */}
                <div className="absolute -top-4 -right-4 w-14 h-14 bg-[#FFB3C1] border-[3px] border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rotate-6 animate-float" style={{ "--float-rotate": "6deg" } as React.CSSProperties}>
                  <Flame className="w-7 h-7 text-black" strokeWidth={2.5} />
                </div>
                <div className="absolute -bottom-3 -left-3 w-12 h-12 bg-[#B3FFB3] border-[3px] border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] -rotate-6 animate-float-delayed" style={{ "--float-rotate": "-6deg" } as React.CSSProperties}>
                  <CheckCircle className="w-6 h-6 text-black" strokeWidth={2.5} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Band */}
      <section className="w-full bg-black border-b-[3px] border-black">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3">
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className={`${stat.color} px-6 py-6 sm:py-8 ${i < STATS.length - 1 ? "border-b-[3px] sm:border-b-0 sm:border-r-[3px]" : ""} border-black flex items-center gap-4`}
            >
              <span className="font-black text-3xl sm:text-4xl text-black leading-none">{stat.value}</span>
              <span className="font-black text-xs text-black/70 uppercase tracking-wider leading-tight">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="w-full bg-[#FFF9F0] border-b-[3px] border-black">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <ScrollReveal>
            <div className="mb-12">
              <div className="inline-block bg-[#FFC107] border-[3px] border-black px-4 py-1.5 mb-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <span className="font-black text-xs text-black uppercase tracking-widest">Features</span>
              </div>
              <h2 className="font-black text-3xl sm:text-4xl text-black uppercase tracking-tight">
                Everything You Need<br />to Ace Your Semester
              </h2>
            </div>
          </ScrollReveal>

          <ScrollReveal stagger className="space-y-6">
              {FEATURES.map((feature, i) => (
              <div
                key={feature.title}
                className={`${feature.color} border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 sm:p-8 flex flex-col sm:flex-row items-start gap-5 hover:-translate-y-1 hover:shadow-[6px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 ${i % 2 === 1 ? "sm:flex-row-reverse sm:text-right" : ""}`}
              >
                <div className="w-14 h-14 bg-white border-[3px] border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] shrink-0">
                  <feature.icon className="w-7 h-7 text-black" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="font-black text-xl text-black uppercase tracking-wide">{feature.title}</h3>
                  <p className="font-bold text-sm text-black/70 mt-2 max-w-md leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </ScrollReveal>
        </div>
      </section>

      {/* How It Works */}
      <section className="w-full bg-white border-b-[3px] border-black">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <ScrollReveal>
            <div className="mb-12">
              <div className="inline-block bg-[#B3D4FF] border-[3px] border-black px-4 py-1.5 mb-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <span className="font-black text-xs text-black uppercase tracking-widest">How It Works</span>
              </div>
              <h2 className="font-black text-3xl sm:text-4xl text-black uppercase tracking-tight">
                Three Steps to<br />Better Grades
            </h2>
          </div>
          </ScrollReveal>

          <ScrollReveal stagger className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              {STEPS.map((step) => (
                <div key={step.num}>
                  <div className={`${step.color} border-[3px] border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-200`}>
                    <span className="font-black text-5xl text-black/15 leading-none">{step.num}</span>
                    <h3 className="font-black text-lg text-black uppercase tracking-wide mt-2">{step.title}</h3>
                    <p className="font-bold text-sm text-black/70 mt-1">{step.desc}</p>
                  </div>
                </div>
              ))}
          </ScrollReveal>
        </div>
      </section>

      {/* Testimonial */}
      <section className="w-full bg-[#7C5CFC] border-b-[3px] border-black">
        <ScrollReveal>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
          <div className="w-14 h-14 bg-[#FFC107] border-[3px] border-black mb-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center mx-auto">
            <span className="font-black text-2xl text-black">&ldquo;</span>
          </div>
          <p className="font-bold text-xl sm:text-2xl text-white leading-relaxed max-w-2xl mx-auto">
            Puff Pastry helped me go from cramming the night before to actually enjoying my study sessions. My GPA went up a full point.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="w-10 h-10 bg-[#FFC107] border-[3px] border-black flex items-center justify-center">
              <span className="font-black text-sm text-black">R</span>
            </div>
            <div className="text-left">
              <p className="font-black text-sm text-white uppercase tracking-wide">Rina Sari</p>
              <p className="font-bold text-xs text-white/70 uppercase">Computer Science, UAJY</p>
            </div>
          </div>
        </div>
        </ScrollReveal>
      </section>

      {/* Final CTA */}
      <section className="w-full bg-[#FFC107] border-b-[3px] border-black">
        <ScrollReveal>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <h2 className="font-black text-3xl sm:text-4xl lg:text-5xl text-black uppercase tracking-tight">
            Ready to Study<br />Smarter?
          </h2>
          <p className="font-bold text-base text-black/70 mt-4 max-w-md mx-auto">
            No sign-up required. Just open and start studying smarter.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 mt-8 px-8 py-5 bg-black border-[3px] border-black font-black text-sm text-white uppercase tracking-wide shadow-[6px_6px_0px_0px_rgba(124,92,252,1)] hover:shadow-[3px_3px_0px_0px_rgba(124,92,252,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
          >
            Open Dashboard
            <ArrowRight className="w-4 h-4" strokeWidth={3} />
          </Link>
        </div>
        </ScrollReveal>
      </section>

      {/* Footer */}
      <footer className="w-full bg-white border-t-[3px] border-black">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#FFC107] border-2 border-black flex items-center justify-center">
              <Zap className="w-4 h-4 text-black" strokeWidth={3} />
            </div>
            <span className="font-black text-xs text-black tracking-wide uppercase">Puff Pastry Study Hub</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-bold text-xs text-black/60 uppercase tracking-wide">
              Built with ❤️ for iFest UAJY
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
