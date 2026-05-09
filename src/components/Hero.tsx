import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-bg.jpg";

const creatorTypes = [
  "Course Creators",
  "Coaches",
  "Educators",
  "Content Creators",
  "Industry Experts",
  "Knowledge Entrepreneurs",
];

const Hero = () => {
  const navigate = useNavigate();
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${heroImage})`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/80 to-background" />
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-accent/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-primary opacity-20 rounded-full blur-3xl animate-pulse delay-1000" />

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium animate-fade-in">
            <Sparkles size={16} />
            G.Creators
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold leading-tight animate-fade-in-up">
            The AI Operating System for{" "}
            <span className="gradient-text">Creators</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto animate-fade-in-up animation-delay-200">
            Build, scale, and monetize your creator business with one AI-powered platform. Replace your fragmented stack of tools with the OS built for creators, experts, and educators.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animation-delay-400">
            <Button
              variant="hero"
              size="lg"
              className="text-lg px-8 py-6"
              onClick={() => navigate('/auth')}
            >
              Start Building Free
              <ArrowRight className="ml-2" size={20} />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-lg px-8 py-6"
              onClick={() => {
                document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              See How It Works
            </Button>
          </div>

          {/* Built for strip */}
          <div className="pt-8 animate-fade-in-up animation-delay-600 space-y-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              Built for
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {creatorTypes.map((t) => (
                <span
                  key={t}
                  className="px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Positioning line */}
          <p className="text-sm text-muted-foreground animate-fade-in-up animation-delay-800 italic">
            The OS creators run their business on.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Hero;