import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, X, ArrowRight } from "lucide-react";

interface Props {
  mentorId: string;
  username: string | null;
  storefrontPublished: boolean;
  activeProducts: number;
  totalRevenue: number;
  onNavigate: (tab: string) => void;
}

interface Insight {
  id: string;
  emoji: string;
  text: string;
  action?: { label: string; tab: string };
}

const STORAGE_KEY = "gc_dismissed_insights";

export const AIInsightsCard = ({
  mentorId, username, storefrontPublished, activeProducts, totalRevenue, onNavigate,
}: Props) => {
  const [daysSinceLastProduct, setDaysSinceLastProduct] = useState<number | null>(null);
  const [hasReviews, setHasReviews] = useState<boolean>(true);
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  });

  useEffect(() => {
    (async () => {
      const { data: latestProduct } = await supabase
        .from("mentor_products")
        .select("created_at")
        .eq("mentor_id", mentorId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestProduct?.created_at) {
        const diff = Date.now() - new Date(latestProduct.created_at).getTime();
        setDaysSinceLastProduct(Math.floor(diff / (1000 * 60 * 60 * 24)));
      }
      const { count } = await (supabase as any)
        .from("product_reviews")
        .select("id, mentor_products!inner(mentor_id)", { count: "exact", head: true })
        .eq("mentor_products.mentor_id", mentorId);
      setHasReviews((count || 0) > 0);
    })();
  }, [mentorId]);

  const insights = useMemo<Insight[]>(() => {
    const out: Insight[] = [];

    if (activeProducts === 0) {
      out.push({
        id: "no-products",
        emoji: "🎯",
        text: "Your storefront has no products yet. Add your first one — even a $9 download gets the flywheel spinning.",
        action: { label: "Add product", tab: "shop" },
      });
    }

    if (activeProducts > 0 && !storefrontPublished) {
      out.push({
        id: "publish",
        emoji: "✨",
        text: "You have products live but your storefront is in Draft. Publish it so people can actually buy.",
        action: { label: "Publish storefront", tab: "storefront" },
      });
    }

    if (storefrontPublished && totalRevenue === 0 && activeProducts > 0 && !hasReviews) {
      out.push({
        id: "testimonials",
        emoji: "💡",
        text: "Your storefront is live but no sales yet. Try adding product testimonials — creators who do convert 3.4× more.",
        action: { label: "Edit products", tab: "shop" },
      });
    }

    if (activeProducts > 0 && daysSinceLastProduct !== null && daysSinceLastProduct >= 14) {
      out.push({
        id: "ship-weekly",
        emoji: "🚀",
        text: `You haven't shipped a new product in ${daysSinceLastProduct} days. Audiences buy more when creators ship weekly.`,
        action: { label: "Add product", tab: "shop" },
      });
    }

    if (storefrontPublished && username) {
      out.push({
        id: "share",
        emoji: "📣",
        text: `Share gcreators.me/${username} in your bio — it's the highest-leverage move you can make today.`,
      });
    }

    return out.filter((i) => !dismissed.includes(i.id));
  }, [activeProducts, storefrontPublished, totalRevenue, hasReviews, daysSinceLastProduct, username, dismissed]);

  if (insights.length === 0) return null;

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <Card className="relative overflow-hidden p-5 sm:p-6 border bg-gradient-to-br from-primary/5 via-background to-background">
      <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="relative flex items-center gap-2 mb-4">
        <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-semibold leading-none">AI Twin Insights</h3>
          <p className="text-xs text-muted-foreground mt-1">Personalized suggestions to grow your business</p>
        </div>
      </div>

      <div className="relative space-y-2">
        {insights.slice(0, 3).map((i) => (
          <div
            key={i.id}
            className="flex items-start gap-3 p-3 rounded-lg border bg-card/60 backdrop-blur-sm"
          >
            <span className="text-xl shrink-0 leading-none mt-0.5">{i.emoji}</span>
            <p className="text-sm flex-1 leading-relaxed">{i.text}</p>
            <div className="flex items-center gap-1 shrink-0">
              {i.action && (
                <Button size="sm" variant="default" className="h-8" onClick={() => onNavigate(i.action!.tab)}>
                  {i.action.label} <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              )}
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => dismiss(i.id)} title="Dismiss">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default AIInsightsCard;