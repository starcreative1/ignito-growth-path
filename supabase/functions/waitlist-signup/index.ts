import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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