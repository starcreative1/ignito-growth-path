import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Download, Loader2, ShoppingBag, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const PurchaseSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [productTitle, setProductTitle] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (sessionId) {
      verifyPurchase();
    } else {
      setLoading(false);
      setError("No session ID provided");
    }
  }, [sessionId]);

  const verifyPurchase = async () => {
    try {
      console.log("[PurchaseSuccess] Verifying session:", sessionId);
      
      const { data, error } = await supabase.functions.invoke("verify-product-purchase", {
        body: { sessionId },
      });

      if (error) {
        console.error("[PurchaseSuccess] Verification error:", error);
        throw new Error(error.message || "Failed to verify purchase");
      }

      if (data?.success) {
        setVerified(true);
        setDownloadUrl(data.downloadUrl);
        setProductTitle(data.productTitle || "Your Product");
        toast.success("Purchase complete!", {
          description: `You now have access to ${data.productTitle}`,
        });
      } else {
        throw new Error(data?.error || "Verification failed");
      }
    } catch (err) {
      console.error("[PurchaseSuccess] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to verify purchase");
      toast.error("Verification failed", {
        description: "Please contact support if you've been charged",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
      toast.success("Download started");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container pt-32 px-4 pb-16 flex justify-center">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            {loading ? (
              <Loader2 className="h-16 w-16 mx-auto animate-spin text-primary" />
            ) : error ? (
              <AlertCircle className="h-16 w-16 mx-auto text-destructive" />
            ) : (
              <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
            )}
            <CardTitle className="mt-4 text-2xl">
              {loading 
                ? "Processing Your Purchase..." 
                : error 
                  ? "Something Went Wrong" 
                  : "Purchase Complete! 🎉"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            {loading ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Verifying your payment and preparing your download...
                </p>
                <p className="text-sm text-muted-foreground">
                  This may take a few seconds.
                </p>
              </div>
            ) : error ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">{error}</p>
                <p className="text-sm text-muted-foreground">
                  If you've been charged, please contact support with your session ID.
                </p>
                <div className="flex flex-col gap-3">
                  <Button variant="outline" onClick={() => navigate("/dashboard")}>
                    Go to Dashboard
                  </Button>
                  <Button variant="ghost" onClick={() => navigate("/mentors")}>
                    Browse Mentors
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <p className="text-muted-foreground">
                    Thank you for your purchase! Your digital product is ready for download.
                  </p>
                  {productTitle && (
                    <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
                      <div className="flex items-center justify-center gap-2 text-lg font-semibold">
                        <ShoppingBag size={20} className="text-accent" />
                        {productTitle}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {downloadUrl && (
                    <Button 
                      size="lg" 
                      className="w-full"
                      onClick={handleDownload}
                    >
                      <Download className="mr-2 h-5 w-5" />
                      Download Now
                    </Button>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    You can also access your purchases anytime from your dashboard.
                  </p>

                  <div className="flex flex-col gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => navigate("/dashboard")}
                    >
                      View My Purchases
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => navigate("/mentors")}
                    >
                      Continue Shopping
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default PurchaseSuccess;
