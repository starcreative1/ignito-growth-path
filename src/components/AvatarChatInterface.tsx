import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Loader2, Calendar, Video, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface AvatarChatInterfaceProps {
  avatarId: string;
  mentorId?: string;
  onBookingClick?: () => void;
}

export const AvatarChatInterface = ({ avatarId, mentorId, onBookingClick }: AvatarChatInterfaceProps) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<any>(null);
  const [mentor, setMentor] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAvatarData();
    initializeConversation();
  }, [avatarId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchAvatarData = async () => {
    const { data: avatarData } = await supabase
      .from('mentor_avatars')
      .select('*, mentor_profiles(*)')
      .eq('id', avatarId)
      .single();

    if (avatarData) {
      setAvatar(avatarData);
      setMentor(avatarData.mentor_profiles);
    }
  };

  const initializeConversation = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check for existing conversation
    const { data: existingConv } = await supabase
      .from('avatar_conversations')
      .select('id')
      .eq('user_id', user.id)
      .eq('avatar_id', avatarId)
      .maybeSingle();

    if (existingConv) {
      setConversationId(existingConv.id);
      loadMessages(existingConv.id);
    } else {
      // Create new conversation
      const { data: newConv, error } = await supabase
        .from('avatar_conversations')
        .insert({
          user_id: user.id,
          avatar_id: avatarId
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating conversation:", error);
        toast.error("Failed to start conversation");
      } else {
        setConversationId(newConv.id);
        // Send welcome message
        sendWelcomeMessage(newConv.id);
      }
    }
  };

  const loadMessages = async (convId: string) => {
    const { data, error } = await supabase
      .from('avatar_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Error loading messages:", error);
    } else if (data) {
      setMessages(data.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        created_at: msg.created_at
      })));
    }
  };

  const sendWelcomeMessage = async (convId: string) => {
    const welcomeMessage = `Hi! I'm ${avatar?.avatar_name || 'your AI assistant'}. I'm here to help answer your questions and guide you. What would you like to know?`;
    
    const { data } = await supabase
      .from('avatar_messages')
      .insert({
        conversation_id: convId,
        role: 'assistant',
        content: welcomeMessage
      })
      .select()
      .single();

    if (data) {
      setMessages([{
        id: data.id,
        role: 'assistant' as const,
        content: data.content,
        created_at: data.created_at
      }]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    if (!input.trim() || !conversationId || isLoading) return;

    const userMessage = input.trim();
    const tempMsgId = Date.now().toString();
    setInput("");
    setIsLoading(true);

    try {
      // Add user message to UI
      const tempUserMsg: Message = {
        id: tempMsgId,
        role: 'user',
        content: userMessage,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, tempUserMsg]);

      // Call chat-with-avatar edge function
      const { data, error } = await supabase.functions.invoke('chat-with-avatar', {
        body: {
          avatarId,
          conversationId,
          message: userMessage
        }
      });

      if (error) throw error;

      // Refresh messages from database to get the actual saved messages
      await loadMessages(conversationId);

    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message", {
        description: error instanceof Error ? error.message : "Please try again"
      });
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.id !== tempMsgId));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookSession = () => {
    if (onBookingClick) {
      onBookingClick();
    } else if (mentorId) {
      navigate(`/mentors/${mentorId}#booking`);
    }
  };

  const handleViewVideos = () => {
    if (mentorId) {
      navigate(`/my-questions?mentor=${mentorId}`);
    }
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={avatar?.photo_urls?.[0] || mentor?.image_url} />
            <AvatarFallback>
              <Bot />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg">{avatar?.avatar_name || 'AI Assistant'}</CardTitle>
            <p className="text-sm text-muted-foreground">{mentor?.name}</p>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Online
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={message.id || index}
            className={`flex items-start gap-3 ${
              message.role === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            <Avatar className="h-8 w-8 flex-shrink-0">
              {message.role === 'user' ? (
                <>
                  <AvatarFallback>
                    <User size={18} />
                  </AvatarFallback>
                </>
              ) : (
                <>
                  <AvatarImage src={avatar?.photo_urls?.[0]} />
                  <AvatarFallback>
                    <Bot size={18} />
                  </AvatarFallback>
                </>
              )}
            </Avatar>
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={avatar?.photo_urls?.[0]} />
              <AvatarFallback>
                <Bot size={18} />
              </AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-lg p-3">
              <Loader2 className="animate-spin" size={18} />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </CardContent>

      {/* Quick Actions */}
      <div className="px-4 py-2 border-t bg-muted/30">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBookSession}
            className="text-xs"
          >
            <Calendar size={14} className="mr-1" />
            Book Session
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewVideos}
            className="text-xs"
          >
            <Video size={14} className="mr-1" />
            Video Answers
          </Button>
          {mentor && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/mentors/${mentorId}`)}
              className="text-xs"
            >
              <BookOpen size={14} className="mr-1" />
              View Profile
            </Button>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask me anything..."
            disabled={isLoading}
          />
          <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Send size={18} />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};
