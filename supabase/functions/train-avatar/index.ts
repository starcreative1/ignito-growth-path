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

    const { avatarId, mentorId, bioSummary, expertiseAreas, personalityTraits } = await req.json();

    // Verify mentor ownership
    const { data: mentorProfile, error: mentorError } = await supabaseClient
      .from('mentor_profiles')
      .select('*')
      .eq('id', mentorId)
      .eq('user_id', user.id)
      .single();

    if (mentorError || !mentorProfile) {
      return new Response(JSON.stringify({ error: 'Mentor profile not found or unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update avatar status to training
    await supabaseClient
      .from('mentor_avatars')
      .update({ status: 'training' })
      .eq('id', avatarId);

    // Fetch additional mentor data for knowledge base
    const [coursesResult, reviewsResult, questionsResult] = await Promise.all([
      supabaseClient.from('mentor_courses').select('*').eq('mentor_id', mentorId),
      supabaseClient.from('mentor_reviews').select('*').eq('mentor_id', mentorId).limit(10),
      supabaseClient.from('mentor_questions').select('*, mentor_video_answers(*)').eq('mentor_id', mentorId)
    ]);

    // Prepare knowledge base entries
    const knowledgeEntries = [];

    // Add bio and expertise
    knowledgeEntries.push({
      content: `Bio: ${bioSummary}\nExpertise: ${expertiseAreas.join(', ')}\nPersonality: ${personalityTraits.join(', ')}`,
      content_type: 'bio',
      metadata: { source: 'profile' }
    });

    knowledgeEntries.push({
      content: `Full bio: ${mentorProfile.full_bio}\nTitle: ${mentorProfile.title}\nExperience: ${mentorProfile.experience}\nEducation: ${mentorProfile.education}`,
      content_type: 'profile',
      metadata: { source: 'mentor_profile' }
    });

    // Add courses
    if (coursesResult.data) {
      coursesResult.data.forEach(course => {
        knowledgeEntries.push({
          content: `Course: ${course.title}\nDescription: ${course.description}\nLevel: ${course.level}\nDuration: ${course.duration}\nPrice: $${course.price}`,
          content_type: 'course',
          metadata: { source: 'course', courseId: course.id }
        });
      });
    }

    // Add reviews for social proof
    if (reviewsResult.data) {
      const reviewsSummary = reviewsResult.data.map(r => 
        `Rating: ${r.rating}/5 - ${r.comment}`
      ).join('\n');
      knowledgeEntries.push({
        content: `Recent reviews:\n${reviewsSummary}`,
        content_type: 'reviews',
        metadata: { source: 'reviews', count: reviewsResult.data.length }
      });
    }

    // Add video answers
    if (questionsResult.data) {
      questionsResult.data.forEach(question => {
        if (question.mentor_video_answers && question.mentor_video_answers.length > 0) {
          knowledgeEntries.push({
            content: `Question: ${question.question_text}\nStatus: ${question.status}\nVideo answer available at: ${question.mentor_video_answers[0].video_url}`,
            content_type: 'video_answer',
            metadata: { source: 'video_answer', questionId: question.id }
          });
        }
      });
    }

    // Generate embeddings for each entry using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const embeddingsPromises = knowledgeEntries.map(async (entry) => {
      try {
        const response = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: entry.content,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Embeddings API error:', response.status, errorText);
          throw new Error(`Embeddings API failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        if (!data || !data.data || !Array.isArray(data.data) || data.data.length === 0) {
          console.error('Invalid embeddings response:', data);
          throw new Error('Invalid embeddings response format');
        }

        return {
          ...entry,
          embedding: data.data[0].embedding,
          avatar_id: avatarId
        };
      } catch (error) {
        console.error('Error generating embedding for entry:', entry.content_type, error);
        throw error;
      }
    });

    const entriesWithEmbeddings = await Promise.all(embeddingsPromises);

    // Delete old knowledge entries
    await supabaseClient
      .from('mentor_avatar_knowledge')
      .delete()
      .eq('avatar_id', avatarId);

    // Insert new knowledge entries
    const { error: insertError } = await supabaseClient
      .from('mentor_avatar_knowledge')
      .insert(entriesWithEmbeddings);

    if (insertError) {
      console.error('Error inserting knowledge:', insertError);
      await supabaseClient
        .from('mentor_avatars')
        .update({ status: 'error' })
        .eq('id', avatarId);

      return new Response(JSON.stringify({ error: 'Failed to create knowledge base' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update avatar status to ready
    await supabaseClient
      .from('mentor_avatars')
      .update({ 
        status: 'ready',
        training_completed_at: new Date().toISOString(),
        last_trained_at: new Date().toISOString()
      })
      .eq('id', avatarId);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Avatar trained successfully',
      knowledgeCount: entriesWithEmbeddings.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in train-avatar function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});