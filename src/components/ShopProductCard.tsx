import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  file_type: string;
  preview_image_url: string | null;
}

interface ShopProductCardProps {
  product: Product;
  mentorName: string;
}

const ShopProductCard = ({ product, mentorName }: ShopProductCardProps) => {
  const [isPurchasing, setIsPurchasing] = useState(false);

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
      toast.error("Please sign in to purchase products");
      return;
    }

    setIsPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-product-checkout", {
        body: {
          productId: product.id,
          buyerEmail: session.user.email,
          buyerId: session.user.id,
        },
      });

      if (error) throw error;

      if (data?.sessionUrl) {
        window.open(data.sessionUrl, '_blank');
      }
    } catch (error) {
      console.error("Purchase error:", error);
      toast.error("Failed to start checkout");
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-strong transition-all duration-300 group">
      {product.preview_image_url ? (
        <div className="h-40 overflow-hidden bg-muted">
          <img
            src={product.preview_image_url}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
        
        <p className="text-sm text-muted-foreground line-clamp-2">
          {product.description}
        </p>
        
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="text-xl font-display font-bold gradient-text">
            ${product.price}
          </div>
          <Button 
            size="sm" 
            variant="hero"
            onClick={handlePurchase}
            disabled={isPurchasing}
          >
            <ShoppingCart size={16} className="mr-1" />
            {isPurchasing ? "..." : "Buy Now"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShopProductCard;
