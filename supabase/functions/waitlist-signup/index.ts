import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const ADMIN_EMAIL = Deno.env.get("WAITLIST_ADMIN_EMAIL") ?? "";
const FROM = "G.Creators <onboarding@resend.dev>";

interface Payload {
  full_name: string;
  email: string;
  content_type?: string | null;
  niche?: string | null;
  audience_size?: string | null;
}

function clean(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Payload;
    const full_name = clean(body.full_name, 200);
    const email = clean(body.email, 320)?.toLowerCase() ?? null;

    if (!full_name || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid name or email" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const content_type = clean(body.content_type, 50);
    const niche = clean(body.niche, 200);
    const audience_size = clean(body.audience_size, 50);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabase
      .from("waitlist_signups")
      .insert({ full_name, email, content_type, niche, audience_size })
      .select()
      .single();

    if (error) {
      console.error("Insert failed", error);
      return new Response(JSON.stringify({ error: "Could not join waitlist" }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Confirmation email to subscriber (soft fail)
    try {
      await resend.emails.send({
        from: FROM,
        to: [email],
        subject: "You're on the G.Creators waitlist ✨",
        html: `
          <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#0a0a0a;">
            <h1 style="font-size:28px;margin:0 0 16px;background:linear-gradient(135deg,#1fb6e6,#a374e8);-webkit-background-clip:text;background-clip:text;color:transparent;">Welcome, Founding Creator.</h1>
            <p style="font-size:16px;line-height:1.6;color:#333;">Hi ${full_name.replace(/</g, "&lt;")},</p>
            <p style="font-size:16px;line-height:1.6;color:#333;">You're officially on the G.Creators waitlist — among the first creators invited to monetise and scale expertise with our AI-powered platform.</p>
            <p style="font-size:16px;line-height:1.6;color:#333;">We'll be in touch soon with your early access invite, founding-member perks, and the first look at the platform.</p>
            <p style="font-size:14px;line-height:1.6;color:#666;margin-top:32px;">Stay creative,<br/>The G.Creators team</p>
          </div>`,
      });
    } catch (e) {
      console.error("Confirmation email failed", e);
    }

    // Admin notification (soft fail)
    if (ADMIN_EMAIL) {
      try {
        await resend.emails.send({
          from: FROM,
          to: [ADMIN_EMAIL],
          subject: `New waitlist signup: ${full_name}`,
          html: `
            <div style="font-family:Inter,Arial,sans-serif;max-width:560px;padding:24px;color:#0a0a0a;">
              <h2 style="margin:0 0 16px;">New waitlist signup</h2>
              <table style="font-size:14px;line-height:1.6;border-collapse:collapse;">
                <tr><td style="padding:4px 12px 4px 0;color:#666;">Name</td><td>${full_name.replace(/</g, "&lt;")}</td></tr>
                <tr><td style="padding:4px 12px 4px 0;color:#666;">Email</td><td>${email}</td></tr>
                <tr><td style="padding:4px 12px 4px 0;color:#666;">Content type</td><td>${content_type ?? "—"}</td></tr>
                <tr><td style="padding:4px 12px 4px 0;color:#666;">Niche</td><td>${(niche ?? "—").replace(/</g, "&lt;")}</td></tr>
                <tr><td style="padding:4px 12px 4px 0;color:#666;">Audience</td><td>${audience_size ?? "—"}</td></tr>
                <tr><td style="padding:4px 12px 4px 0;color:#666;">When</td><td>${new Date().toISOString()}</td></tr>
              </table>
            </div>`,
        });
      } catch (e) {
        console.error("Admin notification failed", e);
      }
    }

    return new Response(JSON.stringify({ ok: true, id: data.id }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    console.error("Waitlist error", e);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});