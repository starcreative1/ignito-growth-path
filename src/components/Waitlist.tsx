import { useState } from "react";
import { Sparkles, Check, Loader2 } from "lucide-react";
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
import { toast } from "sonner";

const CONTENT_TYPES = [
  "Video",
  "Written/Blog",
  "Podcast",
  "Courses/Education",
  "Other",
];

const AUDIENCE_SIZES = [
  "Under 10K",
  "10K–50K",
  "50K–100K",
  "100K–500K",
  "500K+",
];

const Waitlist = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [contentType, setContentType] = useState<string>("");
  const [niche, setNiche] = useState("");
  const [audienceSize, setAudienceSize] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      toast.error("Please enter your name and email.");
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
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message || "Signup failed");
      }
      setDone(true);
      toast.success("You're on the list.");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not join the waitlist. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="waitlist" className="relative py-24 sm:py-32 overflow-hidden">
      {/* Holographic background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background" />
      <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full blur-3xl opacity-30"
           style={{ background: "conic-gradient(from 0deg, #1fb6e6, #a374e8, #ff7a59, #ffc24b, #1fb6e6)" }} />
      <div className="absolute -bottom-40 -right-20 w-[500px] h-[500px] rounded-full blur-3xl opacity-25"
           style={{ background: "conic-gradient(from 180deg, #a374e8, #1fb6e6, #ffc24b, #ff7a59, #a374e8)" }} />
      <div className="absolute inset-0 opacity-[0.04]"
           style={{
             backgroundImage:
               "linear-gradient(0deg, transparent 24%, rgba(0,0,0,0.6) 25%, rgba(0,0,0,0.6) 26%, transparent 27%, transparent 74%, rgba(0,0,0,0.6) 75%, rgba(0,0,0,0.6) 76%, transparent 77%), linear-gradient(90deg, transparent 24%, rgba(0,0,0,0.6) 25%, rgba(0,0,0,0.6) 26%, transparent 27%, transparent 74%, rgba(0,0,0,0.6) 75%, rgba(0,0,0,0.6) 76%, transparent 77%)",
             backgroundSize: "60px 60px",
           }} />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-2xl mx-auto text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/30 bg-background/60 backdrop-blur-md text-xs font-mono uppercase tracking-[0.2em] text-accent mb-6">
            <Sparkles size={14} />
            Founding Creators · Limited Access
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-[1.05] tracking-tight">
            <span className="gradient-text">Join the waitlist</span>
          </h2>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Become a Founding Creator. Early access for creators ready to monetise and scale expertise with GCreators.
          </p>
        </div>

        <div className="relative max-w-xl mx-auto">
          {/* Iridescent glow ring */}
          <div className="absolute -inset-[1px] rounded-3xl opacity-70 blur-[1px]"
               style={{ background: "linear-gradient(135deg, #1fb6e6, #a374e8 40%, #ff7a59 70%, #ffc24b)" }} />
          <div className="relative rounded-3xl bg-card/90 backdrop-blur-xl border border-border/60 p-6 sm:p-10 shadow-strong">
            {done ? (
              <div className="text-center py-8">
                <div className="inline-flex w-16 h-16 rounded-full bg-gradient-primary items-center justify-center mb-5 shadow-glow">
                  <Check className="text-white" size={28} />
                </div>
                <h3 className="text-2xl font-display font-bold mb-2">You're in.</h3>
                <p className="text-muted-foreground">
                  You're on the list. We'll be in touch soon with your founding-creator invite.
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="wl-name" className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                      Full name <span className="text-accent">*</span>
                    </Label>
                    <Input
                      id="wl-name"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your name"
                      className="h-12 bg-background/60 border-border/60 focus-visible:ring-accent"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wl-email" className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                      Email <span className="text-accent">*</span>
                    </Label>
                    <Input
                      id="wl-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@domain.com"
                      className="h-12 bg-background/60 border-border/60 focus-visible:ring-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                      Content type
                    </Label>
                    <Select value={contentType} onValueChange={setContentType}>
                      <SelectTrigger className="h-12 bg-background/60 border-border/60">
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTENT_TYPES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                      Audience size
                    </Label>
                    <Select value={audienceSize} onValueChange={setAudienceSize}>
                      <SelectTrigger className="h-12 bg-background/60 border-border/60">
                        <SelectValue placeholder="Select range" />
                      </SelectTrigger>
                      <SelectContent>
                        {AUDIENCE_SIZES.map((a) => (
                          <SelectItem key={a} value={a}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wl-niche" className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                    Niche
                  </Label>
                  <Input
                    id="wl-niche"
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    placeholder="e.g. AI, tech, bussines, creativity, lifestyle"
                    className="h-12 bg-background/60 border-border/60 focus-visible:ring-accent"
                  />
                </div>

                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  disabled={submitting}
                  className="w-full h-14 text-base relative overflow-hidden"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" /> Reserving your spot…
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Claim your spot
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground pt-1">
                  No spam. Founding-creator invites only.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Waitlist;