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
    console.log("[CREATE-PRODUCT-CHECKOUT] Starting checkout process");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }

    const user = userData.user;
    console.log("[CREATE-PRODUCT-CHECKOUT] User authenticated:", user.id);

    // Parse request body
    const { productId, successUrl, cancelUrl } = await req.json();
    
    if (!productId) {
      throw new Error("Product ID is required");
    }

    console.log("[CREATE-PRODUCT-CHECKOUT] Product ID:", productId);

    // Fetch product details
    const { data: product, error: productError } = await supabaseClient
      .from("mentor_products")
      .select(`
        *,
        mentor_profiles!inner(name)
      `)
      .eq("id", productId)
      .eq("is_active", true)
      .single();

    if (productError || !product) {
      console.error("[CREATE-PRODUCT-CHECKOUT] Product error:", productError);
      throw new Error("Product not found or not available");
    }

    console.log("[CREATE-PRODUCT-CHECKOUT] Product found:", product.title);

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe key not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Check if Stripe customer exists
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("[CREATE-PRODUCT-CHECKOUT] Existing Stripe customer:", customerId);
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: product.title,
              description: `Digital product by ${product.mentor_profiles.name}`,
            },
            unit_amount: Math.round(Number(product.price) * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        product_id: productId,
        buyer_id: user.id,
        mentor_id: product.mentor_id,
      },
    });

    console.log("[CREATE-PRODUCT-CHECKOUT] Checkout session created:", session.id);

    // Create pending purchase record
    const { error: purchaseError } = await supabaseClient
      .from("product_purchases")
      .insert({
        product_id: productId,
        buyer_id: user.id,
        buyer_email: user.email,
        amount: product.price,
        stripe_session_id: session.id,
        status: "pending",
      });

    if (purchaseError) {
      console.error("[CREATE-PRODUCT-CHECKOUT] Purchase record error:", purchaseError);
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    console.error("[CREATE-PRODUCT-CHECKOUT] Error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
