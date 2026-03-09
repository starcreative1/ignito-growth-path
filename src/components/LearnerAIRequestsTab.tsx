import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Video, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AIRequest {
  id: string;
  topic: string;
  format: string;
  instructions: string;
  price: number;
  status: string;
  created_at: string;
  generated_video_url: string;
  generated_script: string;
  mentor_profiles: {
    name: string;
  };
}

export function LearnerAIRequestsTab({ userId }: { userId: string }) {
  const [requests, setRequests] = useState<AIRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchRequests();
    }
  }, [userId]);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ai_content_requests")
      .select(`
        *,
        mentor_profiles:mentor_id (name)
      `)
      .eq("learner_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to load requests");
    } else {
      setRequests(data as any);
    }
    setLoading(false);
  };

  if (loading) return <p>Loading requests...</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My AI Content Requests</h2>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Video size={48} className="mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">You haven't requested any AI content yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((req) => (
            <Card key={req.id}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{req.topic}</h3>
                      <Badge variant={req.status === 'completed' ? 'default' : 'secondary'}>
                        {req.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Mentor: {req.mentor_profiles?.name}</p>
                    <div className="flex gap-4 text-sm mt-2">
                      <span className="flex items-center gap-1"><FileText size={14}/> {req.format}</span>
                      <span className="font-medium text-primary">${req.price}</span>
                    </div>

                    {req.status === 'completed' && req.generated_video_url && (
                      <div className="mt-4 space-y-4">
                        <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                          <video 
                            src={req.generated_video_url} 
                            controls 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button variant="outline" asChild>
                          <a href={req.generated_video_url} download target="_blank" rel="noreferrer">
                            <Download size={16} className="mr-2" /> Download Video
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
