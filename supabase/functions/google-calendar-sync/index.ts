import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error("Token refresh error:", data);
      return null;
    }
    return data;
  } catch (error) {
    console.error("Failed to refresh token:", error);
    return null;
  }
}

async function getCalendarEvents(accessToken: string, calendarId: string): Promise<any[]> {
  const now = new Date();
  const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: twoWeeksLater.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error.message || "Failed to fetch calendar events");
  }

  return data.items || [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { mentorId, action } = await req.json();

    if (!mentorId) {
      throw new Error("Mentor ID is required");
    }

    // Verify the authenticated user owns this mentor profile
    const { data: mentorProfile, error: mentorError } = await supabaseAuth
      .from("mentor_profiles")
      .select("id")
      .eq("id", mentorId)
      .eq("user_id", user.id)
      .single();

    if (mentorError || !mentorProfile) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - you do not own this mentor profile" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get calendar connection
    const { data: connection, error: connError } = await supabase
      .from("mentor_calendar_connections")
      .select("*")
      .eq("mentor_id", mentorId)
      .single();

    if (connError || !connection) {
      throw new Error("No calendar connection found");
    }

    if (!connection.sync_enabled) {
      return new Response(
        JSON.stringify({ message: "Sync is disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if token needs refresh
    let accessToken = connection.access_token;
    const tokenExpiry = new Date(connection.token_expires_at);
    
    if (tokenExpiry < new Date()) {
      console.log("Refreshing expired token...");
      const newTokens = await refreshAccessToken(connection.refresh_token);
      
      if (!newTokens) {
        throw new Error("Failed to refresh access token. Please reconnect your calendar.");
      }

      accessToken = newTokens.access_token;
      const newExpiry = new Date(Date.now() + newTokens.expires_in * 1000);

      await supabase
        .from("mentor_calendar_connections")
        .update({
          access_token: accessToken,
          token_expires_at: newExpiry.toISOString(),
        })
        .eq("mentor_id", mentorId);
    }

    // Fetch calendar events
    const calendarId = connection.calendar_id || "primary";
    const events = await getCalendarEvents(accessToken, calendarId);

    // Process events - find busy times
    const busySlots: { date: string; start_time: string; end_time: string }[] = [];
    
    for (const event of events) {
      if (!event.start?.dateTime || !event.end?.dateTime) continue;
      
      const start = new Date(event.start.dateTime);
      const end = new Date(event.end.dateTime);
      
      const startHour = start.getHours();
      const endHour = end.getHours();
      
      if (startHour >= 8 && endHour <= 20) {
        busySlots.push({
          date: start.toISOString().split("T")[0],
          start_time: start.toTimeString().slice(0, 8),
          end_time: end.toTimeString().slice(0, 8),
        });
      }
    }

    // Update last sync time
    await supabase
      .from("mentor_calendar_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("mentor_id", mentorId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        eventsImported: events.length,
        busySlotsFound: busySlots.length,
        message: `Found ${busySlots.length} busy time slots from ${events.length} calendar events`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Calendar sync error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
