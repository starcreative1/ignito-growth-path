import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_SORT_OPTIONS,
  type ProductCategoryId,
  type ProductSortId,
} from "@/lib/productCategories";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  activeCategory: ProductCategoryId | "all";
  onCategoryChange: (v: ProductCategoryId | "all") => void;
  counts: Record<string, number>;
  total: number;
  sort: ProductSortId;
  onSortChange: (v: ProductSortId) => void;
}

export const ShopFilters = ({
  search,
  onSearchChange,
  activeCategory,
  onCategoryChange,
  counts,
  total,
  sort,
  onSortChange,
}: Props) => {
  const Chip = ({
    id,
    label,
    count,
    hsl,
  }: {
    id: ProductCategoryId | "all";
    label: string;
    count: number;
    hsl?: string;
  }) => {
    const active = activeCategory === id;
    return (
      <button
        type="button"
        onClick={() => onCategoryChange(id)}
        className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors border ${
          active
            ? "border-transparent text-foreground shadow-subtle"
            : "border-border bg-background hover:bg-muted text-muted-foreground"
        }`}
        style={
          active && hsl
            ? { backgroundColor: `hsl(${hsl} / 0.14)`, color: `hsl(${hsl})` }
            : active
            ? { backgroundColor: "hsl(var(--muted))" }
            : undefined
        }
      >
        {label}
        <span className={`tabular-nums ${active ? "opacity-80" : "opacity-60"}`}>
          ({count})
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search products by title, description, or category…"
            className="pl-9"
          />
        </div>
        <Select value={sort} onValueChange={(v) => onSortChange(v as ProductSortId)}>
          <SelectTrigger className="sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRODUCT_SORT_OPTIONS.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="-mx-1 overflow-x-auto scrollbar-none">
        <div className="flex gap-2 px-1 pb-1">
          <Chip id="all" label="All" count={total} />
          {PRODUCT_CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              id={c.id}
              label={c.short}
              count={counts[c.id] || 0}
              hsl={c.hsl}
            />
          ))}
        </div>
      </div>
    </div>
  );
};