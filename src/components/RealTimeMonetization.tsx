import { Bell, LineChart, Wallet, Brain, TrendingUp, DollarSign } from "lucide-react";

const points = [
  {
    icon: Bell,
    title: "Instant Sale Alerts",
    desc: "Push notifications on every purchase, signup, and milestone. Celebrate every win.",
  },
  {
    icon: LineChart,
    title: "Live Conversion Analytics",
    desc: "See clicks, views, revenue, and top traffic sources in real time. Double down on what works.",
  },
  {
    icon: Wallet,
    title: "Fast Global Payouts",
    desc: "Cash out earnings to your bank in one tap. No minimums. No waiting weeks.",
  },
  {
    icon: Brain,
    title: "AI Sales Coach",
    desc: "Your AI Twin spots conversion drop-offs and suggests fixes — pricing, copy, layout, offer order.",
  },
];

const sales = [
  { who: "@maya.codes", amount: "$99", item: "Pro Course" },
  { who: "@devontalks", amount: "$149", item: "1:1 Call" },
  { who: "@noahbuilds", amount: "$19", item: "Templates" },
];

const RealTimeMonetization = () => {
  return (
    <section className="py-16 sm:py-24 bg-background overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-primary mb-3 sm:mb-4">
            Real-Time Monetization
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-4">
            Feel Every Sale <span className="gradient-text">the Moment It Happens</span>
          </h2>
          <p className="text-base sm:text-xl text-muted-foreground">
            Push notifications on every transaction. Real-time analytics that show what's converting,
            who's buying, and where they came from. Fast payouts, no minimums.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Dashboard mockup */}
          <div className="relative order-2 lg:order-1">
            <div className="absolute -inset-8 bg-gradient-primary opacity-15 blur-3xl rounded-full" />
            <div className="relative bg-card rounded-2xl border border-border shadow-strong overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-secondary/50">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-destructive/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-accent/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-primary/30" />
                </div>
                <p className="text-[11px] font-mono text-muted-foreground">creator.dashboard</p>
                <div className="w-10" />
              </div>

              <div className="p-5 sm:p-6 grid grid-cols-5 gap-4">
                {/* Revenue counter */}
                <div className="col-span-3 space-y-4">
                  <div className="p-4 rounded-xl bg-gradient-primary text-white">
                    <p className="text-[11px] uppercase tracking-wider opacity-80 font-semibold">
                      Revenue today
                    </p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <DollarSign size={20} />
                      <span className="text-3xl sm:text-4xl font-display font-bold tabular-nums">
                        2,847
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-xs font-semibold opacity-90">
                        <TrendingUp size={12} /> +24%
                      </span>
                    </div>
                  </div>

                  {/* Mini chart */}
                  <div className="p-4 rounded-xl bg-secondary border border-border/60">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                      Conversions · Live
                    </p>
                    <div className="flex items-end gap-1.5 h-16">
                      {[35, 52, 41, 68, 58, 75, 62, 88, 72, 95].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t bg-gradient-primary"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* AI suggestion */}
                  <div className="p-3 rounded-xl border border-accent/30 bg-accent/5">
                    <p className="text-[11px] font-semibold text-accent mb-1">💡 AI Sales Coach</p>
                    <p className="text-xs text-foreground leading-relaxed">
                      Move your $99 course to position 1 — it converts{" "}
                      <span className="font-bold">3.2× better</span> than your free lead magnet.
                    </p>
                  </div>
                </div>

                {/* Live sale notifications */}
                <div className="col-span-2 space-y-2">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                    Live sales
                  </p>
                  {sales.map((s, i) => (
                    <div
                      key={s.who}
                      className="p-2.5 rounded-lg bg-card border border-border/60 shadow-sm animate-fade-in-up"
                      style={{ animationDelay: `${i * 150}ms` }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                          <p className="text-[10px] font-semibold truncate">{s.who}</p>
                        </div>
                        <p className="text-[10px] font-bold tabular-nums shrink-0">{s.amount}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{s.item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Feature points */}
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-5 order-1 lg:order-2">
            {points.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="p-5 rounded-2xl bg-card border border-border/60 hover:shadow-medium hover:-translate-y-0.5 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center mb-3">
                  <Icon className="text-white" size={18} />
                </div>
                <h3 className="text-base font-display font-bold mb-1.5">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-sm sm:text-base text-muted-foreground italic max-w-2xl mx-auto mt-12 sm:mt-16">
          Your AI Twin works while you sleep. Built by creators, for creators. Keep what you earn.
        </p>
      </div>
    </section>
  );
};

export default RealTimeMonetization;
