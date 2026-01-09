import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";

export interface Message {
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

export interface Conversation {
  id: string;
  user_id: string;
  mentor_id: string;
  mentor_name: string;
  last_message_at: string | null;
}

interface UseMessagesReturn {
  messages: Message[];
  conversation: Conversation | null;
  loading: boolean;
  sending: boolean;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  sendMessage: (content: string) => Promise<boolean>;
  loadMessages: () => Promise<void>;
}

export function useMessages(conversationId: string | undefined, user: User | null): UseMessagesReturn {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const messageIdsRef = useRef<Set<string>>(new Set());

  // Load conversation details
  const loadConversation = useCallback(async () => {
    if (!conversationId) return;

    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .maybeSingle();

    if (error) {
      console.error("Error loading conversation:", error);
      toast({
        title: "Error",
        description: "Failed to load conversation",
        variant: "destructive",
      });
      return;
    }

    setConversation(data);
  }, [conversationId, toast]);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!conversationId) return;

    console.log("[Messages] Loading messages for conversation:", conversationId);
    
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    console.log("[Messages] Loaded", data?.length || 0, "messages");
    
    // Update message IDs set for deduplication
    messageIdsRef.current = new Set(data?.map(m => m.id) || []);
    setMessages(data || []);
    setLoading(false);
  }, [conversationId, toast]);

  // Mark messages as read
  const markMessagesAsRead = useCallback(async () => {
    if (!conversationId || !user) return;

    await supabase
      .from("messages")
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString(),
        delivered_at: new Date().toISOString()
      })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .is("is_read", false);
  }, [conversationId, user]);

  // Send message
  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    if (!content.trim() || !user || !conversationId || !conversation) {
      return false;
    }

    setSending(true);
    console.log("[Messages] Sending message:", content.substring(0, 50));

    try {
      // Get sender name
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
        console.error("Error sending message:", error);
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive",
        });
        setSending(false);
        return false;
      }

      console.log("[Messages] Message sent successfully:", newMessage.id);

      // Add to local state immediately (optimistic update)
      if (!messageIdsRef.current.has(newMessage.id)) {
        messageIdsRef.current.add(newMessage.id);
        setMessages(prev => [...prev, newMessage]);
      }

      // Update conversation last_message_at
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);

      // Send notification to recipient
      const recipientId = conversation.user_id === user.id 
        ? conversation.mentor_id 
        : conversation.user_id;

      supabase.functions.invoke("send-message-notification", {
        body: {
          messageId: newMessage.id,
          recipientId,
          senderName,
          messageContent: content.trim(),
        },
      }).catch(err => console.error("Notification error:", err));

      setSending(false);
      return true;
    } catch (err) {
      console.error("Error in sendMessage:", err);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      setSending(false);
      return false;
    }
  }, [conversationId, conversation, user, toast]);

  // Set up real-time subscription
  useEffect(() => {
    if (!conversationId || !user) return;

    console.log("[Messages] Setting up realtime subscription for:", conversationId);

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channelName = `messages-${conversationId}-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log("[Messages] Realtime INSERT:", payload.new.id);
          const newMsg = payload.new as Message;
          
          // Deduplicate using ref
          if (!messageIdsRef.current.has(newMsg.id)) {
            messageIdsRef.current.add(newMsg.id);
            setMessages(prev => [...prev, newMsg]);
            
            // Mark as read if from other user
            if (newMsg.sender_id !== user.id) {
              supabase
                .from("messages")
                .update({ 
                  is_read: true, 
                  read_at: new Date().toISOString(),
                  delivered_at: new Date().toISOString()
                })
                .eq("id", newMsg.id)
                .then(() => console.log("[Messages] Marked as read:", newMsg.id));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log("[Messages] Realtime UPDATE:", payload.new.id);
          const updatedMsg = payload.new as Message;
          setMessages(prev => 
            prev.map(msg => msg.id === updatedMsg.id ? updatedMsg : msg)
          );
        }
      )
      .subscribe((status) => {
        console.log("[Messages] Subscription status:", status);
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
          // Retry connection after error
          setTimeout(() => loadMessages(), 2000);
        } else {
          setConnectionStatus('connecting');
        }
      });

    channelRef.current = channel;

    return () => {
      console.log("[Messages] Cleaning up subscription");
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
    markMessagesAsRead();
  }, [conversationId, user, loadConversation, loadMessages, markMessagesAsRead]);

  // Reload on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && conversationId) {
        console.log("[Messages] Tab visible, refreshing messages");
        loadMessages();
        markMessagesAsRead();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [conversationId, loadMessages, markMessagesAsRead]);

  return {
    messages,
    conversation,
    loading,
    sending,
    connectionStatus,
    sendMessage,
    loadMessages,
  };
}
