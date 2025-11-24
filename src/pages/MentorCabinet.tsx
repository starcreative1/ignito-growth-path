import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Loader2 } from "lucide-react";

const MentorCabinet = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [mentorProfile, setMentorProfile] = useState<any>(null);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    title: "",
    category: "Business",
    image_url: "",
    price: "",
    bio: "",
    full_bio: "",
    expertise: "",
    languages: "",
    availability: "Available this week",
    experience: "",
    education: "",
    certifications: "",
  });

  useEffect(() => {
    checkAuthAndLoadProfile();
  }, []);

  const checkAuthAndLoadProfile = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please sign in to access this page");
      navigate("/auth");
      return;
    }
    setUser(session.user);

    // Check if user already has a mentor profile
    const { data: profile } = await supabase
      .from("mentor_profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (profile) {
      setMentorProfile(profile);
      setFormData({
        name: profile.name,
        title: profile.title,
        category: profile.category,
        image_url: profile.image_url || "",
        price: profile.price.toString(),
        bio: profile.bio,
        full_bio: profile.full_bio,
        expertise: profile.expertise.join(", "),
        languages: profile.languages.join(", "),
        availability: profile.availability,
        experience: profile.experience,
        education: profile.education,
        certifications: profile.certifications ? profile.certifications.join(", ") : "",
      });
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const mentorData = {
      user_id: user.id,
      name: formData.name,
      title: formData.title,
      category: formData.category,
      image_url: formData.image_url || null,
      price: parseFloat(formData.price),
      bio: formData.bio,
      full_bio: formData.full_bio,
      expertise: formData.expertise.split(",").map(s => s.trim()),
      languages: formData.languages.split(",").map(s => s.trim()),
      availability: formData.availability,
      experience: formData.experience,
      education: formData.education,
      certifications: formData.certifications ? formData.certifications.split(",").map(s => s.trim()) : [],
    };

    if (mentorProfile) {
      const { error } = await supabase
        .from("mentor_profiles")
        .update(mentorData)
        .eq("id", mentorProfile.id);

      if (error) {
        console.error("Error updating mentor profile:", error);
        toast.error("Failed to update mentor profile");
        setSaving(false);
        return;
      }
      toast.success("Mentor profile updated successfully");
    } else {
      const { error } = await supabase
        .from("mentor_profiles")
        .insert(mentorData);

      if (error) {
        console.error("Error creating mentor profile:", error);
        toast.error("Failed to create mentor profile");
        setSaving(false);
        return;
      }
      toast.success("Mentor profile created successfully! Your profile is now live.");
    }

    setSaving(false);
    checkAuthAndLoadProfile();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-32 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-32 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-display">
              {mentorProfile ? "Edit Your Mentor Profile" : "Become a Mentor"}
            </CardTitle>
            <CardDescription>
              {mentorProfile 
                ? "Update your mentor profile information below" 
                : "Share your expertise and help others grow. Fill in your details to create your mentor profile."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="title">Professional Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g. Senior Product Manager"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Business">Business</SelectItem>
                      <SelectItem value="Tech">Tech</SelectItem>
                      <SelectItem value="Creators">Creators</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="price">Session Price (USD) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 150"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="image_url">Profile Image URL</Label>
                <Input
                  id="image_url"
                  type="url"
                  placeholder="https://example.com/your-photo.jpg"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="bio">Short Bio (appears on card) *</Label>
                <Textarea
                  id="bio"
                  placeholder="A brief description of your expertise..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={2}
                  required
                />
              </div>

              <div>
                <Label htmlFor="full_bio">Full Bio *</Label>
                <Textarea
                  id="full_bio"
                  placeholder="Tell potential mentees about your background, experience, and what you can help them with..."
                  value={formData.full_bio}
                  onChange={(e) => setFormData({ ...formData, full_bio: e.target.value })}
                  rows={4}
                  required
                />
              </div>

              <div>
                <Label htmlFor="expertise">Areas of Expertise (comma-separated) *</Label>
                <Input
                  id="expertise"
                  placeholder="e.g. Product Strategy, Team Leadership, Scaling"
                  value={formData.expertise}
                  onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="languages">Languages (comma-separated) *</Label>
                <Input
                  id="languages"
                  placeholder="e.g. English, Spanish, French"
                  value={formData.languages}
                  onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="availability">Availability *</Label>
                <Input
                  id="availability"
                  placeholder="e.g. Available this week, Weekends only"
                  value={formData.availability}
                  onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="experience">Professional Experience *</Label>
                <Input
                  id="experience"
                  placeholder="e.g. 10+ years in product management"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="education">Education *</Label>
                <Input
                  id="education"
                  placeholder="e.g. MBA, Stanford University"
                  value={formData.education}
                  onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="certifications">Certifications (comma-separated)</Label>
                <Input
                  id="certifications"
                  placeholder="e.g. PMP, Certified Scrum Master"
                  value={formData.certifications}
                  onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => navigate("/")}>
                  Cancel
                </Button>
                <Button type="submit" variant="hero" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    mentorProfile ? "Update Profile" : "Create Profile"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MentorCabinet;
