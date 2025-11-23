import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { ArrowLeft, Send, Check, CheckCheck, Paperclip, X, Download, FileIcon, Smile, Search, Mic, Trash2, MoreVertical, Edit2, Pin, PinOff, Forward, FileText, Plus, Filter, Calendar, Clock, Reply, CornerDownRight } from "lucide-react";
import jsPDF from "jspdf";
import { User, Session } from "@supabase/supabase-js";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

interface Reaction {
  id: string;
  emoji: string;
  user_id: string;
  count?: number;
  users?: string[];
}

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
  is_read: boolean;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  edited_at?: string | null;
  pinned: boolean;
  reply_to?: string | null;
  reactions?: Reaction[];
}

interface Conversation {
  id: string;
  user_id: string;
  mentor_id: string;
  mentor_name: string;
}

interface MessageTemplate {
  id: string;
  user_id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const Messages = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [presenceChannel, setPresenceChannel] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchSender, setSearchSender] = useState<string>("all");
  const [searchType, setSearchType] = useState<string>("all");
  const [searchDateFrom, setSearchDateFrom] = useState<Date | undefined>();
  const [searchDateTo, setSearchDateTo] = useState<Date | undefined>();
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [availableConversations, setAvailableConversations] = useState<Conversation[]>([]);
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([]);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateContent, setNewTemplateContent] = useState("");
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleTime, setScheduleTime] = useState("12:00");
  const [scheduledMessages, setScheduledMessages] = useState<any[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session?.user) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!conversationId || !user) return;

    loadConversation();
    loadMessages();
    loadMessageTemplates();
    loadScheduledMessages();

    // Mark messages as read
    markMessagesAsRead();

    // Set up presence channel for typing indicators
    const channel = supabase.channel(`presence-${conversationId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const otherUsers = Object.keys(state).filter(key => key !== user.id);
        
        // Check if any other user is typing
        const someoneTyping = otherUsers.some(key => {
          const presences = state[key];
          return presences?.some((p: any) => p.typing === true);
        });
        
        setIsTyping(someoneTyping);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ typing: false });
        }
      });

    setPresenceChannel(channel);

    // Subscribe to message updates
    const messagesChannel = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('New message received:', payload);
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
          scrollToBottom();
          
          // Mark new message as read if it's not from current user
          if (newMessage.sender_id !== user.id) {
            supabase
              .from("messages")
              .update({ is_read: true })
              .eq("id", newMessage.id)
              .then(() => console.log("Message marked as read"));
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
          console.log('Message updated:', payload);
          const updatedMessage = payload.new as Message;
          setMessages(prev => 
            prev.map(msg => 
              msg.id === updatedMessage.id ? updatedMessage : msg
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(messagesChannel);
    };
  }, [conversationId, user]);

  const loadConversation = async () => {
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
  };

  const loadMessages = async () => {
    setLoading(true);
    
    const { data: messagesData, error } = await supabase
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
    } else {
      // Load reactions for all messages
      const messagesWithReactions = await Promise.all(
        (messagesData || []).map(async (msg) => {
          const reactions = await loadReactions(msg.id);
          return { ...msg, reactions };
        })
      );
      setMessages(messagesWithReactions || []);
      setTimeout(scrollToBottom, 100);
    }

    setLoading(false);
  };

  const loadReactions = async (messageId: string): Promise<Reaction[]> => {
    const { data, error } = await supabase
      .from("message_reactions")
      .select("*")
      .eq("message_id", messageId);

    if (error) {
      console.error("Error loading reactions:", error);
      return [];
    }

    // Group reactions by emoji
    const grouped = (data || []).reduce((acc: Record<string, Reaction>, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = {
          id: reaction.emoji,
          emoji: reaction.emoji,
          user_id: reaction.user_id,
          count: 0,
          users: [],
        };
      }
      acc[reaction.emoji].count = (acc[reaction.emoji].count || 0) + 1;
      acc[reaction.emoji].users?.push(reaction.user_id);
      return acc;
    }, {});

    return Object.values(grouped);
  };

  const markMessagesAsRead = async () => {
    if (!user || !conversationId) return;

    const { error } = await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .eq("is_read", false);

    if (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const scrollToBottom = () => {
    const messagesContainer = document.getElementById("messages-container");
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  };

  const handleTyping = () => {
    if (!presenceChannel) return;

    // Update presence to show user is typing
    presenceChannel.track({ typing: true });

    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Set new timeout to stop typing after 2 seconds of inactivity
    const timeout = setTimeout(() => {
      presenceChannel.track({ typing: false });
    }, 2000);

    setTypingTimeout(timeout);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 20MB)
      if (file.size > 20 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 20MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadFile = async (file: File): Promise<{ url: string; name: string; type: string } | null> => {
    if (!conversationId) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${conversationId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('message-attachments')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      toast({
        title: "Upload failed",
        description: uploadError.message,
        variant: "destructive",
      });
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('message-attachments')
      .getPublicUrl(fileName);

    return {
      url: publicUrl,
      name: file.name,
      type: file.type,
    };
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    // Check if user already reacted with this emoji
    const message = messages.find(m => m.id === messageId);
    const existingReaction = message?.reactions?.find(r => 
      r.emoji === emoji && r.users?.includes(user.id)
    );

    if (existingReaction) {
      // Remove reaction
      const { error } = await supabase
        .from("message_reactions")
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", user.id)
        .eq("emoji", emoji);

      if (error) {
        console.error("Error removing reaction:", error);
        return;
      }
    } else {
      // Add reaction
      const { error } = await supabase
        .from("message_reactions")
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji,
        });

      if (error) {
        console.error("Error adding reaction:", error);
        return;
      }
    }

    // Reload reactions for this message
    const reactions = await loadReactions(messageId);
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId ? { ...msg, reactions } : msg
      )
    );
  };

  const handleVoiceRecording = async (audioBlob: Blob) => {
    if (!conversationId) return;

    setUploading(true);
    setIsRecordingVoice(false);

    try {
      // Create a file from the blob
      const fileName = `${conversationId}/${Date.now()}-voice.webm`;
      
      const { error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast({
          title: "Upload failed",
          description: uploadError.message,
          variant: "destructive",
        });
        setUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(fileName);

      // Send message with voice attachment
      await sendVoiceMessage(publicUrl);
    } catch (error) {
      console.error('Error uploading voice message:', error);
      toast({
        title: "Error",
        description: "Failed to upload voice message",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const sendVoiceMessage = async (voiceUrl: string) => {
    if (!user || !conversation) return;

    setSending(true);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    const senderName = profileData?.full_name || user.email?.split("@")[0] || "You";

    const { data: messageData, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        sender_name: senderName,
        content: "Voice message",
        file_url: voiceUrl,
        file_name: "Voice message",
        file_type: "audio/webm",
      })
      .select()
      .single();

    if (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send voice message",
        variant: "destructive",
      });
      setSending(false);
      return;
    }

    // Send notification
    const recipientId = conversation.user_id === user.id 
      ? conversation.mentor_id 
      : conversation.user_id;

    try {
      await supabase.functions.invoke("send-message-notification", {
        body: {
          messageId: messageData.id,
          recipientId,
          senderName,
          messageContent: "Sent a voice message",
        },
      });
    } catch (notificationError) {
      console.error("Error sending notification:", notificationError);
    }

    setSending(false);
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);

      if (error) {
        console.error("Error deleting message:", error);
        toast({
          title: "Error",
          description: "Failed to delete message",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      
      toast({
        title: "Message deleted",
        description: "The message has been deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting message:", error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    } finally {
      setMessageToDelete(null);
    }
  };

  const canEditMessage = (createdAt: string) => {
    const messageTime = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const fifteenMinutes = 15 * 60 * 1000;
    return now - messageTime < fifteenMinutes;
  };

  const handleStartEdit = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditContent(content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editContent.trim()) return;

    try {
      const { error } = await supabase
        .from("messages")
        .update({ 
          content: editContent.trim(),
          edited_at: new Date().toISOString()
        })
        .eq("id", messageId);

      if (error) {
        console.error("Error updating message:", error);
        toast({
          title: "Error",
          description: "Failed to update message",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: editContent.trim(), edited_at: new Date().toISOString() }
          : msg
      ));
      
      toast({
        title: "Message updated",
        description: "The message has been updated successfully",
      });
      
      handleCancelEdit();
    } catch (error) {
      console.error("Error updating message:", error);
      toast({
        title: "Error",
        description: "Failed to update message",
        variant: "destructive",
      });
    }
  };

  const handlePinMessage = async (messageId: string, currentlyPinned: boolean) => {
    try {
      const { error } = await supabase
        .from("messages")
        .update({ pinned: !currentlyPinned })
        .eq("id", messageId);

      if (error) {
        console.error("Error pinning message:", error);
        toast({
          title: "Error",
          description: "Failed to pin message",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, pinned: !currentlyPinned }
          : msg
      ));
      
      toast({
        title: currentlyPinned ? "Message unpinned" : "Message pinned",
        description: currentlyPinned 
          ? "The message has been unpinned" 
          : "The message has been pinned to the top",
      });
    } catch (error) {
      console.error("Error pinning message:", error);
      toast({
        title: "Error",
        description: "Failed to pin message",
        variant: "destructive",
      });
    }
  };

  const loadAvailableConversations = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .neq("id", conversationId);

    if (error) {
      console.error("Error loading conversations:", error);
      return;
    }

    setAvailableConversations(data || []);
  };

  const handleForwardMessage = async (targetConversationId: string) => {
    if (!forwardingMessage || !user) return;

    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      const senderName = profileData?.full_name || user.email?.split("@")[0] || "You";

      // Create the forwarded message
      const { error } = await supabase
        .from("messages")
        .insert({
          conversation_id: targetConversationId,
          sender_id: user.id,
          sender_name: senderName,
          content: forwardingMessage.content,
          file_url: forwardingMessage.file_url,
          file_name: forwardingMessage.file_name,
          file_type: forwardingMessage.file_type,
        });

      if (error) {
        console.error("Error forwarding message:", error);
        toast({
          title: "Error",
          description: "Failed to forward message",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Message forwarded",
        description: "The message has been forwarded successfully",
      });

      setForwardingMessage(null);
    } catch (error) {
      console.error("Error forwarding message:", error);
      toast({
        title: "Error",
        description: "Failed to forward message",
        variant: "destructive",
      });
    }
  };

  const loadMessageTemplates = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("message_templates")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    if (error) {
      console.error("Error loading templates:", error);
      return;
    }

    setMessageTemplates(data || []);
  };

  const handleCreateTemplate = async () => {
    if (!user || !newTemplateName.trim() || !newTemplateContent.trim()) return;

    try {
      const { error } = await supabase
        .from("message_templates")
        .insert({
          user_id: user.id,
          name: newTemplateName.trim(),
          content: newTemplateContent.trim(),
        });

      if (error) {
        console.error("Error creating template:", error);
        toast({
          title: "Error",
          description: "Failed to create template",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Template created",
        description: "Your message template has been saved",
      });

      setNewTemplateName("");
      setNewTemplateContent("");
      setShowTemplateDialog(false);
      loadMessageTemplates();
    } catch (error) {
      console.error("Error creating template:", error);
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from("message_templates")
        .delete()
        .eq("id", templateId);

      if (error) {
        console.error("Error deleting template:", error);
        toast({
          title: "Error",
          description: "Failed to delete template",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Template deleted",
        description: "Your template has been removed",
      });

      loadMessageTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  const handleUseTemplate = (content: string) => {
    setNewMessage(content);
    setShowTemplateManager(false);
  };

  const handleOpenForwardDialog = (message: Message) => {
    setForwardingMessage(message);
    loadAvailableConversations();
  };

  // Search functionality
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    performSearch(query, searchSender, searchType, searchDateFrom, searchDateTo);
  };

  const performSearch = (
    query: string,
    sender: string,
    type: string,
    dateFrom: Date | undefined,
    dateTo: Date | undefined
  ) => {
    if (!query.trim() && sender === "all" && type === "all" && !dateFrom && !dateTo) {
      setSearchResults([]);
      return;
    }

    const results = messages.filter(msg => {
      // Keyword filter
      const matchesKeyword = !query.trim() || 
        msg.content.toLowerCase().includes(query.toLowerCase()) ||
        msg.sender_name.toLowerCase().includes(query.toLowerCase());

      // Sender filter
      const matchesSender = sender === "all" || msg.sender_id === sender;

      // Type filter
      let matchesType = true;
      if (type === "text") {
        matchesType = !msg.file_url;
      } else if (type === "image") {
        matchesType = msg.file_type?.startsWith("image/") || false;
      } else if (type === "file") {
        matchesType = !!msg.file_url && !msg.file_type?.startsWith("image/") && !msg.file_type?.startsWith("audio/");
      } else if (type === "voice") {
        matchesType = msg.file_type?.startsWith("audio/") || false;
      }

      // Date range filter
      const messageDate = new Date(msg.created_at);
      const matchesDateFrom = !dateFrom || messageDate >= dateFrom;
      const matchesDateTo = !dateTo || messageDate <= new Date(dateTo.setHours(23, 59, 59, 999));

      return matchesKeyword && matchesSender && matchesType && matchesDateFrom && matchesDateTo;
    }).map(msg => msg.id);
    
    setSearchResults(results);
  };

  const loadScheduledMessages = async () => {
    if (!user || !conversationId) return;

    const { data, error } = await supabase
      .from("scheduled_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("status", "pending")
      .order("scheduled_for");

    if (error) {
      console.error("Error loading scheduled messages:", error);
      return;
    }

    setScheduledMessages(data || []);
  };

  const handleScheduleMessage = async () => {
    if (!user || !conversation || !newMessage.trim() || !scheduleDate) return;

    const [hours, minutes] = scheduleTime.split(':');
    const scheduledDateTime = new Date(scheduleDate);
    scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // Validate that scheduled time is in the future
    if (scheduledDateTime <= new Date()) {
      toast({
        title: "Invalid schedule time",
        description: "Please select a future date and time",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      const senderName = profileData?.full_name || user.email?.split("@")[0] || "You";

      const { error } = await supabase
        .from("scheduled_messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          sender_name: senderName,
          content: newMessage.trim(),
          file_url: selectedFile ? await uploadAndGetUrl(selectedFile) : null,
          file_name: selectedFile?.name || null,
          file_type: selectedFile?.type || null,
          scheduled_for: scheduledDateTime.toISOString(),
        });

      if (error) {
        console.error("Error scheduling message:", error);
        toast({
          title: "Error",
          description: "Failed to schedule message",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Message scheduled",
        description: `Your message will be sent on ${format(scheduledDateTime, "MMM dd, yyyy 'at' HH:mm")}`,
      });

      setNewMessage("");
      setSelectedFile(null);
      setScheduleDate(undefined);
      setScheduleTime("12:00");
      setShowScheduleDialog(false);
      loadScheduledMessages();
    } catch (error) {
      console.error("Error scheduling message:", error);
      toast({
        title: "Error",
        description: "Failed to schedule message",
        variant: "destructive",
      });
    }
  };

  const uploadAndGetUrl = async (file: File): Promise<string | null> => {
    const fileData = await uploadFile(file);
    return fileData?.url || null;
  };

  const handleCancelScheduledMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("scheduled_messages")
        .update({ status: "cancelled" })
        .eq("id", messageId);

      if (error) {
        console.error("Error cancelling scheduled message:", error);
        toast({
          title: "Error",
          description: "Failed to cancel scheduled message",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Message cancelled",
        description: "The scheduled message has been cancelled",
      });

      loadScheduledMessages();
    } catch (error) {
      console.error("Error cancelling scheduled message:", error);
      toast({
        title: "Error",
        description: "Failed to cancel scheduled message",
        variant: "destructive",
      });
    }
  };

  const getRepliedMessage = (replyToId: string | null | undefined) => {
    if (!replyToId) return null;
    return messages.find(msg => msg.id === replyToId);
  };

  const exportAsCSV = () => {
    if (!conversation) return;
    
    const csvContent = [
      ['Date', 'Time', 'Sender', 'Message'],
      ...messages.map(msg => [
        format(new Date(msg.created_at), 'yyyy-MM-dd'),
        format(new Date(msg.created_at), 'HH:mm:ss'),
        msg.sender_name,
        msg.content
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${conversation.mentor_name}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast({
      title: "Conversation exported",
      description: "Your conversation has been exported as CSV",
    });
  };

  const exportAsPDF = () => {
    if (!conversation) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const lineHeight = 7;
    let yPosition = margin;
    
    // Title
    doc.setFontSize(16);
    doc.text(`Conversation with ${conversation.mentor_name}`, margin, yPosition);
    yPosition += lineHeight * 2;
    
    doc.setFontSize(10);
    messages.forEach((msg) => {
      const dateTime = format(new Date(msg.created_at), 'MMM dd, yyyy HH:mm');
      const header = `${msg.sender_name} - ${dateTime}`;
      
      // Check if we need a new page
      if (yPosition > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      
      doc.setFont(undefined, 'bold');
      doc.text(header, margin, yPosition);
      yPosition += lineHeight;
      
      doc.setFont(undefined, 'normal');
      const lines = doc.splitTextToSize(msg.content, pageWidth - (margin * 2));
      lines.forEach((line: string) => {
        if (yPosition > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += lineHeight;
      });
      
      yPosition += lineHeight * 0.5;
    });
    
    doc.save(`conversation-${conversation.mentor_name}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast({
      title: "Conversation exported",
      description: "Your conversation has been exported as PDF",
    });
  };

  const handleApplyFilters = () => {
    performSearch(searchQuery, searchSender, searchType, searchDateFrom, searchDateTo);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSearchSender("all");
    setSearchType("all");
    setSearchDateFrom(undefined);
    setSearchDateTo(undefined);
    setSearchResults([]);
    setShowAdvancedSearch(false);
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="bg-yellow-300 dark:bg-yellow-600 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const filteredMessages = searchQuery.trim() || searchSender !== "all" || searchType !== "all" || searchDateFrom || searchDateTo
    ? messages.filter(msg => searchResults.includes(msg.id))
    : messages;

  // Get unique senders for filter
  const uniqueSenders = Array.from(new Set(messages.map(msg => ({ id: msg.sender_id, name: msg.sender_name }))))
    .reduce((acc, sender) => {
      if (!acc.find(s => s.id === sender.id)) {
        acc.push(sender);
      }
      return acc;
    }, [] as { id: string; name: string }[]);

  // Separate pinned and unpinned messages
  const pinnedMessages = filteredMessages.filter(msg => msg.pinned);
  const unpinnedMessages = filteredMessages.filter(msg => !msg.pinned);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((!newMessage.trim() && !selectedFile) || !user || !conversation) return;

    setSending(true);
    setUploading(true);

    let fileData = null;
    if (selectedFile) {
      fileData = await uploadFile(selectedFile);
      if (!fileData) {
        setSending(false);
        setUploading(false);
        return;
      }
    }

    setUploading(false);

    setSending(true);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    const senderName = profileData?.full_name || user.email?.split("@")[0] || "You";
    const messageContent = newMessage.trim();

    const { data: messageData, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        sender_name: senderName,
        content: messageContent || (fileData ? "Sent an attachment" : ""),
        file_url: fileData?.url || null,
        file_name: fileData?.name || null,
        file_type: fileData?.type || null,
        reply_to: replyingTo?.id || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      setSending(false);
      return;
    }

    // Stop typing indicator
    if (presenceChannel) {
      presenceChannel.track({ typing: false });
    }
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Send email notification to recipient (mentor or user)
    const recipientId = conversation.user_id === user.id 
      ? conversation.mentor_id 
      : conversation.user_id;

    try {
      // Send email notification
      await supabase.functions.invoke("send-message-notification", {
        body: {
          messageId: messageData.id,
          recipientId,
          senderName,
          messageContent,
        },
      });

      // Send push notification
      await supabase.functions.invoke("send-push-notification", {
        body: {
          recipientId,
          title: `New message from ${senderName}`,
          body: messageContent.substring(0, 100),
          conversationId,
        },
      });
    } catch (notificationError) {
      console.error("Error sending notification:", notificationError);
      // Don't show error to user as message was sent successfully
    }

    setNewMessage("");
    setSelectedFile(null);
    setReplyingTo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container pt-32 px-4">
          <p className="text-center">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <div className="container pt-32 px-4 pb-4 flex-1 flex flex-col max-w-4xl">
        <div className="mb-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        <Card className="flex-1 flex flex-col">
          <CardHeader className="border-b">
            <CardTitle>Chat with {conversation?.mentor_name}</CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Search bar with Export */}
            <div className="p-4 border-b space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search messages..."
                    className="pl-10 pr-20"
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                    {(searchQuery || searchResults.length > 0) && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                      className="h-7 px-2"
                    >
                      <Filter className={`h-3 w-3 ${showAdvancedSearch ? "text-primary" : ""}`} />
                    </Button>
                    {(searchQuery || searchSender !== "all" || searchType !== "all" || searchDateFrom || searchDateTo) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearFilters}
                        className="h-7 w-7 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={exportAsCSV}>
                      Export as CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportAsPDF}>
                      Export as PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

            {/* Scheduled Messages Section */}
            {scheduledMessages.length > 0 && (
              <div className="p-4 border-b bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Clock className="h-4 w-4" />
                  <span>Scheduled Messages ({scheduledMessages.length})</span>
                </div>
                <div className="space-y-2">
                  {scheduledMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="flex items-start gap-2 p-2 bg-background rounded-lg text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(msg.scheduled_for), "MMM dd, yyyy 'at' HH:mm")}
                        </p>
                        <p className="truncate">{msg.content}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelScheduledMessage(msg.id)}
                        className="h-7 px-2 flex-shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

              {/* Advanced Search Filters */}
              {showAdvancedSearch && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Sender</Label>
                    <Select value={searchSender} onValueChange={setSearchSender}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        <SelectItem value="all">All Senders</SelectItem>
                        {uniqueSenders.map((sender) => (
                          <SelectItem key={sender.id} value={sender.id}>
                            {sender.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Message Type</Label>
                    <Select value={searchType} onValueChange={setSearchType}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="text">Text Only</SelectItem>
                        <SelectItem value="image">Images</SelectItem>
                        <SelectItem value="file">Files</SelectItem>
                        <SelectItem value="voice">Voice Messages</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">From Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full h-9 justify-start text-left font-normal">
                          <Calendar className="mr-2 h-4 w-4" />
                          {searchDateFrom ? format(searchDateFrom, "MMM dd, yyyy") : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-background" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={searchDateFrom}
                          onSelect={setSearchDateFrom}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">To Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full h-9 justify-start text-left font-normal">
                          <Calendar className="mr-2 h-4 w-4" />
                          {searchDateTo ? format(searchDateTo, "MMM dd, yyyy") : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-background" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={searchDateTo}
                          onSelect={setSearchDateTo}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="col-span-2">
                    <Button onClick={handleApplyFilters} className="w-full h-9">
                      Apply Filters
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div 
              id="messages-container"
              className="flex-1 overflow-y-auto p-6 space-y-4"
              style={{ maxHeight: "calc(100vh - 400px)" }}
            >
              {filteredMessages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  {searchQuery ? (
                    <p>No messages found matching "{searchQuery}"</p>
                  ) : (
                    <p>No messages yet. Start the conversation!</p>
                  )}
                </div>
              ) : (
                <>
                  {/* Pinned Messages Section */}
                  {pinnedMessages.length > 0 && (
                    <div className="space-y-4 pb-4 mb-4 border-b-2 border-primary/20">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                        <Pin className="h-4 w-4" />
                        <span>Pinned Messages</span>
                      </div>
                      {pinnedMessages.map((message) => {
                  const isEditing = editingMessageId === message.id;
                  const canEdit = message.sender_id === user?.id && canEditMessage(message.created_at) && !message.file_url;
                  const repliedMsg = getRepliedMessage(message.reply_to);

                  return (
                    <div
                      key={message.id}
                      className={`flex gap-2 ${message.sender_id === user?.id ? "justify-end" : "justify-start"} group`}
                    >
                      <div className="flex flex-col gap-1 max-w-[70%]">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="flex-1"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSaveEdit(message.id);
                                } else if (e.key === "Escape") {
                                  handleCancelEdit();
                                }
                              }}
                              autoFocus
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleSaveEdit(message.id)}
                              className="h-8 w-8 flex-shrink-0"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={handleCancelEdit}
                              className="h-8 w-8 flex-shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className={`rounded-lg px-4 py-2 border-2 border-primary/30 ${
                              message.sender_id === user?.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            {/* Show replied message context */}
                            {repliedMsg && (
                              <div className="mb-2 pb-2 border-b border-current/20">
                                <div className="flex items-start gap-1 text-xs opacity-70">
                                  <CornerDownRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium">{repliedMsg.sender_name}</p>
                                    <p className="truncate">{repliedMsg.content || "Attachment"}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            <p className="text-sm font-medium mb-1">{highlightText(message.sender_name, searchQuery)}</p>
                            {message.content && (
                              <p className="text-sm whitespace-pre-wrap">{highlightText(message.content, searchQuery)}</p>
                            )}
                            {message.file_url && (
                              <div className="mt-2">
                                {message.file_type?.startsWith('image/') ? (
                                  <img 
                                    src={message.file_url} 
                                    alt={message.file_name || 'Image attachment'}
                                    className="max-w-full max-h-64 rounded cursor-pointer"
                                    onClick={() => window.open(message.file_url!, '_blank')}
                                  />
                                ) : message.file_type?.startsWith('audio/') ? (
                                  <AudioPlayer audioUrl={message.file_url} className="min-w-[200px]" />
                                ) : (
                                  <a
                                    href={message.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2 bg-background/10 rounded hover:bg-background/20 transition-colors"
                                  >
                                    <FileIcon className="h-4 w-4" />
                                    <span className="text-sm">{message.file_name || 'Download file'}</span>
                                    <Download className="h-3 w-3 ml-auto" />
                                  </a>
                                )}
                              </div>
                            )}
                                <div className="flex items-center gap-1 mt-1">
                                  <p className="text-xs opacity-70">
                                    {new Date(message.created_at).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                    {message.edited_at && " (edited)"}
                                  </p>
                                  {message.sender_id === user?.id && (
                                    <span className="text-xs opacity-70">
                                      {message.is_read ? (
                                        <CheckCheck className="h-3 w-3 inline ml-1" />
                                      ) : (
                                        <Check className="h-3 w-3 inline ml-1" />
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                      
                            {/* Reactions display */}
                            {!isEditing && (
                              <div className="flex items-center gap-1 mt-1">
                                {message.reactions && message.reactions.length > 0 && (
                                  <div className="flex gap-1">
                                    {message.reactions.map((reaction) => (
                                      <button
                                        key={reaction.emoji}
                                        onClick={() => handleReaction(message.id, reaction.emoji)}
                                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                                          reaction.users?.includes(user?.id || '')
                                            ? 'bg-primary/20 border border-primary'
                                            : 'bg-background/10 border border-border'
                                        } hover:bg-background/20 transition-colors`}
                                      >
                                        <span>{reaction.emoji}</span>
                                        <span>{reaction.count}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                                
                                {/* Add reaction button */}
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Smile className="h-3 w-3" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-2">
                                    <div className="flex gap-1">
                                      {EMOJI_OPTIONS.map((emoji) => (
                                        <button
                                          key={emoji}
                                          onClick={() => handleReaction(message.id, emoji)}
                                          className="text-2xl hover:scale-125 transition-transform p-1"
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            )}
                          </div>

                          {/* Message actions dropdown (only for own messages) */}
                          {message.sender_id === user?.id && !isEditing && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handlePinMessage(message.id, message.pinned)}
                            >
                              {message.pinned ? (
                                <>
                                  <PinOff className="h-4 w-4 mr-2" />
                                  Unpin Message
                                </>
                              ) : (
                                <>
                                  <Pin className="h-4 w-4 mr-2" />
                                  Pin Message
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setReplyingTo(message)}
                            >
                              <Reply className="h-4 w-4 mr-2" />
                              Reply to Message
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleOpenForwardDialog(message)}
                            >
                              <Forward className="h-4 w-4 mr-2" />
                              Forward Message
                            </DropdownMenuItem>
                            {canEdit && (
                              <DropdownMenuItem
                                onClick={() => handleStartEdit(message.id, message.content)}
                              >
                                <Edit2 className="h-4 w-4 mr-2" />
                                Edit Message
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => setMessageToDelete(message.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Message
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Regular Messages Section */}
                {unpinnedMessages.map((message) => {
                  const isEditing = editingMessageId === message.id;
                  const canEdit = message.sender_id === user?.id && canEditMessage(message.created_at) && !message.file_url;
                  const repliedMsg = getRepliedMessage(message.reply_to);

                  return (
                    <div
                      key={message.id}
                      className={`flex gap-2 ${message.sender_id === user?.id ? "justify-end" : "justify-start"} group`}
                    >
                      <div className="flex flex-col gap-1 max-w-[70%]">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="flex-1"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSaveEdit(message.id);
                                } else if (e.key === "Escape") {
                                  handleCancelEdit();
                                }
                              }}
                              autoFocus
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleSaveEdit(message.id)}
                              className="h-8 w-8 flex-shrink-0"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={handleCancelEdit}
                              className="h-8 w-8 flex-shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className={`rounded-lg px-4 py-2 ${
                              message.sender_id === user?.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            {/* Show replied message context */}
                            {repliedMsg && (
                              <div className="mb-2 pb-2 border-b border-current/20">
                                <div className="flex items-start gap-1 text-xs opacity-70">
                                  <CornerDownRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium">{repliedMsg.sender_name}</p>
                                    <p className="truncate">{repliedMsg.content || "Attachment"}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            <p className="text-sm font-medium mb-1">{highlightText(message.sender_name, searchQuery)}</p>
                            {message.content && (
                              <p className="text-sm whitespace-pre-wrap">{highlightText(message.content, searchQuery)}</p>
                            )}
                            {message.file_url && (
                              <div className="mt-2">
                                {message.file_type?.startsWith('image/') ? (
                                  <img 
                                    src={message.file_url} 
                                    alt={message.file_name || 'Image attachment'}
                                    className="max-w-full max-h-64 rounded cursor-pointer"
                                    onClick={() => window.open(message.file_url!, '_blank')}
                                  />
                                ) : message.file_type?.startsWith('audio/') ? (
                                  <AudioPlayer audioUrl={message.file_url} className="min-w-[200px]" />
                                ) : (
                                  <a
                                    href={message.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2 bg-background/10 rounded hover:bg-background/20 transition-colors"
                                  >
                                    <FileIcon className="h-4 w-4" />
                                    <span className="text-sm">{message.file_name || 'Download file'}</span>
                                    <Download className="h-3 w-3 ml-auto" />
                                  </a>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-1 mt-1">
                              <p className="text-xs opacity-70">
                                {new Date(message.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                                {message.edited_at && " (edited)"}
                              </p>
                              {message.sender_id === user?.id && (
                                <span className="text-xs opacity-70">
                                  {message.is_read ? (
                                    <CheckCheck className="h-3 w-3 inline ml-1" />
                                  ) : (
                                    <Check className="h-3 w-3 inline ml-1" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      
                        {/* Reactions display */}
                        {!isEditing && (
                          <div className="flex items-center gap-1 mt-1">
                            {message.reactions && message.reactions.length > 0 && (
                              <div className="flex gap-1">
                                {message.reactions.map((reaction) => (
                                  <button
                                    key={reaction.emoji}
                                    onClick={() => handleReaction(message.id, reaction.emoji)}
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                                      reaction.users?.includes(user?.id || '')
                                        ? 'bg-primary/20 border border-primary'
                                        : 'bg-background/10 border border-border'
                                    } hover:bg-background/20 transition-colors`}
                                  >
                                    <span>{reaction.emoji}</span>
                                    <span>{reaction.count}</span>
                                  </button>
                                  ))}
                                </div>
                              )}
                              
                              {/* Add reaction button */}
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Smile className="h-3 w-3" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-2">
                                  <div className="flex gap-1">
                                    {EMOJI_OPTIONS.map((emoji) => (
                                      <button
                                        key={emoji}
                                        onClick={() => handleReaction(message.id, emoji)}
                                        className="text-2xl hover:scale-125 transition-transform p-1"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          )}
                        </div>

                        {/* Message actions dropdown */}
                        {message.sender_id === user?.id && !isEditing && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handlePinMessage(message.id, message.pinned)}
                          >
                            {message.pinned ? (
                              <>
                                <PinOff className="h-4 w-4 mr-2" />
                                Unpin Message
                              </>
                            ) : (
                              <>
                                <Pin className="h-4 w-4 mr-2" />
                                Pin Message
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setReplyingTo(message)}
                          >
                            <Reply className="h-4 w-4 mr-2" />
                            Reply to Message
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleOpenForwardDialog(message)}
                          >
                            <Forward className="h-4 w-4 mr-2" />
                            Forward Message
                          </DropdownMenuItem>
                          {canEdit && (
                            <DropdownMenuItem
                              onClick={() => handleStartEdit(message.id, message.content)}
                            >
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit Message
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => setMessageToDelete(message.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Message
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t">
              {/* Reply context */}
              {replyingTo && (
                <div className="mb-2 flex items-start gap-2 p-2 bg-muted rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <Reply className="h-3 w-3" />
                      <span>Replying to {replyingTo.sender_name}</span>
                    </div>
                    <p className="text-sm truncate">{replyingTo.content || "Attachment"}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplyingTo(null)}
                    className="h-7 w-7 p-0 flex-shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {isRecordingVoice ? (
                <VoiceRecorder
                  onRecordingComplete={handleVoiceRecording}
                  onCancel={() => setIsRecordingVoice(false)}
                />
              ) : (
                <>
                  {selectedFile && (
                    <div className="mb-2 flex items-center gap-2 p-2 bg-muted rounded">
                      <Paperclip className="h-4 w-4" />
                      <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeSelectedFile}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.txt"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={sending || uploading}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowTemplateManager(true)}
                      disabled={sending || uploading}
                      title="Use template"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsRecordingVoice(true)}
                      disabled={sending || uploading}
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                    <Input
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        handleTyping();
                      }}
                      placeholder="Type your message..."
                      disabled={sending || uploading}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowScheduleDialog(true)}
                      disabled={sending || uploading || !newMessage.trim()}
                      title="Schedule message"
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                    <Button type="submit" disabled={sending || uploading || (!newMessage.trim() && !selectedFile)}>
                      {uploading ? "Uploading..." : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Forward Message Dialog */}
        <Dialog open={!!forwardingMessage} onOpenChange={(open) => !open && setForwardingMessage(null)}>
          <DialogContent className="sm:max-w-md bg-background">
            <DialogHeader>
              <DialogTitle>Forward Message</DialogTitle>
              <DialogDescription>
                Select a conversation to forward this message to
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {availableConversations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No other conversations available
                </p>
              ) : (
                availableConversations.map((conv) => (
                  <Button
                    key={conv.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleForwardMessage(conv.id)}
                  >
                    <Forward className="h-4 w-4 mr-2" />
                    Forward to {conv.mentor_name}
                  </Button>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Template Manager Dialog */}
        <Dialog open={showTemplateManager} onOpenChange={setShowTemplateManager}>
          <DialogContent className="sm:max-w-md bg-background">
            <DialogHeader>
              <DialogTitle>Message Templates</DialogTitle>
              <DialogDescription>
                Select a template to use or create a new one
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {messageTemplates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No templates yet. Create your first template!
                </p>
              ) : (
                messageTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-start gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-auto p-0 hover:bg-transparent"
                        onClick={() => handleUseTemplate(template.content)}
                      >
                        <div className="text-left w-full">
                          <p className="font-medium text-sm">{template.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {template.content}
                          </p>
                        </div>
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  setShowTemplateManager(false);
                  setShowTemplateDialog(true);
                }}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Template Dialog */}
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent className="sm:max-w-md bg-background">
            <DialogHeader>
              <DialogTitle>Create Message Template</DialogTitle>
              <DialogDescription>
                Save a frequently used message as a template
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  placeholder="e.g., Thank you message"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-content">Message Content</Label>
                <Textarea
                  id="template-content"
                  placeholder="Enter your message template..."
                  value={newTemplateContent}
                  onChange={(e) => setNewTemplateContent(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowTemplateDialog(false);
                  setNewTemplateName("");
                  setNewTemplateContent("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTemplate}
                disabled={!newTemplateName.trim() || !newTemplateContent.trim()}
              >
                Create Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Schedule Message Dialog */}
        <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
          <DialogContent className="sm:max-w-md bg-background">
            <DialogHeader>
              <DialogTitle>Schedule Message</DialogTitle>
              <DialogDescription>
                Choose when to send this message
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {scheduleDate ? format(scheduleDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-background" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={scheduleDate}
                      onSelect={setScheduleDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule-time">Time</Label>
                <Input
                  id="schedule-time"
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Message Preview:</p>
                <p className="text-sm">{newMessage}</p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowScheduleDialog(false);
                  setScheduleDate(undefined);
                  setScheduleTime("12:00");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleScheduleMessage}
                disabled={!scheduleDate}
              >
                Schedule Message
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation dialog */}
        <AlertDialog open={!!messageToDelete} onOpenChange={() => setMessageToDelete(null)}>
          <AlertDialogContent className="bg-background">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete message?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The message will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => messageToDelete && handleDeleteMessage(messageToDelete)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default Messages;