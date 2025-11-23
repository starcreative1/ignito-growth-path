import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mentorId, mentorName, bookingDate, bookingTime, price, userEmail } = await req.json();

    console.log("[CREATE-BOOKING] Creating booking for:", { mentorName, bookingDate, bookingTime });

    if (!mentorId || !mentorName || !bookingDate || !bookingTime || !price || !userEmail) {
      throw new Error("Missing required booking information");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Create a booking record first
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .insert({
        user_email: userEmail,
        mentor_id: mentorId,
        mentor_name: mentorName,
        booking_date: bookingDate,
        booking_time: bookingTime,
        price: price,
        status: "pending",
      })
      .select()
      .single();

    if (bookingError) {
      console.error("[CREATE-BOOKING] Error creating booking:", bookingError);
      throw new Error(`Failed to create booking: ${bookingError.message}`);
    }

    console.log("[CREATE-BOOKING] Booking created:", booking.id);

    // Check if customer exists in Stripe
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("[CREATE-BOOKING] Existing customer found:", customerId);
    } else {
      console.log("[CREATE-BOOKING] Creating new customer");
    }

    // Create Stripe checkout session for payment
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Mentorship Session with ${mentorName}`,
              description: `${bookingDate} at ${bookingTime}`,
            },
            unit_amount: Math.round(price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/booking-success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking.id}`,
      cancel_url: `${req.headers.get("origin")}/mentors/${mentorId}`,
      metadata: {
        booking_id: booking.id,
        mentor_id: mentorId,
      },
    });

    console.log("[CREATE-BOOKING] Stripe session created:", session.id);

    // Update booking with Stripe session ID
    await supabaseClient
      .from("bookings")
      .update({ stripe_session_id: session.id })
      .eq("id", booking.id);

    return new Response(
      JSON.stringify({
        sessionUrl: session.url,
        bookingId: booking.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[CREATE-BOOKING] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An error occurred",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});