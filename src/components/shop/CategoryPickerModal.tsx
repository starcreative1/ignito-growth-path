import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PRODUCT_CATEGORIES, type ProductCategoryId } from "@/lib/productCategories";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (id: ProductCategoryId) => void;
}

export const CategoryPickerModal = ({ open, onOpenChange, onPick }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl tracking-tight">What are you selling?</DialogTitle>
          <DialogDescription>
            Choose a category to get started — you can change this later.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
          {PRODUCT_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onPick(cat.id)}
                className="group text-left rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-medium hover:border-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{
                  // @ts-expect-error css var
                  "--cat-color": `hsl(${cat.hsl})`,
                }}
              >
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center mb-3 transition-colors"
                  style={{
                    backgroundColor: `hsl(${cat.hsl} / 0.12)`,
                    color: `hsl(${cat.hsl})`,
                  }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">{cat.label}</h3>
                  {cat.isFree && (
                    <span
                      className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: `hsl(${cat.hsl} / 0.18)`, color: `hsl(${cat.hsl})` }}
                    >
                      Free
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {cat.description}
                </p>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};