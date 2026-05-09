import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProfilePhotoUploadProps {
  currentPhotoUrl?: string | null;
  onPhotoUpdate: (url: string) => void;
  userId: string;
  fallbackText: string;
}

export const ProfilePhotoUpload = ({
  currentPhotoUrl,
  onPhotoUpdate,
  userId,
  fallbackText,
}: ProfilePhotoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(currentPhotoUrl);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      setPhotoUrl(publicUrl);
      onPhotoUpdate(publicUrl);
      toast.success('Profile photo updated successfully');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <input
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        disabled={uploading}
        className="hidden"
        id="photo-upload"
      />
      <label
        htmlFor="photo-upload"
        className="group relative cursor-pointer rounded-full"
      >
        <Avatar className="w-36 h-36 sm:w-40 sm:h-40 ring-4 ring-background shadow-lg ring-offset-2 ring-offset-primary/20 transition-transform group-hover:scale-[1.02]">
          <AvatarImage
            src={photoUrl || undefined}
            alt="Profile photo"
            className="object-cover"
          />
          <AvatarFallback className="text-3xl bg-gradient-to-br from-primary/20 to-accent/20 text-foreground font-semibold">
            {fallbackText}
          </AvatarFallback>
        </Avatar>
        <div className="absolute inset-0 rounded-full bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white pointer-events-none">
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <Camera className="h-6 w-6" />
              <span className="text-xs font-medium mt-1">Change photo</span>
            </>
          )}
        </div>
      </label>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        asChild
      >
        <label htmlFor="photo-upload" className="cursor-pointer">
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Camera className="mr-2 h-4 w-4" />
              {photoUrl ? "Change photo" : "Upload photo"}
            </>
          )}
        </label>
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        Square images work best. JPG, PNG or WEBP. Max 5MB.
      </p>
    </div>
  );
};
