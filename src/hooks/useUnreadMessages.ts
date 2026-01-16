import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export function useUnreadMessages(user: User | null) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      // First, get all conversations where user is either the student or mentor
      const { data: mentorProfile } = await supabase
        .from("mentor_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      // Build query for conversations
      let conversationIds: string[] = [];

      // Get conversations where user is the student
      const { data: studentConvs } = await supabase
        .from("conversations")
        .select("id")
        .eq("user_id", user.id)
        .eq("archived", false);

      if (studentConvs) {
        conversationIds = [...conversationIds, ...studentConvs.map(c => c.id)];
      }

      // Get conversations where user is the mentor
      if (mentorProfile) {
        const { data: mentorConvs } = await supabase
          .from("conversations")
          .select("id")
          .eq("mentor_id", mentorProfile.id)
          .eq("archived", false);

        if (mentorConvs) {
          conversationIds = [...conversationIds, ...mentorConvs.map(c => c.id)];
        }
      }

      if (conversationIds.length === 0) {
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      // Get unread messages count across all conversations
      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", conversationIds)
        .eq("is_read", false)
        .neq("sender_id", user.id);

      if (error) {
        console.error("[UnreadMessages] Error fetching count:", error);
      } else {
        setUnreadCount(count || 0);
      }
    } catch (err) {
      console.error("[UnreadMessages] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchUnreadCount();

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channelName = `unread-messages-${user.id}-${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMsg = payload.new as { sender_id: string; is_read: boolean };
          // If message is from someone else and unread, increment count
          if (newMsg.sender_id !== user.id && !newMsg.is_read) {
            console.log("[UnreadMessages] New message received, incrementing count");
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const oldMsg = payload.old as { is_read: boolean; sender_id: string };
          const newMsg = payload.new as { is_read: boolean; sender_id: string };
          
          // If message was marked as read, decrement count
          if (!oldMsg.is_read && newMsg.is_read && newMsg.sender_id !== user.id) {
            console.log("[UnreadMessages] Message marked as read, decrementing count");
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe((status) => {
        console.log("[UnreadMessages] Subscription status:", status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, fetchUnreadCount]);

  // Refresh on tab visibility change
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchUnreadCount();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchUnreadCount]);

  return { unreadCount, loading, refresh: fetchUnreadCount };
}
