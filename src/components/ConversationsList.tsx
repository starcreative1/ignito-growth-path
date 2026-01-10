import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowRight, Archive, ArchiveRestore, MoreVertical, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
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

interface Conversation {
  id: string;
  user_id: string;
  mentor_id: string;
  mentor_name: string;
  user_name?: string;
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    const fetchConversations = async () => {
      setLoading(true);
      
      // Fetch conversations where user is either the user or the mentor
      const { data: conversationsData, error } = await supabase
        .from("conversations")
        .select("*")
        .or(`user_id.eq.${userId},mentor_id.eq.${userId}`)
        .order("last_message_at", { ascending: false });

      if (error) {
        console.error("Error fetching conversations:", error);
        setLoading(false);
        return;
      }

      // Fetch unread message counts and user names for each conversation
      const conversationsWithCounts = await Promise.all(
        (conversationsData || []).map(async (conv) => {
          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .eq("is_read", false)
            .neq("sender_id", userId);

          // Fetch user name if this is a mentor viewing the conversation
          let userName = "User";
          if (conv.mentor_id === userId && conv.user_id) {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", conv.user_id)
              .maybeSingle();
            userName = profileData?.full_name || "User";
          }
          
          // Determine the display name based on current user's role in conversation
          const isMentor = conv.mentor_id === userId;
          const displayName = isMentor ? userName : conv.mentor_name;
          
          return {
            ...conv,
            unread_count: count || 0,
            display_name: displayName,
            is_mentor_view: isMentor,
          };
        })
      );

      setConversations(conversationsWithCounts);
      setLoading(false);
    };

    fetchConversations();

    // Subscribe to realtime updates for new messages
    const channel = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          // Refetch conversations when messages change
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleArchiveConversation = async (conversationId: string, currentlyArchived: boolean, e: React.MouseEvent) => {
    e.stopPropagation();

    const { error } = await supabase
      .from("conversations")
      .update({ 
        archived: !currentlyArchived,
        archived_at: !currentlyArchived ? new Date().toISOString() : null
      })
      .eq("id", conversationId);

    if (error) {
      console.error("Error archiving conversation:", error);
      toast({
        title: "Error",
        description: "Failed to archive conversation",
        variant: "destructive",
      });
      return;
    }

    // Update local state
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, archived: !currentlyArchived, archived_at: !currentlyArchived ? new Date().toISOString() : null }
          : conv
      )
    );

    toast({
      title: currentlyArchived ? "Conversation restored" : "Conversation archived",
      description: currentlyArchived 
        ? "Conversation moved back to active" 
        : "Conversation moved to archive",
    });
  };

  const handleToggleSelect = (conversationId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(conversationId)) {
        newSet.delete(conversationId);
      } else {
        newSet.add(conversationId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (conversationList: Conversation[]) => {
    if (selectedIds.size === conversationList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(conversationList.map(c => c.id)));
    }
  };

  const handleBulkArchive = async (archive: boolean) => {
    const { error } = await supabase
      .from("conversations")
      .update({ 
        archived: archive,
        archived_at: archive ? new Date().toISOString() : null
      })
      .in("id", Array.from(selectedIds));

    if (error) {
      console.error("Error bulk archiving conversations:", error);
      toast({
        title: "Error",
        description: "Failed to update conversations",
        variant: "destructive",
      });
      return;
    }

    setConversations(prev => 
      prev.map(conv => 
        selectedIds.has(conv.id)
          ? { ...conv, archived: archive, archived_at: archive ? new Date().toISOString() : null }
          : conv
      )
    );

    setSelectedIds(new Set());
    toast({
      title: archive ? "Conversations archived" : "Conversations restored",
      description: `${selectedIds.size} conversation(s) updated`,
    });
  };

  const handleBulkDelete = async () => {
    const { error } = await supabase
      .from("conversations")
      .delete()
      .in("id", Array.from(selectedIds));

    if (error) {
      console.error("Error bulk deleting conversations:", error);
      toast({
        title: "Error",
        description: "Failed to delete conversations",
        variant: "destructive",
      });
      return;
    }

    setConversations(prev => prev.filter(conv => !selectedIds.has(conv.id)));
    setSelectedIds(new Set());
    setShowDeleteDialog(false);
    toast({
      title: "Conversations deleted",
      description: `${selectedIds.size} conversation(s) deleted`,
    });
  };

  const activeConversations = conversations.filter(c => !c.archived);
  const archivedConversations = conversations.filter(c => c.archived);

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

  const currentList = activeTab === "active" ? activeConversations : archivedConversations;
  const allSelected = selectedIds.size === currentList.length && currentList.length > 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages
          </CardTitle>
          <CardDescription>Your conversations with mentors</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as "active" | "archived"); setSelectedIds(new Set()); }}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="active">
                Active ({activeConversations.length})
              </TabsTrigger>
              <TabsTrigger value="archived">
                Archived ({archivedConversations.length})
              </TabsTrigger>
            </TabsList>

            {currentList.length > 0 && (
              <div className="flex items-center justify-between mb-4 p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => handleSelectAll(currentList)}
                  />
                  <span className="text-sm font-medium">
                    {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
                  </span>
                </div>
                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkArchive(activeTab === "active")}
                    >
                      {activeTab === "active" ? (
                        <>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </>
                      ) : (
                        <>
                          <ArchiveRestore className="h-4 w-4 mr-2" />
                          Restore
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            )}

            <TabsContent value="active">
            {activeConversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active conversations</p>
                <p className="text-sm mt-2">Start chatting with a mentor after booking a session</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className="flex items-center gap-3 p-4 border rounded-lg hover:bg-accent/5 transition-colors group"
                  >
                    <Checkbox
                      checked={selectedIds.has(conversation.id)}
                      onCheckedChange={() => handleToggleSelect(conversation.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => navigate(`/messages/${conversation.id}`)}
                    >
                      <p className="font-semibold">{conversation.display_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {conversation.is_mentor_view ? "Student" : "Mentor"} • Last message: {new Date(conversation.last_message_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {conversation.unread_count > 0 && (
                        <div className="flex items-center justify-center h-6 min-w-[24px] px-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                          {conversation.unread_count}
                        </div>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => handleArchiveConversation(conversation.id, false, e)}>
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/messages/${conversation.id}`)}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="archived">
            {archivedConversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No archived conversations</p>
                <p className="text-sm mt-2">Archived conversations will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {archivedConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className="flex items-center gap-3 p-4 border rounded-lg hover:bg-accent/5 transition-colors group opacity-70"
                  >
                    <Checkbox
                      checked={selectedIds.has(conversation.id)}
                      onCheckedChange={() => handleToggleSelect(conversation.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => navigate(`/messages/${conversation.id}`)}
                    >
                      <p className="font-semibold">{conversation.display_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {conversation.is_mentor_view ? "Student" : "Mentor"} • Archived: {conversation.archived_at ? new Date(conversation.archived_at).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => handleArchiveConversation(conversation.id, true, e)}>
                            <ArchiveRestore className="h-4 w-4 mr-2" />
                            Restore
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/messages/${conversation.id}`)}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>

    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete conversations?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete {selectedIds.size} conversation(s) and all associated messages. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};