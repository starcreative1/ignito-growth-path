import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, ShoppingCart, Loader2, Star, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ProductReviewsSection from "./ProductReviewsSection";

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  file_type: string;
  preview_image_url: string | null;
  average_rating?: number;
  review_count?: number;
}

interface ShopProductCardProps {
  product: Product;
  mentorName: string;
}

const ShopProductCard = ({ product, mentorName }: ShopProductCardProps) => {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();

  const getFileTypeLabel = (fileType: string) => {
    const types: Record<string, string> = {
      'application/pdf': 'PDF',
      'application/zip': 'ZIP',
      'audio/mpeg': 'Audio',
      'video/mp4': 'Video',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
    };
    return types[fileType] || fileType.split('/')[1]?.toUpperCase() || 'File';
  };

  const handlePurchase = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast.error("Please sign in to purchase products", {
        action: {
          label: "Sign In",
          onClick: () => navigate("/auth"),
        },
      });
      return;
    }

    setIsPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-product-checkout", {
        body: {
          productId: product.id,
        },
      });

      if (error) {
        console.error("Checkout error:", error);
        throw new Error(error.message || "Failed to create checkout session");
      }

      if (data?.url) {
        window.open(data.url, '_blank');
        toast.success("Checkout opened in new tab", {
          description: "Complete your payment in the new tab",
        });
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("Purchase error:", error);
      toast.error("Failed to start checkout", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  const averageRating = product.average_rating || 0;
  const reviewCount = product.review_count || 0;

  return (
    <Card className="overflow-hidden hover:shadow-strong transition-all duration-300 group">
      {product.preview_image_url ? (
        <div className="h-40 overflow-hidden bg-muted flex items-center justify-center">
          <img
            src={product.preview_image_url}
            alt={product.title}
            className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="h-40 bg-gradient-to-br from-accent/10 to-primary/10 flex items-center justify-center">
          <FileText size={48} className="text-muted-foreground/50" />
        </div>
      )}
      
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold line-clamp-2">{product.title}</h3>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {getFileTypeLabel(product.file_type)}
          </Badge>
        </div>
        
        {/* Rating Display */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 text-sm hover:text-accent transition-colors">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={12}
                    className={
                      i < Math.round(averageRating)
                        ? "text-accent fill-accent"
                        : "text-muted"
                    }
                  />
                ))}
              </div>
              <span className="text-muted-foreground">
                {averageRating > 0 ? averageRating.toFixed(1) : "No ratings"} 
                {reviewCount > 0 && ` (${reviewCount})`}
              </span>
              <MessageSquare size={12} className="text-muted-foreground" />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{product.title}</DialogTitle>
            </DialogHeader>
            <ProductReviewsSection
              productId={product.id}
              productTitle={product.title}
              averageRating={averageRating}
              reviewCount={reviewCount}
            />
          </DialogContent>
        </Dialog>
        
        <p className="text-sm text-muted-foreground line-clamp-2">
          {product.description}
        </p>
        
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="text-xl font-display font-bold gradient-text">
            ${product.price.toFixed(2)}
          </div>
          <Button 
            size="sm" 
            variant="hero"
            onClick={handlePurchase}
            disabled={isPurchasing}
          >
            {isPurchasing ? (
              <>
                <Loader2 size={16} className="mr-1 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ShoppingCart size={16} className="mr-1" />
                Buy Now
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShopProductCard;
