import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Download, Loader2 } from "lucide-react";

const PurchaseSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [productTitle, setProductTitle] = useState<string>("");

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (sessionId) {
      verifyPurchase();
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  const verifyPurchase = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("verify-product-purchase", {
        body: { sessionId },
      });

      if (error) throw error;

      if (data?.downloadUrl) {
        setDownloadUrl(data.downloadUrl);
        setProductTitle(data.productTitle || "Your Product");
      }
    } catch (error) {
      console.error("Verification error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container pt-32 px-4 pb-16 flex justify-center">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            {loading ? (
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-muted-foreground" />
            ) : (
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            )}
            <CardTitle>
              {loading ? "Processing..." : "Purchase Complete!"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {loading ? (
              <p className="text-muted-foreground">
                Verifying your purchase...
              </p>
            ) : (
              <>
                <p className="text-muted-foreground">
                  Thank you for your purchase! You now have access to your digital product.
                </p>
                {productTitle && (
                  <p className="font-medium">{productTitle}</p>
                )}
                {downloadUrl && (
                  <Button asChild className="w-full">
                    <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="mr-2 h-4 w-4" />
                      Download Product
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/dashboard")}
                >
                  Go to Dashboard
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PurchaseSuccess;
