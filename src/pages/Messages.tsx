import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { ArrowLeft, Send, Check, CheckCheck, Paperclip, X, Download, FileIcon, Smile, Search, Mic } from "lucide-react";
import { User, Session } from "@supabase/supabase-js";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { AudioPlayer } from "@/components/AudioPlayer";

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
  reactions?: Reaction[];
}

interface Conversation {
  id: string;
  user_id: string;
  mentor_id: string;
  mentor_name: string;
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
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

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

  // Search functionality
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const results = messages
      .filter(msg => 
        msg.content.toLowerCase().includes(query.toLowerCase()) ||
        msg.sender_name.toLowerCase().includes(query.toLowerCase())
      )
      .map(msg => msg.id);
    
    setSearchResults(results);
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

  const filteredMessages = searchQuery.trim() 
    ? messages.filter(msg => searchResults.includes(msg.id))
    : messages;

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
      await supabase.functions.invoke("send-message-notification", {
        body: {
          messageId: messageData.id,
          recipientId,
          senderName,
          messageContent,
        },
      });
    } catch (notificationError) {
      console.error("Error sending notification:", notificationError);
      // Don't show error to user as message was sent successfully
    }

    setNewMessage("");
    setSelectedFile(null);
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
            {/* Search bar */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search messages..."
                  className="pl-10"
                />
                {searchQuery && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("");
                        setSearchResults([]);
                      }}
                      className="h-5 w-5 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
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
                filteredMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === user?.id ? "justify-end" : "justify-start"} group`}
                  >
                    <div className="flex flex-col gap-1">
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          message.sender_id === user?.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
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
                      
                      {/* Reactions display */}
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
                    </div>
                  </div>
                ))
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
                    <Button type="submit" disabled={sending || uploading || (!newMessage.trim() && !selectedFile)}>
                      {uploading ? "Uploading..." : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Messages;