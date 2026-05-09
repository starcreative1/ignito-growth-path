import { getCategory } from "@/lib/productCategories";

interface Props {
  categoryId?: string | null;
  size?: "xs" | "sm";
  showIcon?: boolean;
  className?: string;
}

export const CategoryBadge = ({
  categoryId,
  size = "sm",
  showIcon = true,
  className = "",
}: Props) => {
  const cat = getCategory(categoryId);
  const Icon = cat.icon;
  const padding = size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";
  const iconSize = size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ring-1 ring-inset ${padding} ${className}`}
      style={{
        backgroundColor: `hsl(${cat.hsl} / 0.12)`,
        color: `hsl(${cat.hsl})`,
        // @ts-expect-error css var
        "--tw-ring-color": `hsl(${cat.hsl} / 0.25)`,
      }}
    >
      {showIcon && <Icon className={iconSize} />}
      {cat.short}
    </span>
  );
};

export const FreeBadge = ({ className = "" }: { className?: string }) => (
  <span
    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${className}`}
    style={{
      backgroundColor: "hsl(175 70% 42%)",
      color: "hsl(0 0% 100%)",
    }}
  >
    Free
  </span>
);