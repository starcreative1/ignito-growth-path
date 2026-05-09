import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  ShoppingBag, Store, Plus, ArrowRight, Copy, ExternalLink, Eye,
} from "lucide-react";

interface Props {
  mentorId: string;
  username: string | null;
  productRevenue: number;
  activeProducts: number;
  onNavigate: (tab: string) => void;
}

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

export const ShopStorefrontHero = ({
  mentorId, username, productRevenue, activeProducts, onNavigate,
}: Props) => {
  const { toast } = useToast();
  const [isPublished, setIsPublished] = useState<boolean>(false);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [lastSaleAt, setLastSaleAt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: sf }, { data: lastSale }] = await Promise.all([
        (supabase as any)
          .from("creator_storefronts")
          .select("is_published, has_unpublished_changes")
          .eq("mentor_id", mentorId)
          .maybeSingle(),
        supabase
          .from("product_purchases")
          .select("created_at, product_id, mentor_products!inner(mentor_id)")
          .eq("status", "completed")
          .eq("mentor_products.mentor_id", mentorId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      setIsPublished(Boolean(sf?.is_published));
      setHasUnpublishedChanges(Boolean(sf?.has_unpublished_changes));
      setLastSaleAt(lastSale?.created_at ?? null);
    })();
  }, [mentorId]);

  const liveUrl = username ? `gcreators.me/${username}` : null;

  const copyUrl = () => {
    if (!liveUrl) return;
    navigator.clipboard.writeText(`https://${liveUrl}`);
    toast({ title: "Link copied", description: liveUrl });
  };

  const openLive = () => {
    if (!username) return;
    window.open(`/${username}`, "_blank");
  };

  return (
    <div className="grid gap-4 lg:gap-6 lg:grid-cols-2">
      {/* Shop card */}
      <Card className="relative overflow-hidden p-6 sm:p-8 min-h-[320px] lg:min-h-[400px] flex flex-col justify-between border bg-gradient-to-br from-blue-500/10 via-background to-background hover:shadow-xl transition-shadow">
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="h-12 w-12 rounded-xl bg-blue-500/15 flex items-center justify-center mb-4">
            <ShoppingBag className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Your Shop</h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-md">
            Create and manage all your products — courses, coaching, downloads, memberships.
          </p>
        </div>

        <div className="relative space-y-4 mt-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="font-medium">
              {activeProducts} {activeProducts === 1 ? "product" : "products"} live
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="font-medium">${productRevenue.toFixed(2)} earned</span>
            {lastSaleAt && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">Last sale: {timeAgo(lastSaleAt)}</span>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="lg" onClick={() => onNavigate("shop")} className="gap-2">
              <Plus className="h-4 w-4" /> Add Product
            </Button>
            <Button size="lg" variant="ghost" onClick={() => onNavigate("shop")} className="gap-2">
              View All <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Storefront card */}
      <Card className="relative overflow-hidden p-6 sm:p-8 min-h-[320px] lg:min-h-[400px] flex flex-col justify-between border bg-gradient-to-br from-purple-500/10 via-background to-background hover:shadow-xl transition-shadow">
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="h-12 w-12 rounded-xl bg-purple-500/15 flex items-center justify-center mb-4">
              <Store className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
              isPublished
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}>
              <span className={`relative flex h-2 w-2`}>
                {isPublished && (
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  isPublished ? "bg-emerald-500" : "bg-muted-foreground/60"
                }`} />
              </span>
              {isPublished ? (hasUnpublishedChanges ? "Live · changes pending" : "Live") : "Draft"}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Your Storefront</h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-md">
            Your branded public page where audiences buy in one tap.
          </p>
        </div>

        <div className="relative space-y-4 mt-6">
          {liveUrl ? (
            <div className="flex items-center gap-1 rounded-lg border bg-card/60 backdrop-blur-sm px-3 py-2">
              <span className="text-sm truncate flex-1 font-medium">{liveUrl}</span>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={copyUrl} title="Copy link">
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={openLive} title="Open">
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              Set a username on your profile to claim your URL.
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="lg" onClick={() => onNavigate("storefront")} className="gap-2">
              {isPublished ? "Edit Storefront" : "Publish Your Storefront"}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="ghost" onClick={openLive} disabled={!username} className="gap-2">
              <Eye className="h-4 w-4" /> Preview
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ShopStorefrontHero;