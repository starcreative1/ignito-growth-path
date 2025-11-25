import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MentorProfile {
  id: string;
  name: string;
  title: string;
  category: string;
  bio: string;
  full_bio: string;
  price: number;
  expertise: string[];
  languages: string[];
  availability: string;
  experience: string;
  education: string;
  certifications: string[];
  image_url: string | null;
}

interface MentorProfileEditorProps {
  profile: MentorProfile | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const MentorProfileEditor = ({ profile, onSubmit }: MentorProfileEditorProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mentor Profile Settings</CardTitle>
        <CardDescription>Update your mentor profile information</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name*</Label>
              <Input
                id="name"
                name="name"
                defaultValue={profile?.name || ""}
                placeholder="John Doe"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="title">Professional Title*</Label>
              <Input
                id="title"
                name="title"
                defaultValue={profile?.title || ""}
                placeholder="Senior Software Engineer"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category*</Label>
              <Select name="category" defaultValue={profile?.category || ""} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Business">Business</SelectItem>
                  <SelectItem value="Tech">Tech</SelectItem>
                  <SelectItem value="Creators">Creators</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Hourly Rate ($)*</Label>
              <Input
                id="price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                defaultValue={profile?.price || ""}
                placeholder="100"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Short Bio* (Max 200 characters)</Label>
            <Textarea
              id="bio"
              name="bio"
              defaultValue={profile?.bio || ""}
              placeholder="A brief introduction about yourself..."
              maxLength={200}
              rows={2}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_bio">Full Bio*</Label>
            <Textarea
              id="full_bio"
              name="full_bio"
              defaultValue={profile?.full_bio || ""}
              placeholder="Tell your story, share your expertise and what makes you unique..."
              rows={6}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expertise">Areas of Expertise* (comma-separated)</Label>
              <Input
                id="expertise"
                name="expertise"
                defaultValue={profile?.expertise?.join(", ") || ""}
                placeholder="JavaScript, React, Node.js"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="languages">Languages* (comma-separated)</Label>
              <Input
                id="languages"
                name="languages"
                defaultValue={profile?.languages?.join(", ") || ""}
                placeholder="English, Spanish, French"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="availability">Availability*</Label>
            <Input
              id="availability"
              name="availability"
              defaultValue={profile?.availability || ""}
              placeholder="Mon-Fri, 9 AM - 5 PM EST"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience">Professional Experience*</Label>
            <Textarea
              id="experience"
              name="experience"
              defaultValue={profile?.experience || ""}
              placeholder="10+ years in software development..."
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="education">Education*</Label>
            <Textarea
              id="education"
              name="education"
              defaultValue={profile?.education || ""}
              placeholder="BS in Computer Science from MIT"
              rows={2}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="certifications">Certifications (comma-separated)</Label>
            <Input
              id="certifications"
              name="certifications"
              defaultValue={profile?.certifications?.join(", ") || ""}
              placeholder="AWS Certified, PMP, Google Analytics"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">Profile Image URL</Label>
            <Input
              id="image_url"
              name="image_url"
              type="url"
              defaultValue={profile?.image_url || ""}
              placeholder="https://example.com/your-photo.jpg"
            />
          </div>

          <Button type="submit" className="w-full">
            {profile ? "Update Profile" : "Create Profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
