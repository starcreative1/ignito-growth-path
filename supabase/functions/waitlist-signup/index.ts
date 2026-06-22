import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FROM = "GCreators <hi@starcreative.agency>";
const NOTIFY_TO = "hi@starcreative.agency";

interface Payload {
  full_name?: string;
  email?: string;
  content_type?: string | null;
  niche?: string | null;
  audience_size?: string | null;
}

const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Payload;
    const full_name = (body.full_name ?? "").toString().trim();
    const email = (body.email ?? "").toString().trim().toLowerCase();
    const content_type = body.content_type?.toString().trim() || null;
    const niche = body.niche?.toString().trim() || null;
    const audience_size = body.audience_size?.toString().trim() || null;

    if (!full_name || full_name.length > 200) {
      return json({ error: "Full name is required" }, 400);
    }
    if (!email || !emailRe.test(email) || email.length > 320) {
      return json({ error: "Valid email is required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("waitlist_signups")
      .insert({ full_name, email, content_type, niche, audience_size })
      .select("id, created_at")
      .single();

    if (error) {
      console.error("insert error", error);
      return json({ error: "Could not save signup" }, 500);
    }

    // Fire emails — don't block on failures
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      const send = (payload: Record<string, unknown>) =>
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }).then(async (r) => {
          if (!r.ok) console.error("resend error", r.status, await r.text());
        }).catch((e) => console.error("resend exception", e));

      const confirmation = {
        from: FROM,
        to: [email],
        subject: "You're on the GCreators Founding Creator waitlist ✨",
        html: `
          <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0b0b14;color:#f5f3ff;border-radius:16px;">
            <h1 style="font-size:24px;margin:0 0 12px;background:linear-gradient(90deg,#c4b5fd,#f0abfc,#fcd34d);-webkit-background-clip:text;background-clip:text;color:transparent;">Welcome, ${escapeHtml(full_name)} —</h1>
            <p style="font-size:16px;line-height:1.6;color:#e9e7ff;">You're officially on the <strong>Founding Creator</strong> waitlist for GCreators.</p>
            <p style="font-size:15px;line-height:1.6;color:#cfcbe8;">Founding Creators get early access, priority onboarding, and a hand in shaping the platform built to help you monetise and scale your expertise.</p>
            <p style="font-size:14px;color:#a8a3cc;margin-top:24px;">We'll be in touch soon.<br/>— The GCreators team</p>
          </div>`,
      };

      const notify = {
        from: FROM,
        to: [NOTIFY_TO],
        subject: `New waitlist signup: ${full_name}`,
        html: `
          <div style="font-family:Inter,Arial,sans-serif;font-size:14px;color:#111;">
            <h2>New Founding Creator signup</h2>
            <p><strong>Name:</strong> ${escapeHtml(full_name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p><strong>Content type:</strong> ${escapeHtml(content_type ?? "—")}</p>
            <p><strong>Niche:</strong> ${escapeHtml(niche ?? "—")}</p>
            <p><strong>Audience size:</strong> ${escapeHtml(audience_size ?? "—")}</p>
            <p style="color:#666;">${new Date().toISOString()}</p>
          </div>`,
      };

      await Promise.allSettled([send(confirmation), send(notify)]);
    } else {
      console.warn("RESEND_API_KEY missing — skipping emails");
    }

    return json({ ok: true, id: data?.id });
  } catch (e) {
    console.error("waitlist-signup error", e);
    return json({ error: "Server error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}