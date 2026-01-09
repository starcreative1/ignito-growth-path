import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import { ChatHeader } from "@/components/messaging/ChatHeader";
import { MessageList } from "@/components/messaging/MessageList";
import { MessageInput } from "@/components/messaging/MessageInput";
import { useMessages } from "@/hooks/useMessages";

const Messages = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  // Auth check
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const {
    messages,
    conversation,
    loading,
    sending,
    connectionStatus,
    sendMessage,
  } = useMessages(conversationId, user);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        <ChatHeader 
          conversation={conversation} 
          connectionStatus={connectionStatus} 
        />
        
        <MessageList
          messages={messages}
          currentUserId={user.id}
          loading={loading}
        />
        
        <MessageInput
          onSend={sendMessage}
          sending={sending}
          disabled={!conversation}
        />
      </div>
    </div>
  );
};

export default Messages;
