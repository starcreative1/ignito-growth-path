import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `You are a senior brand designer. Given a one-sentence brand description from a creator, return a complete storefront theme as a JSON object.

Rules:
- All colors are HEX (#RRGGBB) and must have strong AA contrast on the chosen background.
- Pick a layout style that fits the brand vibe.
- Be tasteful, not generic. Avoid neon clichés unless the brand explicitly asks.
- Tone is one short phrase describing the voice (e.g., "warm, plainspoken").
`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { description } = await req.json();
    if (!description || typeof description !== "string" || description.length > 500) {
      return new Response(JSON.stringify({ error: "Invalid description" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const tools = [{
      type: "function",
      function: {
        name: "generate_theme",
        description: "Return a storefront theme.",
        parameters: {
          type: "object",
          properties: {
            primary_color: { type: "string", description: "Hex like #1A1A2E" },
            accent_color: { type: "string" },
            background_color: { type: "string" },
            text_color: { type: "string" },
            background_style: { type: "string", enum: ["solid", "gradient", "pattern"] },
            font_pairing: {
              type: "string",
              enum: [
                "space-grotesk-dm-sans",
                "instrument-serif-work-sans",
                "outfit-figtree",
                "cormorant-karla",
                "bebas-neue-barlow",
              ],
            },
            layout_style: { type: "string", enum: ["minimal", "bold", "editorial", "playful"] },
            button_style: { type: "string", enum: ["rounded", "pill", "square"] },
            tone: { type: "string" },
          },
          required: [
            "primary_color", "accent_color", "background_color", "text_color",
            "background_style", "font_pairing", "layout_style", "button_style", "tone",
          ],
          additionalProperties: false,
        },
      },
    }];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Brand description: ${description}` },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "generate_theme" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "Add credits in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) throw new Error("No tool call returned");
    const theme = JSON.parse(call.function.arguments);

    return new Response(JSON.stringify({ theme }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("generate-storefront-theme:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});