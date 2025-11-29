import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { avatarId, conversationId, message } = await req.json();

    // Get avatar details
    const { data: avatar, error: avatarError } = await supabaseClient
      .from('mentor_avatars')
      .select('*, mentor_profiles(*)')
      .eq('id', avatarId)
      .single();

    if (avatarError || !avatar || avatar.status !== 'ready') {
      return new Response(JSON.stringify({ error: 'Avatar not found or not ready' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      const { data: newConv, error: convError } = await supabaseClient
        .from('avatar_conversations')
        .insert({
          user_id: user.id,
          avatar_id: avatarId
        })
        .select()
        .single();

      if (convError) {
        return new Response(JSON.stringify({ error: 'Failed to create conversation' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      convId = newConv.id;
    }

    // Save user message
    await supabaseClient
      .from('avatar_messages')
      .insert({
        conversation_id: convId,
        role: 'user',
        content: message
      });

    // Generate embedding for user query
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const embeddingResponse = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: message,
      }),
    });

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Perform similarity search
    const { data: relevantKnowledge, error: searchError } = await supabaseClient.rpc(
      'match_avatar_knowledge',
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: 5,
        avatar_id_param: avatarId
      }
    );

    // Build context from relevant knowledge
    const context = relevantKnowledge && relevantKnowledge.length > 0
      ? relevantKnowledge.map((k: any) => k.content).join('\n\n')
      : 'No specific knowledge found for this query.';

    // Get conversation history
    const { data: messages } = await supabaseClient
      .from('avatar_messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(10);

    const conversationHistory = messages?.slice(-10).map(m => ({
      role: m.role,
      content: m.content
    })) || [];

    // Generate response using Lovable AI
    const systemPrompt = `You are an AI avatar representing ${avatar.mentor_profiles.name}, a ${avatar.mentor_profiles.title}.

Your personality: ${avatar.personality_traits?.join(', ') || 'professional, helpful, knowledgeable'}

Your expertise: ${avatar.expertise_areas?.join(', ') || avatar.mentor_profiles.expertise.join(', ')}

Bio: ${avatar.bio_summary || avatar.mentor_profiles.bio}

IMPORTANT INSTRUCTIONS:
- Respond as if you ARE the mentor, using first person ("I", "my")
- Use the mentor's personality and expertise to inform your responses
- When relevant, mention the mentor's courses, services, or video answers
- If appropriate, suggest booking a consultation or exploring courses
- Be concise, helpful, and engaging
- If you don't know something, be honest but stay in character

Context from knowledge base:
${context}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: message }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: 'AI service temporarily unavailable' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices[0].message.content;

    // Save assistant message
    await supabaseClient
      .from('avatar_messages')
      .insert({
        conversation_id: convId,
        role: 'assistant',
        content: assistantMessage
      });

    return new Response(JSON.stringify({ 
      conversationId: convId,
      message: assistantMessage,
      mentorName: avatar.mentor_profiles.name,
      mentorImage: avatar.photo_urls?.[0] || avatar.mentor_profiles.image_url
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat-with-avatar function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});