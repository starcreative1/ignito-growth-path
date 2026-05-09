export type FontPair =
  | "space-grotesk-dm-sans"
  | "instrument-serif-work-sans"
  | "outfit-figtree"
  | "cormorant-karla"
  | "bebas-neue-barlow";

export type LayoutStyle = "minimal" | "bold" | "editorial" | "playful";
export type BackgroundStyle = "solid" | "gradient" | "pattern";
export type ButtonStyle = "rounded" | "pill" | "square";

export interface StorefrontTheme {
  primary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  background_style: BackgroundStyle;
  font_pairing: FontPair;
  layout_style: LayoutStyle;
  button_style: ButtonStyle;
  tone?: string;
}

export const DEFAULT_THEME: StorefrontTheme = {
  primary_color: "#0F172A",
  accent_color: "#6366F1",
  background_color: "#FAFAF9",
  text_color: "#0F172A",
  background_style: "solid",
  font_pairing: "outfit-figtree",
  layout_style: "minimal",
  button_style: "rounded",
  tone: "warm, confident",
};

export const FONT_PAIR_META: Record<FontPair, { heading: string; body: string; label: string }> = {
  "space-grotesk-dm-sans":      { heading: "Space Grotesk", body: "DM Sans",   label: "Modern tech" },
  "instrument-serif-work-sans": { heading: "Instrument Serif", body: "Work Sans", label: "Editorial" },
  "outfit-figtree":             { heading: "Outfit",        body: "Figtree",  label: "Lifestyle" },
  "cormorant-karla":            { heading: "Cormorant",     body: "Karla",    label: "Luxury" },
  "bebas-neue-barlow":          { heading: "Bebas Neue",    body: "Barlow",   label: "Bold" },
};

export function backgroundStyleToCss(theme: StorefrontTheme): React.CSSProperties {
  if (theme.background_style === "gradient") {
    return {
      background: `linear-gradient(135deg, ${theme.background_color}, ${theme.accent_color}22)`,
    };
  }
  if (theme.background_style === "pattern") {
    return {
      backgroundColor: theme.background_color,
      backgroundImage: `radial-gradient(${theme.primary_color}14 1px, transparent 1px)`,
      backgroundSize: "14px 14px",
    };
  }
  return { backgroundColor: theme.background_color };
}

export function buttonRadius(style: ButtonStyle): string {
  if (style === "pill") return "9999px";
  if (style === "square") return "4px";
  return "12px";
}