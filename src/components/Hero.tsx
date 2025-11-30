import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, Bot, Calendar, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-bg.jpg";

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
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium animate-fade-in">
            <Sparkles size={16} />
            AI-Powered Mentor Matching
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold leading-tight animate-fade-in-up">
            Unlock Your Full Potential with{" "}
            <span className="gradient-text">AI-Powered Mentors</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto animate-fade-in-up animation-delay-200">
            Connect with industry leaders 24/7 through AI avatars. Get instant answers, 
            personalized guidance, and book live sessions when you need them.
          </p>

          {/* AI Avatar Feature Highlight */}
          <div className="max-w-3xl mx-auto p-6 bg-gradient-to-r from-accent/10 to-primary/10 rounded-2xl border border-accent/20 animate-fade-in-up animation-delay-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                <Bot className="text-accent-foreground" size={20} />
              </div>
              <h3 className="text-xl font-semibold">NEW: AI Mentor Avatars</h3>
            </div>
            <p className="text-muted-foreground mb-4">
              Chat with AI-powered versions of your favorite mentors. Get instant answers, 
              recommendations, and seamless booking — available 24/7.
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Sparkles size={14} />
                Instant Responses
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Calendar size={14} />
                Book Live Sessions
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Video size={14} />
                Access Video Content
              </Badge>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto py-8 animate-fade-in-up animation-delay-400">
            <div>
              <div className="text-4xl font-display font-bold gradient-text">$500B+</div>
              <div className="text-sm text-muted-foreground mt-1">Market Size</div>
            </div>
            <div>
              <div className="text-4xl font-display font-bold gradient-text">86%</div>
              <div className="text-sm text-muted-foreground mt-1">Seek Coaching</div>
            </div>
            <div>
              <div className="text-4xl font-display font-bold gradient-text">73%</div>
              <div className="text-sm text-muted-foreground mt-1">Would Invest</div>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animation-delay-600">
            <Button 
              variant="hero" 
              size="lg" 
              className="text-lg px-8 py-6"
              onClick={() => navigate('/mentors')}
            >
              Join as Learner
              <ArrowRight className="ml-2" size={20} />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 py-6"
              onClick={() => navigate('/mentor-cabinet')}
            >
              Become a Mentor
            </Button>
          </div>

          {/* Trust Indicators */}
          <p className="text-sm text-muted-foreground animate-fade-in-up animation-delay-800">
            Trusted by 10,000+ professionals worldwide
          </p>
        </div>
      </div>
    </section>
  );
};

export default Hero;