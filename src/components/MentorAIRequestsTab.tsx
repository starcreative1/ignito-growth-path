import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Video, Check, X, FileText } from "lucide-react";
import { AIStudioEditorModal } from "./AIStudioEditorModal";

interface AIRequest {
  id: string;
  topic: string;
  format: string;
  instructions: string;
  price: number;
  status: string;
  created_at: string;
  learner_id: string;
  avatar_id: string;
  profiles: {
    full_name: string;
  };
}

export function MentorAIRequestsTab({ mentorId }: { mentorId: string }) {
  const [requests, setRequests] = useState<AIRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<AIRequest | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [mentorId]);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ai_content_requests")
      .select(`
        *,
        profiles:learner_id (full_name)
      `)
      .eq("mentor_id", mentorId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to load requests");
    } else {
      setRequests(data as any);
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from("ai_content_requests")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Request ${newStatus} successfully`);
      fetchRequests();
    }
  };

  if (loading) return <p>Loading requests...</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">AI Content Requests</h2>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Video size={48} className="mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No AI content requests yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((req) => (
            <Card key={req.id}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{req.topic}</h3>
                      <Badge variant={req.status === 'pending' ? 'secondary' : req.status === 'accepted' ? 'default' : 'outline'}>
                        {req.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">From: {req.profiles?.full_name || 'Anonymous'}</p>
                    <div className="flex gap-4 text-sm mt-2">
                      <span className="flex items-center gap-1"><FileText size={14}/> {req.format}</span>
                      <span className="font-medium text-green-600">${req.price}</span>
                    </div>
                    <div className="mt-4 p-3 bg-muted rounded-md text-sm">
                      <strong>Instructions:</strong>
                      <p className="mt-1 whitespace-pre-wrap">{req.instructions}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 min-w-[140px]">
                    {req.status === 'pending' && (
                      <>
                        <Button 
                          onClick={() => handleUpdateStatus(req.id, 'accepted')}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          <Check size={16} className="mr-1" /> Accept
                        </Button>
                        <Button 
                          onClick={() => handleUpdateStatus(req.id, 'rejected')}
                          variant="destructive" className="w-full"
                        >
                          <X size={16} className="mr-1" /> Reject
                        </Button>
                      </>
                    )}
                    {(req.status === 'accepted' || req.status === 'in_progress') && (
                      <Button 
                        onClick={() => setSelectedRequest(req)}
                        className="w-full" variant="hero"
                      >
                        <Video size={16} className="mr-1" /> Open AI Studio
                      </Button>
                    )}
                    {req.status === 'completed' && (
                      <Button disabled variant="outline" className="w-full">
                        Delivered
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedRequest && (
        <AIStudioEditorModal
          isOpen={!!selectedRequest}
          onClose={() => {
            setSelectedRequest(null);
            fetchRequests();
          }}
          request={selectedRequest}
        />
      )}
    </div>
  );
}
