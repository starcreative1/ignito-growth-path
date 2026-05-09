import { Brain, Sparkles, Layers, TrendingUp, type LucideIcon } from "lucide-react";

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
  return (
    <section id="how-it-works" className="py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-4">
            How It Works
          </p>
          <h2 className="text-4xl sm:text-5xl font-display font-bold mb-4">
            From Expertise to Scaled Business —{" "}
            <span className="gradient-text">in One OS</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            G.Creators automates the work that usually takes a team. You bring the knowledge — the OS handles the infrastructure, content scaling, and audience growth.
          </p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Horizontal connecting line spanning all steps (desktop) */}
          <div className="hidden lg:block absolute top-16 left-0 right-0 h-0.5 bg-gradient-primary opacity-20 pointer-events-none" />

          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="relative group">
                <div className="relative z-10 text-center space-y-4">
                  <div className="inline-flex w-32 h-32 rounded-full bg-gradient-primary items-center justify-center group-hover:shadow-glow transition-all duration-300 group-hover:scale-110 ring-8 ring-background">
                    <Icon className="text-white" size={40} />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-mono font-semibold text-primary">
                      {step.number}
                    </p>
                    <h3 className="text-xl font-display font-bold">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-lg text-muted-foreground italic max-w-2xl mx-auto mt-16">
          G.Creators handles the infrastructure so you can focus on what only you can do — create.
        </p>
      </div>
    </section>
  );
};

export default HowItWorks;