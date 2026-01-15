import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowRight, Archive, ArchiveRestore, MoreVertical, Trash2, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Badge } from "@/components/ui/badge";

interface Conversation {
  id: string;
  user_id: string;
  mentor_id: string;
  mentor_name: string;
  last_message_at: string;
  unread_count: number;
  archived: boolean;
  archived_at: string | null;
  display_name: string;
  is_mentor_view: boolean;
}

export const ConversationsList = ({ userId }: { userId: string }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchConversations = async () => {
    if (!userId) return;
    
    setLoading(true);

    // First, check if the current user is a mentor and get their mentor_profile id
    const { data: mentorProfile } = await supabase
      .from("mentor_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    const mentorProfileId = mentorProfile?.id;

    // Build the filter: user_id matches OR mentor_id matches (for mentors)
    let query = supabase
      .from("conversations")
      .select("*")
      .order("last_message_at", { ascending: false });

    if (mentorProfileId) {
      // User is a mentor - show conversations where they are the student OR the mentor
      query = query.or(`user_id.eq.${userId},mentor_id.eq.${mentorProfileId}`);
    } else {
      // User is not a mentor - only show conversations where they are the student
      query = query.eq("user_id", userId);
    }

    const { data: conversationsData, error } = await query;

    if (error) {
      console.error("Error fetching conversations:", error);
      setLoading(false);
      return;
    }

    // Fetch unread counts and participant names
    const conversationsWithDetails = await Promise.all(
      (conversationsData || []).map(async (conv) => {
        // Get unread count
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .eq("is_read", false)
          .neq("sender_id", userId);

        // Check if current user is the mentor by looking up mentor_profiles
        const { data: mentorProfile } = await supabase
          .from("mentor_profiles")
          .select("user_id")
          .eq("id", conv.mentor_id)
          .maybeSingle();

        const isMentorView = mentorProfile?.user_id === userId;

        // Get display name for other participant
        let displayName = conv.mentor_name;
        
        if (isMentorView) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", conv.user_id)
            .maybeSingle();
          displayName = profileData?.full_name || "User";
        }

        return {
          ...conv,
          unread_count: count || 0,
          display_name: displayName,
          is_mentor_view: isMentorView,
        };
      })
    );

    setConversations(conversationsWithDetails);
    setLoading(false);
  };

  useEffect(() => {
    fetchConversations();

    // Subscribe to message changes
    const channel = supabase
      .channel("conversations-list-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleArchive = async (conversationId: string, currentlyArchived: boolean, e: React.MouseEvent) => {
    e.stopPropagation();

    const { error } = await supabase
      .from("conversations")
      .update({
        archived: !currentlyArchived,
        archived_at: !currentlyArchived ? new Date().toISOString() : null,
      })
      .eq("id", conversationId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update conversation",
        variant: "destructive",
      });
      return;
    }

    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId
          ? { ...conv, archived: !currentlyArchived, archived_at: !currentlyArchived ? new Date().toISOString() : null }
          : conv
      )
    );

    toast({
      title: currentlyArchived ? "Conversation restored" : "Conversation archived",
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", deleteId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
      return;
    }

    setConversations((prev) => prev.filter((conv) => conv.id !== deleteId));
    setDeleteId(null);
    toast({ title: "Conversation deleted" });
  };

  const activeConversations = conversations.filter((c) => !c.archived);
  const archivedConversations = conversations.filter((c) => c.archived);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const ConversationItem = ({ conversation }: { conversation: Conversation }) => (
    <div
      className="flex items-center gap-3 p-4 border rounded-lg hover:bg-accent/5 transition-colors group cursor-pointer"
      onClick={() => navigate(`/messages/${conversation.id}`)}
    >
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-sm font-semibold text-primary">
          {conversation.display_name.charAt(0).toUpperCase()}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold truncate">{conversation.display_name}</p>
          {conversation.unread_count > 0 && (
            <Badge className="shrink-0">{conversation.unread_count}</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {conversation.is_mentor_view ? "Student" : "Mentor"} •{" "}
          {conversation.last_message_at
            ? new Date(conversation.last_message_at).toLocaleDateString()
            : "No messages yet"}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => handleArchive(conversation.id, conversation.archived, e)}>
              {conversation.archived ? (
                <>
                  <ArchiveRestore className="h-4 w-4 mr-2" />
                  Restore
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteId(conversation.id);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="sm">
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages
          </CardTitle>
          <CardDescription>Your conversations</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "archived")}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="active">Active ({activeConversations.length})</TabsTrigger>
              <TabsTrigger value="archived">Archived ({archivedConversations.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              {activeConversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active conversations</p>
                  <p className="text-sm mt-2">Start a conversation with a mentor</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeConversations.map((conversation) => (
                    <ConversationItem key={conversation.id} conversation={conversation} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="archived">
              {archivedConversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No archived conversations</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {archivedConversations.map((conversation) => (
                    <ConversationItem key={conversation.id} conversation={conversation} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all messages. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
