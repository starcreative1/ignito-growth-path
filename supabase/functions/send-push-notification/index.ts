import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { recipientId, title, body, conversationId } = await req.json();

    console.log("Sending push notification to user:", recipientId);

    // Get user's push subscriptions
    const { data: subscriptions, error } = await supabaseClient
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", recipientId);

    if (error) {
      console.error("Error fetching subscriptions:", error);
      throw error;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found for user");
      return new Response(
        JSON.stringify({ message: "No subscriptions found" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Send push notification to all user's devices
    const notifications = subscriptions.map(async (sub) => {
      const subscription = sub.subscription as unknown as PushSubscription;
      
      const payload = JSON.stringify({
        title,
        body,
        conversationId,
        url: `/messages/${conversationId}`,
      });

      try {
        // Use Web Push API to send notification
        // Note: In production, you'd use a proper web-push library
        const response = await fetch(subscription.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "TTL": "86400",
          },
          body: payload,
        });

        if (!response.ok) {
          console.error("Failed to send push notification:", await response.text());
        }

        return response.ok;
      } catch (error) {
        console.error("Error sending push notification:", error);
        return false;
      }
    });

    await Promise.all(notifications);

    return new Response(
      JSON.stringify({ success: true, message: "Notifications sent" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-push-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
