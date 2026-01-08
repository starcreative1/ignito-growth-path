import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  messageId: string;
  recipientId: string;
  senderName: string;
  messageContent: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const { messageId, recipientId, senderName, messageContent }: NotificationRequest = await req.json();

    console.log("Sending notification for message:", messageId);

    // Get recipient's name from profiles (use maybeSingle to handle missing profiles)
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("full_name")
      .eq("id", recipientId)
      .maybeSingle();

    // If no profile found, try to get name from mentor_profiles
    let recipientName = profile?.full_name;
    if (!recipientName) {
      const { data: mentorProfile } = await supabaseClient
        .from("mentor_profiles")
        .select("name")
        .eq("user_id", recipientId)
        .maybeSingle();
      recipientName = mentorProfile?.name;
    }
    recipientName = recipientName || "there";

    // Get recipient's email from auth.users using service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          persistSession: false,
        },
      }
    );
    
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(recipientId);

    if (userError || !user?.email) {
      console.error("Error fetching recipient email:", userError);
      // Don't throw - just log and return success to not block message sending
      return new Response(JSON.stringify({ success: false, error: "Could not send email notification" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const recipientEmail = user.email;

    // Send email notification
    const emailResponse = await resend.emails.send({
      from: "MentorMatch <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `New message from ${senderName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Hi ${recipientName},</h2>
          <p style="color: #666; line-height: 1.6;">You have a new message from <strong>${senderName}</strong>:</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #333; margin: 0;">${messageContent}</p>
          </div>
          <p style="color: #666; line-height: 1.6;">
            <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '') || ''}/messages" 
               style="color: #0066cc; text-decoration: none;">Click here to reply</a>
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This is an automated notification from MentorMatch.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-message-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
