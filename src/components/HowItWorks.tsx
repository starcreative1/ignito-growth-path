import { Brain, Sparkles, Layers, TrendingUp, ChevronRight, type LucideIcon } from "lucide-react";
import { useRef, useState, useEffect } from "react";

type Step = {
  number: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const steps: Step[] = [
  {
    number: "01",
    title: "Connect Your Knowledge",
    description:
      "Upload your existing content, courses, videos, or expertise. G.Creators OS ingests everything and builds your unified creator workspace in minutes.",
    icon: Brain,
  },
  {
    number: "02",
    title: "Train Your AI Twin",
    description:
      "Your personalized AI avatar learns your voice, style, and expertise. It engages your audience 24/7, answers questions, and creates content in your unique tone — across time zones and languages.",
    icon: Sparkles,
  },
  {
    number: "03",
    title: "Scale Across Formats & Markets",
    description:
      "One-click AI generation turns one piece of content into many: video → text → presentation → course → social posts. Translate and localize to any language instantly.",
    icon: Layers,
  },
  {
    number: "04",
    title: "Monetize & Grow",
    description:
      "Sell through the AI-powered Marketplace that matches you with your ideal audience. Run memberships, communities, and mentorship programs. Track everything in unified analytics.",
    icon: TrendingUp,
  },
];

const HowItWorks = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const scrollLeft = el.scrollLeft;
      const cardWidth = el.firstElementChild?.clientWidth || 1;
      const gap = 24;
      const idx = Math.round(scrollLeft / (cardWidth + gap));
      setActiveIndex(Math.min(idx, steps.length - 1));
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.children[index] as HTMLElement;
    if (!card) return;
    el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: "smooth" });
  };

  return (
    <section id="how-it-works" className="py-16 sm:py-24 bg-background overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-primary mb-3 sm:mb-4">
            How It Works
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-3 sm:mb-4">
            From Expertise to Scaled Business —{" "}
            <span className="gradient-text">in One OS</span>
          </h2>
          <p className="text-base sm:text-xl text-muted-foreground">
            G.Creators automates the work that usually takes a team. You bring the knowledge — the OS handles the infrastructure, content scaling, and audience growth.
          </p>
        </div>

        {/* Mobile: horizontal snap scroll */}
        <div
          ref={scrollRef}
          className="flex md:hidden gap-6 overflow-x-auto snap-x snap-mandatory pb-6 -mx-4 px-4 scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="snap-center shrink-0 w-[85vw] max-w-[340px] bg-card rounded-2xl p-6 border border-border shadow-sm"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="inline-flex w-14 h-14 rounded-full bg-gradient-primary items-center justify-center shrink-0">
                    <Icon className="text-white" size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-mono font-semibold text-primary">
                      {step.number}
                    </p>
                    <h3 className="text-base font-display font-bold leading-tight">
                      {step.title}
                    </h3>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
                {i < steps.length - 1 && (
                  <div className="flex items-center gap-1 mt-4 text-primary text-xs font-medium">
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile scroll indicators */}
        <div className="flex md:hidden justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === activeIndex ? "bg-primary w-6" : "bg-primary/30"
              }`}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        {/* Tablet+: grid layout */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Horizontal connecting line spanning all steps (desktop) */}
          <div className="hidden lg:block absolute top-16 left-0 right-0 h-0.5 bg-gradient-primary opacity-20 pointer-events-none" />

          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="relative group">
                <div className="relative z-10 text-center space-y-4">
                  <div className="inline-flex w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-gradient-primary items-center justify-center group-hover:shadow-glow transition-all duration-300 group-hover:scale-110 ring-8 ring-background">
                    <Icon className="text-white" size={32} />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-mono font-semibold text-primary">
                      {step.number}
                    </p>
                    <h3 className="text-lg lg:text-xl font-display font-bold">
                      {step.title}
                    </h3>
                    <p className="text-sm lg:text-base text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-base sm:text-lg text-muted-foreground italic max-w-2xl mx-auto mt-10 sm:mt-16">
          G.Creators handles the infrastructure so you can focus on what only you can do — create.
        </p>
      </div>
    </section>
  );
};

export default HowItWorks;