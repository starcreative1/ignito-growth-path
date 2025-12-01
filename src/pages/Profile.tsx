import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [profile, setProfile] = useState({
    full_name: "",
    avatar_url: "",
    goals: "",
    interests: [] as string[],
    skill_level: "",
    preferred_language: "",
  });

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    setUserId(user.id);
    loadProfile(user.id);
  };

  const loadProfile = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          full_name: data.full_name || "",
          avatar_url: data.avatar_url || "",
          goals: data.goals || "",
          interests: data.interests || [],
          skill_level: data.skill_level || "",
          preferred_language: data.preferred_language || "",
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpdate = async (url: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", userId);

      if (error) throw error;

      setProfile({ ...profile, avatar_url: url });
    } catch (error) {
      console.error("Error updating photo:", error);
      toast.error("Failed to update profile photo");
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          goals: profile.goals,
          interests: profile.interests,
          skill_level: profile.skill_level,
          preferred_language: profile.preferred_language,
        })
        .eq("id", userId);

      if (error) throw error;

      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-24">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
            <CardDescription>
              Manage your profile information and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ProfilePhotoUpload
              currentPhotoUrl={profile.avatar_url}
              onPhotoUpdate={handlePhotoUpdate}
              userId={userId}
              fallbackText={profile.full_name?.charAt(0).toUpperCase() || "U"}
            />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) =>
                    setProfile({ ...profile, full_name: e.target.value })
                  }
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="skill_level">Skill Level</Label>
                <Input
                  id="skill_level"
                  value={profile.skill_level}
                  onChange={(e) =>
                    setProfile({ ...profile, skill_level: e.target.value })
                  }
                  placeholder="e.g., Beginner, Intermediate, Advanced"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="goals">Learning Goals</Label>
                <Textarea
                  id="goals"
                  value={profile.goals}
                  onChange={(e) =>
                    setProfile({ ...profile, goals: e.target.value })
                  }
                  placeholder="What do you want to achieve?"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferred_language">Preferred Language</Label>
                <Input
                  id="preferred_language"
                  value={profile.preferred_language}
                  onChange={(e) =>
                    setProfile({ ...profile, preferred_language: e.target.value })
                  }
                  placeholder="e.g., English"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
              <Button variant="outline" onClick={() => navigate("/")} className="flex-1">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
