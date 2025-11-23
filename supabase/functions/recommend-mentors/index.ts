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
    const { userId } = await req.json();

    if (!userId) {
      throw new Error("User ID is required");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("[RECOMMEND-MENTORS] Profile error:", profileError);
      throw new Error("Failed to fetch user profile");
    }

    console.log("[RECOMMEND-MENTORS] Profile loaded:", profile);

    // Get all mentors data (in a real app, this would come from a mentors table)
    const mentorsData = [
      {
        id: "1",
        name: "Dr. Sarah Chen",
        title: "AI Research Scientist at Meta",
        expertise: ["Machine Learning", "Deep Learning", "Computer Vision", "Natural Language Processing"],
        category: "AI & ML",
        experience: "12+ years in AI research",
        bio: "Specialized in cutting-edge AI research with focus on practical applications"
      },
      {
        id: "2",
        name: "Marcus Rodriguez",
        title: "Senior Product Designer at Google",
        expertise: ["UI/UX Design", "Product Strategy", "Design Systems", "User Research"],
        category: "Design",
        experience: "10+ years in product design",
        bio: "Expert in creating intuitive user experiences and scalable design systems"
      },
      {
        id: "3",
        name: "Emily Watson",
        title: "VP of Engineering at Stripe",
        expertise: ["Full-Stack Development", "System Architecture", "Cloud Infrastructure", "Team Leadership"],
        category: "Engineering",
        experience: "15+ years in software engineering",
        bio: "Passionate about building scalable systems and mentoring engineering teams"
      },
      {
        id: "4",
        name: "David Kim",
        title: "Blockchain Lead at Coinbase",
        expertise: ["Blockchain Technology", "Smart Contracts", "DeFi", "Web3 Development"],
        category: "Blockchain",
        experience: "8+ years in blockchain",
        bio: "Pioneer in decentralized finance and blockchain applications"
      },
      {
        id: "5",
        name: "Lisa Anderson",
        title: "Data Science Director at Amazon",
        expertise: ["Data Science", "Statistical Analysis", "Big Data", "Predictive Modeling"],
        category: "Data Science",
        experience: "11+ years in data science",
        bio: "Expert in turning data into actionable business insights"
      },
      {
        id: "6",
        name: "James Park",
        title: "Cybersecurity Expert",
        expertise: ["Network Security", "Penetration Testing", "Security Architecture", "Compliance"],
        category: "Security",
        experience: "9+ years in cybersecurity",
        bio: "Dedicated to securing systems and educating on best security practices"
      }
    ];

    // Use Lovable AI to recommend mentors
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const userContext = `
User Profile:
- Name: ${profile.full_name || "Not provided"}
- Interests: ${profile.interests?.join(", ") || "Not specified"}
- Skill Level: ${profile.skill_level || "Not specified"}
- Goals: ${profile.goals || "Not specified"}

Available Mentors:
${mentorsData.map(m => `
- ${m.name} (${m.title})
  Category: ${m.category}
  Expertise: ${m.expertise.join(", ")}
  Experience: ${m.experience}
  Bio: ${m.bio}
`).join("\n")}

Based on this user's profile, recommend the top 3 mentors that would be the best match. Consider their interests, skill level, and goals when making recommendations.
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
            content: "You are an expert career mentor matching system. Analyze user profiles and recommend the most suitable mentors based on their interests, skill level, and goals. Return recommendations as a JSON array with mentor IDs and detailed reasoning for each match."
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
      const mentor = mentorsData.find(m => m.id === rec.mentorId);
      return {
        ...rec,
        mentor
      };
    });

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