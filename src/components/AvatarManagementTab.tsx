import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Sparkles, Eye, RefreshCw, Plus } from "lucide-react";
import { AvatarCreationWizard } from "./AvatarCreationWizard";
import { AvatarChatInterface } from "./AvatarChatInterface";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AvatarManagementTabProps {
  mentorId: string;
}

export const AvatarManagementTab = ({ mentorId }: AvatarManagementTabProps) => {
  const [avatar, setAvatar] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchAvatar();
  }, [mentorId]);

  const fetchAvatar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('mentor_avatars')
      .select('*')
      .eq('mentor_id', mentorId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching avatar:", error);
    } else {
      setAvatar(data);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge variant="default" className="bg-green-500">Ready</Badge>;
      case 'training':
        return <Badge variant="secondary" className="animate-pulse">Training...</Badge>;
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (showWizard) {
    return (
      <div>
        <Button
          variant="outline"
          onClick={() => setShowWizard(false)}
          className="mb-4"
        >
          ← Back
        </Button>
        <AvatarCreationWizard
          mentorId={mentorId}
          existingAvatar={avatar}
          onSuccess={() => {
            fetchAvatar();
            setShowWizard(false);
            toast.success("Avatar updated successfully!");
          }}
        />
      </div>
    );
  }

  if (showPreview && avatar) {
    return (
      <div>
        <Button
          variant="outline"
          onClick={() => setShowPreview(false)}
          className="mb-4"
        >
          ← Back to Dashboard
        </Button>
        <AvatarChatInterface avatarId={avatar.id} mentorId={mentorId} />
      </div>
    );
  }

  if (!avatar) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mb-4">
            <Bot className="text-accent" size={40} />
          </div>
          <CardTitle>Create Your AI Avatar</CardTitle>
          <CardDescription className="max-w-2xl mx-auto">
            Set up an AI-powered version of yourself that can interact with students 24/7. 
            Your avatar will answer questions, recommend your content, and help users book sessions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">📸 Upload Photos</h4>
              <p className="text-sm text-muted-foreground">1-5 photos to personalize your avatar</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">🎤 Voice Sample</h4>
              <p className="text-sm text-muted-foreground">Optional voice for natural conversations</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">🧠 AI Training</h4>
              <p className="text-sm text-muted-foreground">Trained on your expertise and content</p>
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              variant="hero"
              size="lg"
              onClick={() => setShowWizard(true)}
              className="w-full max-w-md"
            >
              <Sparkles className="mr-2" />
              Create AI Avatar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center">
                {avatar.photo_urls?.[0] ? (
                  <img 
                    src={avatar.photo_urls[0]} 
                    alt="Avatar" 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <Bot className="text-accent" size={32} />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CardTitle>{avatar.avatar_name || 'Your AI Avatar'}</CardTitle>
                  {getStatusBadge(avatar.status)}
                </div>
                <CardDescription>{avatar.bio_summary}</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(true)}
                disabled={avatar.status !== 'ready'}
              >
                <Eye size={16} className="mr-2" />
                Test Chat
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWizard(true)}
              >
                <RefreshCw size={16} className="mr-2" />
                Update
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold mb-2">Expertise Areas</h4>
              <div className="flex flex-wrap gap-2">
                {avatar.expertise_areas?.map((area: string, index: number) => (
                  <Badge key={index} variant="secondary">{area}</Badge>
                ))}
              </div>
            </div>
            {avatar.personality_traits && avatar.personality_traits.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Personality Traits</h4>
                <div className="flex flex-wrap gap-2">
                  {avatar.personality_traits.map((trait: string, index: number) => (
                    <Badge key={index} variant="outline">{trait}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {avatar.status === 'ready' && (
            <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
              <p className="text-sm">
                ✨ Your AI avatar is live! Users can now chat with your AI assistant on your profile page.
              </p>
            </div>
          )}

          {avatar.status === 'training' && (
            <div className="p-4 bg-muted border border-border rounded-lg">
              <p className="text-sm">
                🔄 Your avatar is being trained. This usually takes 2-5 minutes. We'll notify you when it's ready.
              </p>
            </div>
          )}

          {avatar.status === 'error' && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">
                ❌ There was an error training your avatar. Please try updating it again.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Card */}
      {avatar.status === 'ready' && (
        <Card>
          <CardHeader>
            <CardTitle>Avatar Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">Coming Soon</div>
                <p className="text-sm text-muted-foreground">Total Conversations</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">Coming Soon</div>
                <p className="text-sm text-muted-foreground">Bookings Generated</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">Coming Soon</div>
                <p className="text-sm text-muted-foreground">Avg Response Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
