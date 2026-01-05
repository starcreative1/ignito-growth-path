import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Signed URL expiration: 1 hour (3600 seconds)
const SIGNED_URL_EXPIRATION = 3600;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[VERIFY-PRODUCT-PURCHASE] Starting verification");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get auth user for re-download requests
    const authHeader = req.headers.get("Authorization");
    let authUserId: string | null = null;
    
    if (authHeader) {
      const { data: { user } } = await supabaseClient.auth.getUser(
        authHeader.replace("Bearer ", "")
      );
      authUserId = user?.id || null;
    }

    const { sessionId, productId: redownloadProductId, redownload } = await req.json();

    // Handle re-download request
    if (redownload && redownloadProductId && authUserId) {
      console.log("[VERIFY-PRODUCT-PURCHASE] Re-download request for product:", redownloadProductId);
      
      // Verify the user has purchased this product
      const { data: purchase, error: purchaseError } = await supabaseClient
        .from("product_purchases")
        .select("*, mentor_products(*)")
        .eq("product_id", redownloadProductId)
        .eq("buyer_id", authUserId)
        .eq("status", "completed")
        .maybeSingle();

      if (purchaseError || !purchase) {
        throw new Error("Purchase not found or not completed");
      }

      const product = purchase.mentor_products;
      
      // Generate signed URL for download with 1 hour expiration
      const filePath = product.file_url.includes("/product-files/") 
        ? product.file_url.split("/product-files/")[1]
        : product.file_url;
        
      const { data: signedUrlData } = await supabaseClient.storage
        .from("product-files")
        .createSignedUrl(filePath, SIGNED_URL_EXPIRATION);

      return new Response(
        JSON.stringify({
          success: true,
          productTitle: product.title,
          downloadUrl: signedUrlData?.signedUrl || product.file_url,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Original flow: verify new purchase via Stripe session
    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    console.log("[VERIFY-PRODUCT-PURCHASE] Session ID:", sessionId);

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe key not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Verify Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log("[VERIFY-PRODUCT-PURCHASE] Session status:", session.payment_status);

    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    const productId = session.metadata?.product_id;
    const buyerId = session.metadata?.buyer_id;

    if (!productId || !buyerId) {
      throw new Error("Invalid session metadata");
    }

    // Get product details
    const { data: product, error: productError } = await supabaseClient
      .from("mentor_products")
      .select("*")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      throw new Error("Product not found");
    }

    // Update purchase record
    const { error: updateError } = await supabaseClient
      .from("product_purchases")
      .update({
        status: "completed",
        stripe_payment_intent_id: session.payment_intent as string,
      })
      .eq("stripe_session_id", sessionId);

    if (updateError) {
      console.error("[VERIFY-PRODUCT-PURCHASE] Update error:", updateError);
    }

    // Update product sales count and earnings
    const { error: productUpdateError } = await supabaseClient
      .from("mentor_products")
      .update({
        sales_count: product.sales_count + 1,
        total_earnings: Number(product.total_earnings) + Number(product.price),
      })
      .eq("id", productId);

    if (productUpdateError) {
      console.error("[VERIFY-PRODUCT-PURCHASE] Product update error:", productUpdateError);
    }

    console.log("[VERIFY-PRODUCT-PURCHASE] Purchase verified successfully");

    // Generate signed URL for download with 1 hour expiration
    const { data: signedUrlData } = await supabaseClient.storage
      .from("product-files")
      .createSignedUrl(product.file_url.split("/product-files/")[1], SIGNED_URL_EXPIRATION);

    return new Response(
      JSON.stringify({
        success: true,
        productTitle: product.title,
        downloadUrl: signedUrlData?.signedUrl || product.file_url,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    console.error("[VERIFY-PRODUCT-PURCHASE] Error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
