import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, FileImage, FileVideo, File, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Purchase {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  product: {
    id: string;
    title: string;
    description: string;
    file_type: string;
    preview_image_url: string | null;
    mentor_id: string;
  } | null;
}

interface PurchasedProductCardProps {
  purchase: Purchase;
}

export const PurchasedProductCard = ({ purchase }: PurchasedProductCardProps) => {
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType) {
      case "pdf":
        return <FileText className="h-5 w-5" />;
      case "image":
        return <FileImage className="h-5 w-5" />;
      case "video":
        return <FileVideo className="h-5 w-5" />;
      default:
        return <File className="h-5 w-5" />;
    }
  };

  const getFileTypeLabel = (fileType: string) => {
    switch (fileType) {
      case "pdf":
        return "PDF Document";
      case "image":
        return "Image";
      case "video":
        return "Video";
      case "audio":
        return "Audio";
      case "document":
        return "Document";
      default:
        return "File";
    }
  };

  const handleDownload = async () => {
    if (!purchase.product) return;
    
    setDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-product-purchase", {
        body: { 
          productId: purchase.product.id,
          redownload: true 
        },
      });

      if (error) throw error;

      if (data?.downloadUrl) {
        window.open(data.downloadUrl, "_blank");
        toast({
          title: "Download started",
          description: "Your file download has begun.",
        });
      } else {
        throw new Error("No download URL returned");
      }
    } catch (error: any) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: error.message || "Could not download the file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  if (!purchase.product) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <div className="aspect-video relative bg-muted">
        {purchase.product.preview_image_url ? (
          <img
            src={purchase.product.preview_image_url}
            alt={purchase.product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {getFileTypeIcon(purchase.product.file_type)}
          </div>
        )}
        <Badge className="absolute top-2 right-2" variant="secondary">
          {getFileTypeLabel(purchase.product.file_type)}
        </Badge>
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg line-clamp-1">{purchase.product.title}</CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {purchase.product.description}
        </p>
        <div className="flex items-center justify-between mt-3 text-sm">
          <span className="text-muted-foreground">
            Purchased {new Date(purchase.created_at).toLocaleDateString()}
          </span>
          <span className="font-semibold">${purchase.amount}</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleDownload} 
          disabled={downloading || purchase.status !== "completed"}
          className="w-full"
        >
          {downloading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Preparing...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};
