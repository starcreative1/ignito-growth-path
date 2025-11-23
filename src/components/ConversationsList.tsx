import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowRight } from "lucide-react";

interface Conversation {
  id: string;
  mentor_id: string;
  mentor_name: string;
  last_message_at: string;
}

export const ConversationsList = ({ userId }: { userId: string }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) return;
    loadConversations();
  }, [userId]);

  const loadConversations = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .order("last_message_at", { ascending: false });

    if (error) {
      console.error("Error loading conversations:", error);
    } else {
      setConversations(data || []);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages
          </CardTitle>
          <CardDescription>Loading conversations...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Messages
        </CardTitle>
        <CardDescription>Your conversations with mentors</CardDescription>
      </CardHeader>
      <CardContent>
        {conversations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No conversations yet</p>
            <p className="text-sm mt-2">Start chatting with a mentor after booking a session</p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors cursor-pointer"
                onClick={() => navigate(`/messages/${conversation.id}`)}
              >
                <div className="flex-1">
                  <p className="font-semibold">{conversation.mentor_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Last message: {new Date(conversation.last_message_at).toLocaleDateString()}
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};