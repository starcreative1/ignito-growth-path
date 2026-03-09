import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Bot, FileVideo, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AIContentRequestFormProps {
  mentorId: string;
  avatarId: string;
  price: number;
}

export function AIContentRequestForm({ mentorId, avatarId, price }: AIContentRequestFormProps) {
  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState("");
  const [instructions, setInstructions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  const handleAutoGenerateScript = async () => {
    if (!topic || !format) {
      toast.error("Please provide a topic and format first");
      return;
    }
    
    setIsGeneratingScript(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-script', {
        body: { topic, format, context: "Generate a draft script for an AI avatar video." }
      });
      
      if (error) throw error;
      
      if (data?.script) {
        setInstructions(data.script);
        toast.success("Draft script generated successfully!");
      }
    } catch (error) {
      console.error("Script generation error:", error);
      toast.error("Failed to generate script. Please try manually.");
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic || !format || !instructions) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to request content");
        return;
      }

      // Step 1: Create request record
      const { data: request, error: dbError } = await supabase
        .from('ai_content_requests')
        .insert({
          learner_id: session.user.id,
          mentor_id: mentorId,
          avatar_id: avatarId,
          topic,
          format,
          instructions,
          price,
          status: 'pending'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Step 2: Proceed to payment (Stripe Checkout)
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-ai-content-checkout', {
        body: { requestId: request.id, price, mentorId }
      });

      if (checkoutError) throw checkoutError;
      if (checkoutData?.url) {
        window.location.href = checkoutData.url;
      }
    } catch (error: any) {
      console.error("Submission error:", error);
      toast.error(error.message || "Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-accent/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="text-accent" />
          Request Custom AI Avatar Content
        </CardTitle>
        <CardDescription>
          Get personalized video content delivered by the mentor's AI Avatar. 
          Price: ${price}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="topic">Topic / Subject</Label>
            <Input 
              id="topic" 
              placeholder="e.g., Marketing Strategy for Startups" 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="format">Format</Label>
            <Select disabled={isSubmitting} value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue placeholder="Select format..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shoutout">Shoutout / Greeting</SelectItem>
                <SelectItem value="explainer">Explainer Video</SelectItem>
                <SelectItem value="feedback">Feedback / Review</SelectItem>
                <SelectItem value="lecture">Mini Lecture (5 mins)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="instructions">Script / Instructions</Label>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                className="h-8 text-xs text-accent"
                onClick={handleAutoGenerateScript}
                disabled={isGeneratingScript || !topic || !format}
              >
                <Sparkles size={14} className="mr-1" />
                {isGeneratingScript ? "Generating..." : "Auto-generate draft"}
              </Button>
            </div>
            <Textarea 
              id="instructions" 
              placeholder="Provide the exact script or detailed instructions for the AI avatar..." 
              rows={6}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <Button type="submit" className="w-full" variant="hero" disabled={isSubmitting}>
            <FileVideo size={18} className="mr-2" />
            {isSubmitting ? "Processing..." : `Request Content for $${price}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
