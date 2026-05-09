import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, Sparkles, Gift } from "lucide-react";
import { getCategory, type ProductCategoryId } from "@/lib/productCategories";

interface Props {
  category: ProductCategoryId;
  data: Record<string, any>;
  onChange: (next: Record<string, any>) => void;
  mentorId: string;
  currentProductId?: string;
}

export const CategoryFields = ({ category, data, onChange, mentorId, currentProductId }: Props) => {
  const cat = getCategory(category);
  const set = (patch: Record<string, any>) => onChange({ ...data, ...patch });

  const ComingSoon = cat.comingSoonNote ? (
    <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground flex items-start gap-2">
      <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: `hsl(${cat.hsl})` }} />
      <span>{cat.comingSoonNote}</span>
    </div>
  ) : null;

  if (category === "digital_download") {
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>License type</Label>
          <Select
            value={data.license || "personal"}
            onValueChange={(v) => set({ license: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="personal">Personal use</SelectItem>
              <SelectItem value="commercial">Commercial use</SelectItem>
              <SelectItem value="extended">Extended commercial</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Auto-deliver after purchase</p>
            <p className="text-xs text-muted-foreground">
              Buyer receives an instant download link by email.
            </p>
          </div>
          <Switch
            checked={data.auto_deliver !== false}
            onCheckedChange={(v) => set({ auto_deliver: v })}
          />
        </div>
      </div>
    );
  }

  if (category === "coaching_call") {
    const durations: number[] = data.durations || [30, 60];
    const toggle = (m: number) =>
      set({
        durations: durations.includes(m)
          ? durations.filter((d) => d !== m)
          : [...durations, m].sort((a, b) => a - b),
      });
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Available durations</Label>
          <div className="flex flex-wrap gap-2">
            {[15, 30, 45, 60, 90, 120].map((m) => {
              const active = durations.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggle(m)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                    active ? "bg-primary text-primary-foreground border-transparent" : "bg-background hover:bg-muted"
                  }`}
                >
                  {m} min
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cancellation">Cancellation policy</Label>
          <Input
            id="cancellation"
            value={data.cancellation_policy || ""}
            onChange={(e) => set({ cancellation_policy: e.target.value })}
            placeholder="e.g. Free cancellation up to 24h before"
          />
        </div>
        {ComingSoon}
      </div>
    );
  }

  if (category === "membership") {
    const tiers: { name: string; price: string; benefits: string }[] = data.tiers || [
      { name: "Standard", price: "", benefits: "" },
    ];
    const updateTier = (i: number, patch: Partial<(typeof tiers)[number]>) => {
      const next = tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t));
      set({ tiers: next });
    };
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Billing frequency</Label>
          <Select
            value={data.billing_frequency || "monthly"}
            onValueChange={(v) => set({ billing_frequency: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="annually">Annually</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Tiers</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => set({ tiers: [...tiers, { name: "", price: "", benefits: "" }] })}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add tier
            </Button>
          </div>
          {tiers.map((tier, i) => (
            <div key={i} className="rounded-lg border p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Tier name (Standard, Pro, VIP…)"
                  value={tier.name}
                  onChange={(e) => updateTier(i, { name: e.target.value })}
                />
                <Input
                  placeholder="Price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={tier.price}
                  onChange={(e) => updateTier(i, { price: e.target.value })}
                />
              </div>
              <Input
                placeholder="Benefits (one per line, or comma-separated)"
                value={tier.benefits}
                onChange={(e) => updateTier(i, { benefits: e.target.value })}
              />
              {tiers.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => set({ tiers: tiers.filter((_, idx) => idx !== i) })}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                </Button>
              )}
            </div>
          ))}
        </div>
        {ComingSoon}
      </div>
    );
  }

  if (category === "external_link") {
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="ext_url">External URL *</Label>
          <Input
            id="ext_url"
            type="url"
            value={data.external_url || ""}
            onChange={(e) => set({ external_url: e.target.value })}
            placeholder="https://example.com/your-product"
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Open in new tab</p>
            <p className="text-xs text-muted-foreground">Recommended for affiliate links.</p>
          </div>
          <Switch
            checked={data.open_new_tab !== false}
            onCheckedChange={(v) => set({ open_new_tab: v })}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Auto UTM tracking</p>
            <p className="text-xs text-muted-foreground">
              Append <code>?utm_source=gcreators</code> for analytics.
            </p>
          </div>
          <Switch
            checked={data.utm_tracking !== false}
            onCheckedChange={(v) => set({ utm_tracking: v })}
          />
        </div>
      </div>
    );
  }

  if (category === "bundle") {
    return <BundlePicker data={data} set={set} mentorId={mentorId} currentProductId={currentProductId} />;
  }

  if (category === "webinar") {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="event_at">Date & time *</Label>
            <Input
              id="event_at"
              type="datetime-local"
              value={data.event_at || ""}
              onChange={(e) => set({ event_at: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration_min">Duration (min)</Label>
            <Input
              id="duration_min"
              type="number"
              min={5}
              step={5}
              value={data.duration_min || ""}
              onChange={(e) => set({ duration_min: e.target.value })}
              placeholder="60"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Platform</Label>
          <Select value={data.platform || "in_app"} onValueChange={(v) => set({ platform: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="in_app">In-app stream</SelectItem>
              <SelectItem value="zoom">Zoom</SelectItem>
              <SelectItem value="youtube_live">YouTube Live</SelectItem>
              <SelectItem value="custom">Custom URL</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {data.platform && data.platform !== "in_app" && (
          <div className="space-y-2">
            <Label htmlFor="join_url">Join URL</Label>
            <Input
              id="join_url"
              type="url"
              value={data.join_url || ""}
              onChange={(e) => set({ join_url: e.target.value })}
              placeholder="https://…"
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="max_attendees">Max attendees (optional)</Label>
          <Input
            id="max_attendees"
            type="number"
            min={1}
            value={data.max_attendees || ""}
            onChange={(e) => set({ max_attendees: e.target.value })}
            placeholder="No cap"
          />
        </div>
      </div>
    );
  }

  if (category === "lead_magnet") {
    return (
      <div className="space-y-3">
        <div className="rounded-lg p-3 text-xs flex items-start gap-2"
          style={{ backgroundColor: `hsl(${cat.hsl} / 0.1)`, color: `hsl(${cat.hsl})` }}
        >
          <Gift className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span className="text-foreground/80">
            Lead magnets are free and shown with a <strong>FREE</strong> badge. Set the price to
            0 — buyers receive your file by email after entering their address.
          </span>
        </div>
        <div className="space-y-2">
          <Label htmlFor="welcome_email">Welcome email body</Label>
          <Input
            id="welcome_email"
            value={data.welcome_email || ""}
            onChange={(e) => set({ welcome_email: e.target.value })}
            placeholder="Thanks for grabbing this — here's your file."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lead_tag">Tag captured leads</Label>
          <Input
            id="lead_tag"
            value={data.lead_tag || ""}
            onChange={(e) => set({ lead_tag: e.target.value })}
            placeholder="e.g. design-checklist"
          />
        </div>
      </div>
    );
  }

  if (category === "custom_service") {
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="timeline">Delivery timeline</Label>
          <Input
            id="timeline"
            value={data.timeline || ""}
            onChange={(e) => set({ timeline: e.target.value })}
            placeholder="e.g. 5–7 business days"
          />
        </div>
        <div className="space-y-2">
          <Label>Pricing model</Label>
          <Select
            value={data.pricing_model || "one_time"}
            onValueChange={(v) => set({ pricing_model: v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="one_time">One-time payment</SelectItem>
              <SelectItem value="deposit">Deposit + final payment</SelectItem>
              <SelectItem value="quote">Quote-based</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {ComingSoon}
      </div>
    );
  }

  if (category === "community") {
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Community type</Label>
          <Select value={data.community_type || "in_app"} onValueChange={(v) => set({ community_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="in_app">In-app community</SelectItem>
              <SelectItem value="discord">Discord</SelectItem>
              <SelectItem value="telegram">Telegram</SelectItem>
              <SelectItem value="circle">Circle</SelectItem>
              <SelectItem value="slack">Slack</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {data.community_type && data.community_type !== "in_app" && (
          <div className="space-y-2">
            <Label htmlFor="invite_link">Invite link</Label>
            <Input
              id="invite_link"
              type="url"
              value={data.invite_link || ""}
              onChange={(e) => set({ invite_link: e.target.value })}
              placeholder="https://discord.gg/…"
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="welcome_msg">Welcome message</Label>
          <Input
            id="welcome_msg"
            value={data.welcome_message || ""}
            onChange={(e) => set({ welcome_message: e.target.value })}
            placeholder="Welcome! Read #rules first."
          />
        </div>
        {ComingSoon}
      </div>
    );
  }

  if (category === "online_course") {
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Access duration</Label>
          <Select
            value={data.access_duration || "lifetime"}
            onValueChange={(v) => set({ access_duration: v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lifetime">Lifetime</SelectItem>
              <SelectItem value="12_months">12 months</SelectItem>
              <SelectItem value="6_months">6 months</SelectItem>
              <SelectItem value="3_months">3 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Completion certificate</p>
            <p className="text-xs text-muted-foreground">Issued automatically after 100% progress.</p>
          </div>
          <Switch checked={!!data.certificate} onCheckedChange={(v) => set({ certificate: v })} />
        </div>
        {ComingSoon}
      </div>
    );
  }

  return null;
};

/* ----- Bundle picker ----- */

interface BundleProduct {
  id: string;
  title: string;
  price: number;
}

const BundlePicker = ({
  data,
  set,
  mentorId,
  currentProductId,
}: {
  data: Record<string, any>;
  set: (patch: Record<string, any>) => void;
  mentorId: string;
  currentProductId?: string;
}) => {
  const [products, setProducts] = useState<BundleProduct[]>([]);
  const selected: string[] = data.included_product_ids || [];

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase
        .from("mentor_products")
        .select("id,title,price")
        .eq("mentor_id", mentorId)
        .eq("is_active", true);
      const filtered = (rows || []).filter((r: any) => r.id !== currentProductId);
      setProducts(filtered as BundleProduct[]);
    })();
  }, [mentorId, currentProductId]);

  const toggle = (id: string) => {
    set({
      included_product_ids: selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id],
    });
  };

  const totalIndividual = products
    .filter((p) => selected.includes(p.id))
    .reduce((s, p) => s + Number(p.price || 0), 0);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Included products</Label>
        {products.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Add at least 2 products to your Shop to create a bundle.
          </p>
        ) : (
          <div className="rounded-lg border divide-y max-h-56 overflow-y-auto">
            {products.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40"
              >
                <Checkbox
                  checked={selected.includes(p.id)}
                  onCheckedChange={() => toggle(p.id)}
                />
                <span className="text-sm flex-1 truncate">{p.title}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  ${Number(p.price).toFixed(2)}
                </span>
              </label>
            ))}
          </div>
        )}
        {selected.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Sum if bought separately: <strong>${totalIndividual.toFixed(2)}</strong>. Set the
            bundle price below to offer a discount.
          </p>
        )}
      </div>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Show discount % on storefront</p>
        </div>
        <Switch
          checked={data.show_discount !== false}
          onCheckedChange={(v) => set({ show_discount: v })}
        />
      </div>
    </div>
  );
};

