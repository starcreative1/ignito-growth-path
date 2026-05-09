import { Wand2, MousePointerClick, Globe, ShoppingBag, Check } from "lucide-react";

const pillars = [
  {
    icon: Wand2,
    title: "AI-Designed Storefront",
    desc: "Your AI Twin reads your brand and generates a custom storefront with the right colors, layout, and tone. No templates. No coding. Update once — it syncs everywhere.",
  },
  {
    icon: MousePointerClick,
    title: "One-Tap Checkout",
    desc: "Highest-converting checkout in the creator economy. Pitch and purchase on one screen. Apple Pay, Google Pay, card, and international currencies — your audience checks out in seconds.",
  },
  {
    icon: Globe,
    title: "Sell Anything, Globally",
    desc: "Digital products, courses, coaching calls, memberships, communities, downloads, webinars — all from one link. AI auto-translates your storefront for global audiences.",
  },
];

const Storefront = () => {
  return (
    <section className="py-16 sm:py-24 bg-gradient-accent overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-primary mb-3 sm:mb-4">
            Your Storefront
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-4">
            One Link. <span className="gradient-text">Your Entire Business.</span>
          </h2>
          <p className="text-base sm:text-xl text-muted-foreground">
            Every G.Creators account gets a branded storefront at{" "}
            <span className="font-semibold text-foreground">gcreators.me/yourname</span> —
            designed by AI to match your brand in 60 seconds. Drop it in your Instagram, TikTok,
            LinkedIn, or YouTube bio and start selling instantly.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Pillars */}
          <div className="space-y-6">
            {pillars.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex gap-4 p-5 sm:p-6 rounded-2xl bg-card border border-border/60 shadow-sm hover:shadow-medium transition-shadow"
              >
                <div className="w-12 h-12 shrink-0 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <Icon className="text-white" size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-display font-bold mb-1.5">{title}</h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Phone mockup */}
          <div className="relative flex justify-center px-4">
            <div className="absolute -inset-8 bg-gradient-primary opacity-20 blur-3xl rounded-full" />
            <div className="relative w-[260px] sm:w-[320px] aspect-[9/19] bg-foreground rounded-[2.5rem] p-3 shadow-strong">
              <div className="w-full h-full bg-background rounded-[2rem] overflow-hidden flex flex-col">
                {/* Notch */}
                <div className="h-6 flex justify-center items-end pb-1">
                  <div className="w-20 h-4 bg-foreground rounded-b-2xl" />
                </div>

                {/* Storefront content */}
                <div className="flex-1 px-4 pt-2 pb-4 overflow-hidden">
                  {/* Profile */}
                  <div className="flex flex-col items-center text-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-primary mb-2 ring-2 ring-background shadow-medium" />
                    <p className="text-sm font-display font-bold">@sarah_k</p>
                    <p className="text-[10px] text-muted-foreground">gcreators.me/sarah_k</p>
                  </div>

                  {/* Product cards */}
                  <div className="space-y-2">
                    {[
                      { label: "Course · Build Your Brand", price: "$99" },
                      { label: "1:1 Coaching Call", price: "$149" },
                      { label: "Notion Templates", price: "$19" },
                      { label: "Inner Circle Community", price: "$9/mo" },
                    ].map((p) => (
                      <div
                        key={p.label}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-secondary border border-border/60"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-gradient-primary shrink-0 flex items-center justify-center">
                            <ShoppingBag className="text-white" size={12} />
                          </div>
                          <span className="text-[11px] font-medium truncate">{p.label}</span>
                        </div>
                        <span className="text-[11px] font-bold text-foreground shrink-0 ml-2">
                          {p.price}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="mt-3">
                    <div className="w-full py-2.5 rounded-xl bg-gradient-primary text-white text-center text-xs font-semibold shadow-glow">
                      Buy in 1 tap
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sale notification toast */}
            <div className="absolute top-6 right-0 sm:right-2 lg:-right-4 bg-card border border-border rounded-xl shadow-strong px-3 py-2 flex items-center gap-2 animate-fade-in-up max-w-[180px]">
              <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                <Check className="text-accent" size={14} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold leading-tight">💰 New sale</p>
                <p className="text-[10px] text-muted-foreground leading-tight truncate">
                  $49 from @sarah_k
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-base sm:text-lg text-muted-foreground italic max-w-2xl mx-auto mt-12 sm:mt-16">
          One OS for your entire creator business — storefront, content, community, analytics, and AI in one place.
        </p>
      </div>
    </section>
  );
};

export default Storefront;
