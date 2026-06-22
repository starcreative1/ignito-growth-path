import { useState } from "react";
import { Sparkles, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const CONTENT_TYPES = [
  "Video",
  "Written/Blog",
  "Podcast",
  "Courses/Education",
  "Social media",
  "Other",
];

const AUDIENCE_SIZES = [
  "Under 10K",
  "10K–50K",
  "50K–100K",
  "100K–500K",
  "500K+",
];

const WaitlistSection = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [contentType, setContentType] = useState<string>("");
  const [niche, setNiche] = useState("");
  const [audienceSize, setAudienceSize] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      toast({
        title: "Missing info",
        description: "Full name and email are required.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("waitlist-signup", {
        body: {
          full_name: fullName.trim(),
          email: email.trim(),
          content_type: contentType || null,
          niche: niche.trim() || null,
          audience_size: audienceSize || null,
        },
      });
      if (error || (data && (data as any).error)) {
        throw new Error(error?.message || (data as any)?.error || "Something went wrong");
      }
      setDone(true);
      toast({
        title: "You're on the list ✨",
        description: "Check your inbox for confirmation.",
      });
      setFullName("");
      setEmail("");
      setContentType("");
      setNiche("");
      setAudienceSize("");
    } catch (err: any) {
      toast({
        title: "Couldn't submit",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="waitlist"
      className="relative py-24 sm:py-32 overflow-hidden"
    >
      {/* Holographic background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background" />
        <div className="absolute top-1/4 -left-32 w-[36rem] h-[36rem] rounded-full blur-3xl opacity-30 bg-[conic-gradient(from_0deg,#a78bfa,#f0abfc,#fcd34d,#67e8f9,#a78bfa)] animate-pulse" />
        <div className="absolute bottom-0 -right-32 w-[32rem] h-[32rem] rounded-full blur-3xl opacity-25 bg-[conic-gradient(from_180deg,#f0abfc,#67e8f9,#fcd34d,#a78bfa)] animate-pulse delay-700" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium">
            <Sparkles size={16} />
            Founding Creator Access
          </div>
          <h2 className="text-4xl sm:text-5xl font-display font-bold tracking-tight">
            Become a <span className="gradient-text">Founding Creator</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Early access for creators ready to monetise and scale their expertise with GCreators.
          </p>
        </div>

        <div className="max-w-xl mx-auto">
          <div className="relative rounded-2xl p-[1.5px] bg-[conic-gradient(from_120deg,#a78bfa,#f0abfc,#fcd34d,#67e8f9,#a78bfa)] shadow-2xl">
            <div className="rounded-2xl bg-background/80 backdrop-blur-xl p-8 sm:p-10">
              {done ? (
                <div className="text-center py-8 space-y-4">
                  <div className="mx-auto w-14 h-14 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center">
                    <Check className="text-accent" />
                  </div>
                  <h3 className="text-2xl font-display font-semibold">You're in.</h3>
                  <p className="text-muted-foreground">
                    We've sent a confirmation to your inbox. Welcome to the founding circle.
                  </p>
                  <Button variant="outline" onClick={() => setDone(false)}>
                    Submit another
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="wl-name">
                      Full name <span className="text-accent">*</span>
                    </Label>
                    <Input
                      id="wl-name"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your name"
                      maxLength={200}
                      autoComplete="name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wl-email">
                      Email <span className="text-accent">*</span>
                    </Label>
                    <Input
                      id="wl-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@domain.com"
                      maxLength={320}
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wl-content">Content type</Label>
                    <Select value={contentType} onValueChange={setContentType}>
                      <SelectTrigger id="wl-content">
                        <SelectValue placeholder="Select (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTENT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wl-niche">Niche</Label>
                    <Input
                      id="wl-niche"
                      value={niche}
                      onChange={(e) => setNiche(e.target.value)}
                      placeholder="e.g. AI, beauty, finance, lifestyle"
                      maxLength={200}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wl-audience">Audience size</Label>
                    <Select value={audienceSize} onValueChange={setAudienceSize}>
                      <SelectTrigger id="wl-audience">
                        <SelectValue placeholder="Select (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {AUDIENCE_SIZES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="submit"
                    variant="hero"
                    size="lg"
                    className="w-full text-base"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Joining…
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Claim my Founding spot
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    No spam. Early access, product updates, and founding perks only.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WaitlistSection;