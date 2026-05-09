import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";
import { toast } from "sonner";
import {
  Copy, ExternalLink, Eye, GripVertical, Plus, Trash2,
  Instagram, Youtube, Linkedin, Globe, Music2, Twitter,
} from "lucide-react";
import { DesignTab } from "./DesignTab";
import { ProductsTab, ProductDisplayItem } from "./ProductsTab";
import {
  StorefrontTheme, DEFAULT_THEME, FONT_PAIR_META,
  backgroundStyleToCss, buttonRadius,
} from "./themeTypes";

interface Props {
  mentorId: string;
  mentorUsername: string | null;
  mentorName: string;
  mentorImageUrl: string | null;
  userId: string;
}

type SocialPlatform = "instagram" | "tiktok" | "youtube" | "linkedin" | "x" | "website";
interface SocialLink { id: string; platform: SocialPlatform; url: string }

interface StorefrontRow {
  id?: string;
  mentor_id: string;
  display_name: string | null;
  bio_short: string | null;
  location: string | null;
  location_flag: string | null;
  social_links: SocialLink[];
  theme: StorefrontTheme;
  product_display: ProductDisplayItem[];
  is_published: boolean;
  has_unpublished_changes: boolean;
  last_published_at: string | null;
}

const PLATFORM_META: Record<SocialPlatform, { label: string; icon: any; placeholder: string }> = {
  instagram: { label: "Instagram", icon: Instagram, placeholder: "https://instagram.com/yourname" },
  tiktok:    { label: "TikTok",    icon: Music2,    placeholder: "https://tiktok.com/@yourname" },
  youtube:   { label: "YouTube",   icon: Youtube,   placeholder: "https://youtube.com/@yourname" },
  linkedin:  { label: "LinkedIn",  icon: Linkedin,  placeholder: "https://linkedin.com/in/yourname" },
  x:         { label: "X",         icon: Twitter,   placeholder: "https://x.com/yourname" },
  website:   { label: "Website",   icon: Globe,     placeholder: "https://yoursite.com" },
};

const BIO_LIMIT = 160;

export const StorefrontBuilder = ({ mentorId, mentorUsername, mentorName, mentorImageUrl, userId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [data, setData] = useState<StorefrontRow>({
    mentor_id: mentorId,
    display_name: mentorName,
    bio_short: "",
    location: "",
    location_flag: "",
    social_links: [],
    theme: DEFAULT_THEME,
    product_display: [],
    is_published: false,
    has_unpublished_changes: false,
    last_published_at: null,
  });
  const [photoUrl, setPhotoUrl] = useState<string | null>(mentorImageUrl);
  const [dragId, setDragId] = useState<string | null>(null);
  const [products, setProducts] = useState<Array<{
    id: string; title: string; price: number; preview_image_url: string | null;
  }>>([]);

  const liveUrl = useMemo(
    () => (mentorUsername ? `gcreators.me/${mentorUsername}` : "gcreators.me/—"),
    [mentorUsername],
  );

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [mentorId]);

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase
        .from("mentor_products")
        .select("id,title,price,preview_image_url")
        .eq("mentor_id", mentorId)
        .eq("is_active", true);
      setProducts((rows as any) || []);
    })();
  }, [mentorId]);

  const load = async () => {
    setLoading(true);
    const { data: row } = await (supabase as any)
      .from("creator_storefronts")
      .select("*")
      .eq("mentor_id", mentorId)
      .maybeSingle();
    if (row) {
      setData({
        ...row,
        social_links: Array.isArray(row.social_links) ? row.social_links : [],
        product_display: Array.isArray(row.product_display) ? row.product_display : [],
        theme: row.theme && typeof row.theme === "object" && Object.keys(row.theme).length
          ? { ...DEFAULT_THEME, ...row.theme }
          : DEFAULT_THEME,
      });
    } else {
      setData((d) => ({ ...d, display_name: mentorName }));
    }
    setLoading(false);
  };

  const update = (patch: Partial<StorefrontRow>) => {
    setData((d) => ({ ...d, ...patch, has_unpublished_changes: true }));
  };

  const handleSave = async () => {
    setSaving("saving");
    const payload = {
      mentor_id: mentorId,
      display_name: data.display_name,
      bio_short: data.bio_short,
      location: data.location,
      location_flag: data.location_flag,
      social_links: data.social_links,
      theme: data.theme,
      product_display: data.product_display,
      has_unpublished_changes: true,
    };
    const { error } = await (supabase as any)
      .from("creator_storefronts")
      .upsert(payload, { onConflict: "mentor_id" });
    if (error) {
      toast.error(error.message);
      setSaving("idle");
      return;
    }
    setSaving("saved");
    setTimeout(() => setSaving("idle"), 1500);
  };

  const handlePublish = async () => {
    await handleSave();
    const { error } = await (supabase as any)
      .from("creator_storefronts")
      .update({
        is_published: true,
        has_unpublished_changes: false,
        last_published_at: new Date().toISOString(),
      })
      .eq("mentor_id", mentorId);
    if (error) { toast.error(error.message); return; }
    toast.success("Your storefront is live ✨");
    await load();
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(`https://${liveUrl}`);
    toast.success("Link copied");
  };

  const openLive = () => {
    if (!mentorUsername) return;
    window.open(`/${mentorUsername}`, "_blank");
  };

  // Social links handlers
  const addSocial = (platform: SocialPlatform) => {
    update({
      social_links: [
        ...data.social_links,
        { id: crypto.randomUUID(), platform, url: "" },
      ],
    });
  };
  const updateSocial = (id: string, url: string) => {
    update({ social_links: data.social_links.map((s) => s.id === id ? { ...s, url } : s) });
  };
  const removeSocial = (id: string) => {
    update({ social_links: data.social_links.filter((s) => s.id !== id) });
  };
  const onDragStart = (id: string) => setDragId(id);
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const arr = [...data.social_links];
    const from = arr.findIndex((s) => s.id === dragId);
    const to = arr.findIndex((s) => s.id === targetId);
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    update({ social_links: arr });
    setDragId(null);
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading storefront...</div>;
  }

  const isLive = data.is_published;
  const lastPub = data.last_published_at
    ? new Date(data.last_published_at).toLocaleString()
    : "Never";

  return (
    <div className="flex flex-col gap-4 pb-24">
      {/* Top bar */}
      <Card className="p-4 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold">Your Storefront</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${isLive ? "text-emerald-600" : "text-muted-foreground"}`}>
              <span className={`h-2 w-2 rounded-full ${isLive ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />
              {isLive ? "Live" : "Draft"}
            </span>
            <code className="text-sm bg-muted px-2 py-0.5 rounded">{liveUrl}</code>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={copyUrl} disabled={!mentorUsername}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={openLive} disabled={!mentorUsername}>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={openLive} disabled={!mentorUsername}>
            <Eye className="mr-2 h-4 w-4" /> Preview
          </Button>
          <Button onClick={handlePublish}>Publish</Button>
        </div>
      </Card>

      {/* Workspace */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Left editor */}
        <Card className="lg:col-span-2 p-4">
          <Tabs defaultValue="profile" className="space-y-4">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="design">Design</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="sections" disabled>Sections</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-5">
              <div className="flex flex-col items-center gap-3 py-2">
                <ProfilePhotoUpload
                  currentPhotoUrl={photoUrl}
                  onPhotoUpdate={async (url) => {
                    setPhotoUrl(url);
                    await supabase.from("mentor_profiles").update({ image_url: url }).eq("id", mentorId);
                    update({});
                  }}
                  userId={userId}
                  fallbackText={(data.display_name || mentorName || "?").slice(0, 1).toUpperCase()}
                />
                <p className="text-xs text-muted-foreground">Tap to upload — round crop, 1:1.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="display_name">Display name</Label>
                <Input
                  id="display_name"
                  value={data.display_name || ""}
                  onChange={(e) => update({ display_name: e.target.value })}
                  placeholder="Your name as it appears on your storefront"
                />
              </div>

              <div className="space-y-2">
                <Label>Username (URL)</Label>
                <div className="flex items-center rounded-md border bg-muted/40 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">gcreators.me/</span>
                  <span className="font-medium ml-0.5">{mentorUsername || "—"}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your URL is locked to your username. Change it in the Profile tab.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bio_short">Bio</Label>
                  <span className={`text-xs ${(data.bio_short?.length || 0) > BIO_LIMIT ? "text-destructive" : "text-muted-foreground"}`}>
                    {data.bio_short?.length || 0}/{BIO_LIMIT}
                  </span>
                </div>
                <Textarea
                  id="bio_short"
                  rows={3}
                  maxLength={BIO_LIMIT}
                  value={data.bio_short || ""}
                  onChange={(e) => update({ bio_short: e.target.value })}
                  placeholder="One sentence about what you do."
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="flag">Flag</Label>
                  <Input
                    id="flag"
                    maxLength={4}
                    value={data.location_flag || ""}
                    onChange={(e) => update({ location_flag: e.target.value })}
                    placeholder="🇺🇸"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="location">Location (optional)</Label>
                  <Input
                    id="location"
                    value={data.location || ""}
                    onChange={(e) => update({ location: e.target.value })}
                    placeholder="Brooklyn, NY"
                  />
                </div>
              </div>

              {/* Social links */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Social links</Label>
                </div>
                <div className="space-y-2">
                  {data.social_links.map((s) => {
                    const meta = PLATFORM_META[s.platform];
                    const Icon = meta.icon;
                    return (
                      <div
                        key={s.id}
                        draggable
                        onDragStart={() => onDragStart(s.id)}
                        onDragOver={onDragOver}
                        onDrop={() => onDrop(s.id)}
                        className="flex items-center gap-2 rounded-md border bg-card p-2"
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
                        <Icon className="h-4 w-4 shrink-0" />
                        <Input
                          value={s.url}
                          onChange={(e) => updateSocial(s.id, e.target.value)}
                          placeholder={meta.placeholder}
                          className="h-8"
                        />
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => removeSocial(s.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {(Object.keys(PLATFORM_META) as SocialPlatform[]).map((p) => {
                    const meta = PLATFORM_META[p];
                    const Icon = meta.icon;
                    return (
                      <Button key={p} variant="outline" size="sm" onClick={() => addSocial(p)}>
                        <Plus className="mr-1 h-3 w-3" /> <Icon className="mr-1 h-3 w-3" /> {meta.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <Button className="w-full" onClick={handleSave}>Save changes</Button>
            </TabsContent>

            <TabsContent value="design" className="space-y-4">
              <DesignTab
                theme={data.theme}
                onChange={(next) => update({ theme: next })}
              />
              <Button className="w-full" onClick={handleSave}>Save changes</Button>
            </TabsContent>

            <TabsContent value="products" className="space-y-4">
              <ProductsTab
                mentorId={mentorId}
                value={data.product_display}
                onChange={(next) => update({ product_display: next })}
              />
              <Button className="w-full" onClick={handleSave}>Save changes</Button>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Right preview */}
        <Card className="lg:col-span-3 p-4 bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Live preview</span>
            <Button size="sm" variant="ghost" onClick={openLive} disabled={!mentorUsername}>
              <ExternalLink className="mr-1 h-3.5 w-3.5" /> View as visitor
            </Button>
          </div>
          <div className="flex justify-center">
            <div className="w-[320px] rounded-[2rem] border-[10px] border-foreground/80 overflow-hidden shadow-xl"
                 style={{ backgroundColor: data.theme.background_color }}>
              <div
                className="aspect-[9/19] overflow-y-auto p-5 flex flex-col items-center text-center"
                style={{
                  ...backgroundStyleToCss(data.theme),
                  color: data.theme.text_color,
                  fontFamily: FONT_PAIR_META[data.theme.font_pairing].body,
                }}
              >
                {photoUrl ? (
                  <img src={photoUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-muted" />
                )}
                <h3
                  className="mt-3 font-semibold"
                  style={{ fontFamily: FONT_PAIR_META[data.theme.font_pairing].heading }}
                >
                  {data.display_name || mentorName}
                </h3>
                {(data.location_flag || data.location) && (
                  <p className="text-xs mt-0.5 opacity-70">
                    {data.location_flag} {data.location}
                  </p>
                )}
                {data.bio_short && (
                  <p className="mt-3 text-sm opacity-80">{data.bio_short}</p>
                )}
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {data.social_links.filter((s) => s.url).map((s) => {
                    const Icon = PLATFORM_META[s.platform].icon;
                    return (
                      <a key={s.id} href={s.url} target="_blank" rel="noreferrer"
                         className="h-9 w-9 flex items-center justify-center"
                         style={{
                           backgroundColor: `${data.theme.primary_color}15`,
                           color: data.theme.primary_color,
                           borderRadius: 9999,
                         }}>
                        <Icon className="h-4 w-4" />
                      </a>
                    );
                  })}
                </div>
                {(() => {
                  const map = new Map(products.map((p) => [p.id, p]));
                  const visible = data.product_display
                    .filter((it) => it.visible && map.has(it.product_id))
                    .map((it) => ({ ...map.get(it.product_id)!, featured: it.featured }));
                  if (visible.length === 0) {
                    return (
                      <p className="text-xs mt-6 opacity-60">
                        Add products in the Products tab to feature them here ✨
                      </p>
                    );
                  }
                  return (
                    <div className="mt-6 w-full space-y-2">
                      {visible.map((p) => (
                        <div
                          key={p.id}
                          className="w-full flex items-center gap-2 p-2 text-left"
                          style={{
                            backgroundColor: `${data.theme.primary_color}12`,
                            borderRadius: buttonRadius(data.theme.button_style),
                          }}
                        >
                          {p.preview_image_url ? (
                            <img src={p.preview_image_url} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
                          ) : (
                            <div className="h-10 w-10 rounded bg-foreground/10 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate flex items-center gap-1">
                              {p.featured && <span style={{ color: data.theme.primary_color }}>★</span>}
                              {p.title}
                            </p>
                            <p className="text-[10px] opacity-70">${Number(p.price).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur z-30">
        <div className="container px-3 sm:px-4 py-2 flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground truncate">
            {saving === "saving" ? "Saving..." : saving === "saved" ? "✓ All changes saved" : `Last published: ${lastPub}`}
          </div>
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={!data.has_unpublished_changes && data.is_published}
          >
            Publish changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StorefrontBuilder;