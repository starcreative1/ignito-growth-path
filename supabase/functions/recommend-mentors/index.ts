import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    // Require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's auth context
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify authentication using getClaims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("[RECOMMEND-MENTORS] Auth error:", claimsError);
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log("[RECOMMEND-MENTORS] Authenticated user:", userId);

    // Get user profile using their own auth context (respects RLS)
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("[RECOMMEND-MENTORS] Profile error:", profileError);
      throw new Error("Failed to fetch user profile");
    }

    // Handle case when profile doesn't exist yet
    if (!profile) {
      console.log("[RECOMMEND-MENTORS] No profile found for user, returning empty recommendations");
      return new Response(
        JSON.stringify({ 
          recommendations: [],
          message: "Complete your profile to get personalized mentor recommendations"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log("[RECOMMEND-MENTORS] Profile loaded for user:", userId);

    // Fetch real mentors from database (mentor_profiles are publicly readable)
    const { data: mentors, error: mentorsError } = await supabaseClient
      .from("mentor_profiles")
      .select("*")
      .eq("is_active", true);

    if (mentorsError) {
      console.error("[RECOMMEND-MENTORS] Mentors error:", mentorsError);
      throw new Error("Failed to fetch mentors");
    }

    if (!mentors || mentors.length === 0) {
      return new Response(
        JSON.stringify({ recommendations: [] }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log(`[RECOMMEND-MENTORS] Found ${mentors.length} active mentors`);

    // Use Lovable AI to recommend mentors
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const userContext = `
User Profile:
- Name: ${profile.full_name || "Not provided"}
- Categories of Interest: ${profile.interests?.join(", ") || "Not specified"}
- Skill Level: ${profile.skill_level || "Not specified"}
- Goals: ${profile.goals || "Not specified"}

Available Mentors (${mentors.length} total):
${mentors.map(m => `
- ID: ${m.id}
- Name: ${m.name}
- Title: ${m.title}
- Category: ${m.category}
- Expertise: ${m.expertise.join(", ")}
- Price: $${m.price}/hour
- Experience: ${m.experience}
- Bio: ${m.bio}
`).join("\n")}

Task: Recommend the top 3 mentors that best match this user's profile. 

Matching Rules:
1. Prioritize matching the user's categories of interest (Business, Tech, Creators) with mentor categories
2. Consider the user's skill level when recommending mentors
3. Factor in the user's goals and how each mentor can help achieve them
4. Provide a match score (0-100) based on overall fit
5. Give specific, actionable reasons for each recommendation
6. Use the EXACT mentor ID from the list above
`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are an expert mentor matching AI. Analyze user profiles and recommend mentors based on category alignment (Business, Tech, Creators), skill level compatibility, and goal achievement potential. Always use the EXACT mentor ID provided in the context. Be specific and actionable in your reasoning."
          },
          {
            role: "user",
            content: userContext
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "recommend_mentors",
              description: "Return top 3 mentor recommendations with reasoning",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        mentorId: { type: "string", description: "The ID of the recommended mentor" },
                        matchScore: { type: "number", description: "Match score from 0-100" },
                        reasoning: { type: "string", description: "Detailed explanation of why this mentor is a good match" },
                        keyBenefits: { 
                          type: "array", 
                          items: { type: "string" },
                          description: "List of 2-3 key benefits this mentor offers"
                        }
                      },
                      required: ["mentorId", "matchScore", "reasoning", "keyBenefits"],
                      additionalProperties: false
                    },
                    minItems: 3,
                    maxItems: 3
                  }
                },
                required: ["recommendations"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "recommend_mentors" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[RECOMMEND-MENTORS] AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error("Rate limit exceeded. Please try again in a moment.");
      }
      if (aiResponse.status === 402) {
        throw new Error("AI credits exhausted. Please add credits to continue.");
      }
      throw new Error("Failed to get AI recommendations");
    }

    const aiData = await aiResponse.json();
    console.log("[RECOMMEND-MENTORS] AI response:", JSON.stringify(aiData));

    // Extract recommendations from tool call
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No recommendations received from AI");
    }

    const recommendations = JSON.parse(toolCall.function.arguments).recommendations;

    // Enrich recommendations with full mentor data
    const enrichedRecommendations = recommendations.map((rec: any) => {
      const mentor = mentors.find(m => m.id === rec.mentorId);
      if (!mentor) {
        console.warn(`[RECOMMEND-MENTORS] Mentor not found for ID: ${rec.mentorId}`);
        return null;
      }
      return {
        ...rec,
        mentor: {
          id: mentor.id,
          name: mentor.name,
          title: mentor.title,
          expertise: mentor.expertise,
          category: mentor.category,
          experience: mentor.experience,
          bio: mentor.bio,
          price: mentor.price,
          rating: mentor.rating,
          image_url: mentor.image_url
        }
      };
    }).filter(Boolean);

    console.log(`[RECOMMEND-MENTORS] Returning ${enrichedRecommendations.length} recommendations`);

    return new Response(
      JSON.stringify({ recommendations: enrichedRecommendations }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[RECOMMEND-MENTORS] Error:", error);
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