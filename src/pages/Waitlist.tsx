import { useState } from "react";
import { z } from "zod";
import { Sparkles, Loader2, Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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

const schema = z.object({
  full_name: z.string().trim().min(1, "Full name is required").max(200),
  email: z.string().trim().email("Enter a valid email").max(320),
  content_type: z.string().max(50).optional().or(z.literal("")),
  niche: z.string().trim().max(200).optional().or(z.literal("")),
  audience_size: z.string().max(50).optional().or(z.literal("")),
});

const CONTENT_TYPES = ["Video", "Written/Blog", "Podcast", "Courses/Education", "Other"];
const AUDIENCE_SIZES = ["Under 10K", "10K–50K", "50K–100K", "100K–500K", "500K+"];

const Waitlist = () => {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    content_type: "",
    niche: "",
    audience_size: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({
        title: "Check your details",
        description: parsed.error.errors[0]?.message ?? "Invalid form",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    const payload = {
      full_name: parsed.data.full_name,
      email: parsed.data.email,
      content_type: parsed.data.content_type || null,
      niche: parsed.data.niche || null,
      audience_size: parsed.data.audience_size || null,
    };
    const { error } = await supabase.from("waitlist_signups").insert(payload);
    setLoading(false);
    if (error) {
      toast({
        title: "Couldn't submit",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="relative pt-28 sm:pt-36 pb-20 overflow-hidden">
        {/* Iridescent backdrop */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[520px] w-[820px] rounded-full opacity-40 blur-3xl"
            style={{ background: "conic-gradient(from 120deg, hsl(var(--accent)), hsl(var(--primary)), hsl(var(--accent)))" }} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/40 backdrop-blur-sm text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              Founding Creator Access
            </div>
            <h1 className="text-4xl sm:text-6xl font-display font-bold tracking-tight">
              Join the <span className="gradient-text">waitlist</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed">
              Become a Founding Creator. Early access for creators ready to
              monetise and scale expertise with GCreators.
            </p>
          </div>

          <div className="max-w-xl mx-auto">
            <div className="relative rounded-2xl p-[1px] bg-gradient-to-br from-accent/60 via-primary/40 to-accent/60 shadow-elegant">
              <div className="rounded-2xl bg-card/90 backdrop-blur-xl p-6 sm:p-10">
                {submitted ? (
                  <div className="text-center py-10">
                    <div className="mx-auto w-14 h-14 rounded-full bg-accent/15 flex items-center justify-center mb-5">
                      <Check className="w-7 h-7 text-accent" />
                    </div>
                    <h2 className="text-2xl font-display font-semibold mb-2">
                      You're on the list
                    </h2>
                    <p className="text-muted-foreground">
                      We'll be in touch soon with your Founding Creator invite.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full name *</Label>
                      <Input
                        id="full_name"
                        value={form.full_name}
                        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                        required
                        maxLength={200}
                        placeholder="Your name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                        maxLength={320}
                        placeholder="you@domain.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="content_type">Content type</Label>
                      <Select
                        value={form.content_type}
                        onValueChange={(v) => setForm({ ...form, content_type: v })}
                      >
                        <SelectTrigger id="content_type">
                          <SelectValue placeholder="Select (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {CONTENT_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="niche">Niche</Label>
                      <Input
                        id="niche"
                        value={form.niche}
                        onChange={(e) => setForm({ ...form, niche: e.target.value })}
                        maxLength={200}
                        placeholder="e.g. AI, tech, bussines, creativity, lifestyle"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="audience_size">Audience size</Label>
                      <Select
                        value={form.audience_size}
                        onValueChange={(v) => setForm({ ...form, audience_size: v })}
                      >
                        <SelectTrigger id="audience_size">
                          <SelectValue placeholder="Select (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {AUDIENCE_SIZES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      type="submit"
                      variant="hero"
                      size="lg"
                      disabled={loading}
                      className="w-full mt-2"
                    >
                      {loading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</>
                      ) : (
                        "Claim your spot"
                      )}
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Waitlist;