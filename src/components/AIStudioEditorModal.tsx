import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Sparkles, Video, CheckCircle2, Play, RefreshCw } from "lucide-react";
import { Label } from "@/components/ui/label";

export function AIStudioEditorModal({ isOpen, onClose, request }: any) {
  const [script, setScript] = useState(request?.instructions || "");
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState(request?.generated_video_url || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRewriteScript = async () => {
    setIsGeneratingScript(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-script', {
        body: { 
          topic: request.topic, 
          format: request.format, 
          context: `Rewrite and polish this script to make it sound perfectly natural for an AI avatar: ${script}` 
        }
      });
      if (error) throw error;
      if (data?.script) {
        setScript(data.script);
        toast.success("Script rewritten successfully");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to rewrite script");
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleGenerateVideo = async () => {
    setIsGeneratingVideo(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-heygen-video', {
        body: { 
          requestId: request.id,
          avatarId: request.avatar_id,
          script: script
        }
      });

      if (error) throw error;
      
      if (data?.video_url) {
        setVideoUrl(data.video_url);
        toast.success("Video generated successfully!");
      } else {
        toast.info("Video generation started. This may take a few minutes. Check back soon.");
      }
    } catch (error: any) {
      console.error("Video generation error:", error);
      toast.error(error.message || "Failed to generate video");
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleSubmitContent = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('ai_content_requests')
        .update({ 
          status: 'completed',
          generated_video_url: videoUrl,
          generated_script: script
        })
        .eq('id', request.id);

      if (error) throw error;
      toast.success("Content delivered to learner successfully!");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Failed to deliver content");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="text-accent" /> AI Studio Editor
          </DialogTitle>
          <DialogDescription>
            Generate and deliver custom AI avatar content for this request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="bg-muted p-4 rounded-md text-sm space-y-2">
            <div className="font-semibold">Request Details:</div>
            <div><span className="text-muted-foreground">Topic:</span> {request.topic}</div>
            <div><span className="text-muted-foreground">Format:</span> {request.format}</div>
            <div><span className="text-muted-foreground">Original Instructions:</span> {request.instructions}</div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Avatar Script</Label>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRewriteScript}
                disabled={isGeneratingScript}
              >
                <Sparkles size={14} className="mr-2 text-accent" />
                {isGeneratingScript ? "Rewriting..." : "AI Polish Script"}
              </Button>
            </div>
            <Textarea 
              value={script} 
              onChange={(e) => setScript(e.target.value)}
              rows={8}
              placeholder="Enter the script the avatar will speak..."
            />
          </div>

          <div className="space-y-3">
            <Label>Video Generation</Label>
            
            {videoUrl ? (
              <div className="space-y-4">
                <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center relative group">
                  <video 
                    src={videoUrl} 
                    controls 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleGenerateVideo} disabled={isGeneratingVideo}>
                    <RefreshCw size={16} className={`mr-2 ${isGeneratingVideo ? 'animate-spin' : ''}`} />
                    Regenerate Video
                  </Button>
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-muted border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-4">
                <Video size={48} className="text-muted-foreground/50" />
                <Button onClick={handleGenerateVideo} disabled={isGeneratingVideo || !script}>
                  {isGeneratingVideo ? (
                    <>
                      <RefreshCw size={16} className="animate-spin mr-2" /> Generating...
                    </>
                  ) : (
                    <>
                      <Play size={16} className="mr-2" /> Generate Video with Avatar
                    </>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground text-center px-8">
                  This will use your selected AI Avatar to generate a video based on the script above.
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            variant="hero" 
            onClick={handleSubmitContent}
            disabled={!videoUrl || isSubmitting}
          >
            <CheckCircle2 size={16} className="mr-2" />
            {isSubmitting ? "Delivering..." : "Deliver Content"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
