import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Star, Eye, EyeOff, Package } from "lucide-react";

export interface ProductDisplayItem {
  product_id: string;
  visible: boolean;
  featured: boolean;
}

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  preview_image_url: string | null;
  is_active: boolean;
}

interface Props {
  mentorId: string;
  value: ProductDisplayItem[];
  onChange: (next: ProductDisplayItem[]) => void;
}

export const ProductsTab = ({ mentorId, value, onChange }: Props) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("mentor_products")
        .select("id,title,description,price,preview_image_url,is_active")
        .eq("mentor_id", mentorId)
        .order("created_at", { ascending: false });
      setProducts((data as Product[]) || []);
      setLoading(false);
    })();
  }, [mentorId]);

  // Merge: ordered list from value, then any new products appended (visible=false default)
  const merged: ProductDisplayItem[] = (() => {
    const known = new Set(value.map((v) => v.product_id));
    const ordered = value.filter((v) => products.some((p) => p.id === v.product_id));
    const extras = products
      .filter((p) => !known.has(p.id))
      .map<ProductDisplayItem>((p) => ({ product_id: p.id, visible: false, featured: false }));
    return [...ordered, ...extras];
  })();

  const productMap = new Map(products.map((p) => [p.id, p]));

  const patch = (id: string, p: Partial<ProductDisplayItem>) => {
    onChange(merged.map((it) => (it.product_id === id ? { ...it, ...p } : it)));
  };

  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const arr = [...merged];
    const from = arr.findIndex((i) => i.product_id === dragId);
    const to = arr.findIndex((i) => i.product_id === targetId);
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    onChange(arr);
    setDragId(null);
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground py-6 text-center">Loading products...</p>;
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed rounded-lg">
        <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium">No products yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Add products in the Shop tab to feature them on your storefront.
        </p>
      </div>
    );
  }

  const visibleCount = merged.filter((m) => m.visible).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{visibleCount} of {products.length} visible on storefront</span>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" className="h-7 text-xs"
            onClick={() => onChange(merged.map((m) => ({ ...m, visible: true })))}>
            Show all
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs"
            onClick={() => onChange(merged.map((m) => ({ ...m, visible: false })))}>
            Hide all
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {merged.map((item) => {
          const p = productMap.get(item.product_id);
          if (!p) return null;
          return (
            <div
              key={item.product_id}
              draggable
              onDragStart={() => setDragId(item.product_id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(item.product_id)}
              className={`flex items-center gap-2 rounded-md border bg-card p-2 ${
                !item.visible ? "opacity-60" : ""
              } ${dragId === item.product_id ? "ring-2 ring-primary" : ""}`}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
              {p.preview_image_url ? (
                <img src={p.preview_image_url} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
              ) : (
                <div className="h-10 w-10 rounded bg-muted shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">{p.title}</p>
                  {item.featured && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                      <Star className="h-2.5 w-2.5 mr-0.5 fill-current" /> Featured
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">${Number(p.price).toFixed(2)}</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                onClick={() => patch(item.product_id, { featured: !item.featured })}
                title={item.featured ? "Unfeature" : "Feature"}
              >
                <Star className={`h-4 w-4 ${item.featured ? "fill-current text-yellow-500" : ""}`} />
              </Button>
              <div className="flex items-center gap-1 shrink-0">
                {item.visible ? (
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <Switch
                  checked={item.visible}
                  onCheckedChange={(v) => patch(item.product_id, { visible: v })}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProductsTab;