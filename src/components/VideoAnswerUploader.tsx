import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, Video, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface VideoAnswerUploaderProps {
  questionId: string;
  questionText: string;
  onSuccess?: () => void;
}

export const VideoAnswerUploader = ({ questionId, questionText, onSuccess }: VideoAnswerUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("video/")) {
      toast({
        title: "Invalid File",
        description: "Please select a video file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 100MB for 10-minute video)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "Video must be under 100MB (approximately 10 minutes)",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload video to storage
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${questionId}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("mentor-videos")
        .upload(filePath, selectedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("mentor-videos")
        .getPublicUrl(filePath);

      // Create video element to get duration
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = async () => {
        const duration = Math.round(video.duration);

        // Save video answer to database
        const { error: dbError } = await supabase
          .from("mentor_video_answers")
          .insert({
            question_id: questionId,
            video_url: publicUrl,
            video_file_name: fileName,
            duration_seconds: duration,
          });

        if (dbError) throw dbError;

        // Update question status
        const { error: updateError } = await supabase
          .from("mentor_questions")
          .update({ status: "answered" })
          .eq("id", questionId);

        if (updateError) throw updateError;

        toast({
          title: "Video Uploaded!",
          description: "Your video answer has been sent to the user.",
        });

        setSelectedFile(null);
        setUploadProgress(0);
        onSuccess?.();
      };

      video.src = URL.createObjectURL(selectedFile);
    } catch (error) {
      console.error("Error uploading video:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Your Answer</CardTitle>
        <CardDescription className="line-clamp-2">{questionText}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {selectedFile ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Video className="h-5 w-5 text-primary" />
              <span className="flex-1 text-sm truncate">{selectedFile.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFile(null)}
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {isUploading && (
              <Progress value={uploadProgress} className="w-full" />
            )}
            
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Video Answer
                </>
              )}
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
          >
            <Video className="mr-2 h-4 w-4" />
            Select Video File
          </Button>
        )}
        
        <p className="text-xs text-muted-foreground text-center">
          Maximum file size: 100MB (approximately 10 minutes)
        </p>
      </CardContent>
    </Card>
  );
};
