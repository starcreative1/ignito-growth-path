import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  StorefrontTheme, FONT_PAIR_META, DEFAULT_THEME,
  BackgroundStyle, ButtonStyle, LayoutStyle, FontPair,
  backgroundStyleToCss, buttonRadius,
} from "./themeTypes";

interface Props {
  theme: StorefrontTheme;
  onChange: (next: StorefrontTheme) => void;
}

const LAYOUT_STYLES: { value: LayoutStyle; label: string; hint: string }[] = [
  { value: "minimal",   label: "Minimal",   hint: "Clean, lots of whitespace" },
  { value: "bold",      label: "Bold",      hint: "Big type, strong color" },
  { value: "editorial", label: "Editorial", hint: "Magazine-style serif" },
  { value: "playful",   label: "Playful",   hint: "Rounded, energetic" },
];
const BG_STYLES: { value: BackgroundStyle; label: string }[] = [
  { value: "solid",    label: "Solid" },
  { value: "gradient", label: "Gradient" },
  { value: "pattern",  label: "Pattern" },
];
const BTN_STYLES: { value: ButtonStyle; label: string }[] = [
  { value: "rounded", label: "Rounded" },
  { value: "pill",    label: "Pill" },
  { value: "square",  label: "Square" },
];

export const DesignTab = ({ theme, onChange }: Props) => {
  const [aiOpen, setAiOpen] = useState(false);
  const [aiBrief, setAiBrief] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  const set = <K extends keyof StorefrontTheme>(key: K, value: StorefrontTheme[K]) => {
    onChange({ ...theme, [key]: value });
  };

  const handleGenerate = async () => {
    if (!aiBrief.trim()) { toast.error("Describe your brand first"); return; }
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-storefront-theme", {
        body: { description: aiBrief.trim() },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const next = { ...DEFAULT_THEME, ...(data as any).theme } as StorefrontTheme;
      onChange(next);
      toast.success("Theme generated ✨");
      setAiOpen(false);
      setAiBrief("");
    } catch (e: any) {
      toast.error(e?.message || "Generation failed");
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <Button className="w-full" size="lg" onClick={() => setAiOpen(true)}>
        <Sparkles className="mr-2 h-4 w-4" /> Generate with AI
      </Button>

      <div className="grid grid-cols-2 gap-3">
        <ColorField label="Primary"    value={theme.primary_color}    onChange={(v) => set("primary_color", v)} />
        <ColorField label="Accent"     value={theme.accent_color}     onChange={(v) => set("accent_color", v)} />
        <ColorField label="Background" value={theme.background_color} onChange={(v) => set("background_color", v)} />
        <ColorField label="Text"       value={theme.text_color}       onChange={(v) => set("text_color", v)} />
      </div>

      <div className="space-y-2">
        <Label>Background style</Label>
        <div className="grid grid-cols-3 gap-2">
          {BG_STYLES.map((b) => (
            <button key={b.value} type="button"
              onClick={() => set("background_style", b.value)}
              className={`rounded-md border p-2 text-xs font-medium transition ${theme.background_style === b.value ? "border-primary ring-1 ring-primary" : "hover:bg-muted"}`}>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Font pairing</Label>
        <Select value={theme.font_pairing} onValueChange={(v) => set("font_pairing", v as FontPair)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(FONT_PAIR_META) as FontPair[]).map((k) => (
              <SelectItem key={k} value={k}>
                {FONT_PAIR_META[k].heading} + {FONT_PAIR_META[k].body} — {FONT_PAIR_META[k].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Layout style</Label>
        <div className="grid grid-cols-2 gap-2">
          {LAYOUT_STYLES.map((l) => (
            <button key={l.value} type="button"
              onClick={() => set("layout_style", l.value)}
              className={`rounded-md border p-2 text-left transition ${theme.layout_style === l.value ? "border-primary ring-1 ring-primary" : "hover:bg-muted"}`}>
              <div className="text-sm font-semibold">{l.label}</div>
              <div className="text-xs text-muted-foreground">{l.hint}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Button style</Label>
        <div className="grid grid-cols-3 gap-2">
          {BTN_STYLES.map((b) => (
            <button key={b.value} type="button"
              onClick={() => set("button_style", b.value)}
              className={`border p-2 text-xs font-medium transition ${theme.button_style === b.value ? "border-primary ring-1 ring-primary" : "hover:bg-muted"}`}
              style={{ borderRadius: buttonRadius(b.value) }}>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Theme preview</Label>
        <div
          className="rounded-lg border p-4 flex flex-col items-center gap-2"
          style={{ ...backgroundStyleToCss(theme), color: theme.text_color }}
        >
          <div className="text-base font-bold" style={{ fontFamily: FONT_PAIR_META[theme.font_pairing].heading }}>
            {FONT_PAIR_META[theme.font_pairing].heading}
          </div>
          <div className="text-xs opacity-80" style={{ fontFamily: FONT_PAIR_META[theme.font_pairing].body }}>
            Body in {FONT_PAIR_META[theme.font_pairing].body}
          </div>
          <button
            className="px-4 py-1.5 text-xs font-medium"
            style={{
              backgroundColor: theme.primary_color,
              color: "#fff",
              borderRadius: buttonRadius(theme.button_style),
            }}>
            Buy now
          </button>
          <div className="h-1.5 w-12 rounded-full" style={{ backgroundColor: theme.accent_color }} />
        </div>
      </div>

      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Describe your brand in one sentence</DialogTitle>
          </DialogHeader>
          <Textarea
            rows={3}
            value={aiBrief}
            onChange={(e) => setAiBrief(e.target.value)}
            placeholder="e.g. Calm, science-backed coaching for ambitious moms — soft pastels, a hint of green."
            maxLength={300}
          />
          <p className="text-xs text-muted-foreground">
            We'll pick colors, fonts, and layout that match.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiOpen(false)} disabled={aiBusy}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={aiBusy || !aiBrief.trim()}>
              {aiBusy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : <><Sparkles className="mr-2 h-4 w-4" />Generate</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="space-y-1.5">
    <Label className="text-xs">{label}</Label>
    <div className="flex gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 rounded-md border cursor-pointer bg-transparent"
      />
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9 font-mono text-xs" />
    </div>
  </div>
);

export default DesignTab;