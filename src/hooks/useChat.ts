import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
  is_read: boolean;
  read_at: string | null;
  delivered_at: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
}

export interface ChatConversation {
  id: string;
  user_id: string;
  mentor_id: string;
  mentor_name: string;
  last_message_at: string | null;
  archived: boolean;
  participant_name: string; // Display name for other participant
}

interface UseChatReturn {
  messages: ChatMessage[];
  conversation: ChatConversation | null;
  loading: boolean;
  sending: boolean;
  connectionStatus: "connected" | "connecting" | "disconnected";
  sendMessage: (content: string) => Promise<boolean>;
  refreshMessages: () => Promise<void>;
}

export function useChat(conversationId: string | undefined, user: User | null): UseChatReturn {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "connecting" | "disconnected">("connecting");

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const processedMessageIds = useRef<Set<string>>(new Set());

  // Load conversation details
  const loadConversation = useCallback(async () => {
    if (!conversationId || !user) return;

    console.log("[Chat] Loading conversation:", conversationId);

    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .maybeSingle();

    if (error) {
      console.error("[Chat] Error loading conversation:", error);
      toast({
        title: "Error",
        description: "Failed to load conversation",
        variant: "destructive",
      });
      return;
    }

    if (!data) {
      console.error("[Chat] Conversation not found");
      return;
    }

    // Check if current user is the mentor by looking up mentor_profiles
    const { data: mentorProfile } = await supabase
      .from("mentor_profiles")
      .select("user_id")
      .eq("id", data.mentor_id)
      .maybeSingle();

    const isMentor = mentorProfile?.user_id === user.id;

    // Determine the other participant's name
    let participantName = data.mentor_name;
    
    // If current user is the mentor, fetch the user's name
    if (isMentor) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.user_id)
        .maybeSingle();
      
      participantName = profileData?.full_name || "User";
    }

    setConversation({
      ...data,
      participant_name: participantName,
    });
  }, [conversationId, user, toast]);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!conversationId) return;

    console.log("[Chat] Loading messages for:", conversationId);

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[Chat] Error loading messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    console.log("[Chat] Loaded", data?.length || 0, "messages");

    // Update processed IDs
    processedMessageIds.current = new Set((data || []).map((m) => m.id));
    setMessages(data || []);
    setLoading(false);
  }, [conversationId, toast]);

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!conversationId || !user) return;

    const { error } = await supabase
      .from("messages")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        delivered_at: new Date().toISOString(),
      })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .is("is_read", false);

    if (error) {
      console.error("[Chat] Error marking messages as read:", error);
    }
  }, [conversationId, user]);

  // Send message
  const sendMessage = useCallback(
    async (content: string): Promise<boolean> => {
      if (!content.trim() || !user || !conversationId || !conversation) {
        return false;
      }

      setSending(true);
      console.log("[Chat] Sending message");

      try {
        // Get sender's name
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();

        const senderName = profileData?.full_name || user.email?.split("@")[0] || "User";

        // Insert message
        const { data: newMessage, error } = await supabase
          .from("messages")
          .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            sender_name: senderName,
            content: content.trim(),
          })
          .select()
          .single();

        if (error) {
          console.error("[Chat] Error sending message:", error);
          toast({
            title: "Error",
            description: "Failed to send message",
            variant: "destructive",
          });
          setSending(false);
          return false;
        }

        console.log("[Chat] Message sent:", newMessage.id);

        // Add to local state immediately
        if (!processedMessageIds.current.has(newMessage.id)) {
          processedMessageIds.current.add(newMessage.id);
          setMessages((prev) => [...prev, newMessage]);
        }

        // Update conversation timestamp
        await supabase
          .from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", conversationId);

        // Send notification to recipient - need to get mentor's user_id from mentor_profiles
        let recipientId = conversation.user_id;
        if (conversation.user_id === user.id) {
          // Current user is the student, get mentor's user_id
          const { data: mentorProfile } = await supabase
            .from("mentor_profiles")
            .select("user_id")
            .eq("id", conversation.mentor_id)
            .maybeSingle();
          recipientId = mentorProfile?.user_id || conversation.mentor_id;
        }

        supabase.functions
          .invoke("send-message-notification", {
            body: {
              messageId: newMessage.id,
              recipientId,
              senderName,
              messageContent: content.trim(),
            },
          })
          .catch((err) => console.error("[Chat] Notification error:", err));

        setSending(false);
        return true;
      } catch (err) {
        console.error("[Chat] Error in sendMessage:", err);
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive",
        });
        setSending(false);
        return false;
      }
    },
    [conversationId, conversation, user, toast]
  );

  // Refresh messages
  const refreshMessages = useCallback(async () => {
    await loadMessages();
    await markAsRead();
  }, [loadMessages, markAsRead]);

  // Set up real-time subscription
  useEffect(() => {
    if (!conversationId || !user) return;

    console.log("[Chat] Setting up realtime for:", conversationId);

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channelName = `chat-${conversationId}-${user.id}-${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          console.log("[Chat] Realtime INSERT:", newMsg.id);

          // Deduplicate
          if (!processedMessageIds.current.has(newMsg.id)) {
            processedMessageIds.current.add(newMsg.id);
            setMessages((prev) => [...prev, newMsg]);

            // Mark as read if from other user and tab is visible
            if (newMsg.sender_id !== user.id && document.visibilityState === "visible") {
              supabase
                .from("messages")
                .update({
                  is_read: true,
                  read_at: new Date().toISOString(),
                  delivered_at: new Date().toISOString(),
                })
                .eq("id", newMsg.id)
                .then(() => console.log("[Chat] Marked as read:", newMsg.id));
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updatedMsg = payload.new as ChatMessage;
          console.log("[Chat] Realtime UPDATE:", updatedMsg.id);
          setMessages((prev) =>
            prev.map((msg) => (msg.id === updatedMsg.id ? updatedMsg : msg))
          );
        }
      )
      .subscribe((status) => {
        console.log("[Chat] Subscription status:", status);
        if (status === "SUBSCRIBED") {
          setConnectionStatus("connected");
        } else if (status === "CHANNEL_ERROR") {
          setConnectionStatus("disconnected");
          // Retry after error
          setTimeout(loadMessages, 3000);
        } else {
          setConnectionStatus("connecting");
        }
      });

    channelRef.current = channel;

    return () => {
      console.log("[Chat] Cleaning up subscription");
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, user, loadMessages]);

  // Initial load
  useEffect(() => {
    if (!conversationId || !user) return;

    loadConversation();
    loadMessages();
    markAsRead();
  }, [conversationId, user, loadConversation, loadMessages, markAsRead]);

  // Reload on tab visibility change
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && conversationId) {
        console.log("[Chat] Tab visible, refreshing");
        loadMessages();
        markAsRead();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [conversationId, loadMessages, markAsRead]);

  return {
    messages,
    conversation,
    loading,
    sending,
    connectionStatus,
    sendMessage,
    refreshMessages,
  };
}
