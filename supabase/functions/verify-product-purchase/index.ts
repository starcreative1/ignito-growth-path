import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { sessionId } = await req.json();

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
    const mentorId = session.metadata?.mentor_id;

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

    // Generate signed URL for download (valid for 24 hours)
    const { data: signedUrlData } = await supabaseClient.storage
      .from("product-files")
      .createSignedUrl(product.file_url.split("/product-files/")[1], 86400);

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
