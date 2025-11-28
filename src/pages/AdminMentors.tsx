import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2, ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Navbar from "@/components/Navbar";
import { useUserRole } from "@/hooks/useUserRole";

interface MentorProfile {
  id: string;
  name: string;
  title: string;
  category: string;
  price: number;
  bio: string;
  is_active: boolean;
}

const AdminMentors = () => {
  const [mentors, setMentors] = useState<MentorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingMentor, setEditingMentor] = useState<MentorProfile | null>(null);
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();

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
    checkAuth();
    fetchMentors();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please sign in to access this page");
      navigate("/auth");
      return;
    }
    setUser(session.user);
  };

  // Redirect if not admin
  useEffect(() => {
    if (!roleLoading && !isAdmin && user) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/");
    }
  }, [isAdmin, roleLoading, user, navigate]);

  const fetchMentors = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("mentor_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching mentors:", error);
      toast.error("Failed to load mentors");
    } else {
      setMentors(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("You must be logged in");
      return;
    }

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

    if (editingMentor) {
      const { error } = await supabase
        .from("mentor_profiles")
        .update(mentorData)
        .eq("id", editingMentor.id);

      if (error) {
        console.error("Error updating mentor:", error);
        toast.error("Failed to update mentor");
        return;
      }
      toast.success("Mentor updated successfully");
    } else {
      const { error } = await supabase
        .from("mentor_profiles")
        .insert(mentorData);

      if (error) {
        console.error("Error creating mentor:", error);
        toast.error("Failed to create mentor");
        return;
      }
      toast.success("Mentor created successfully");
    }

    setShowDialog(false);
    setEditingMentor(null);
    resetForm();
    fetchMentors();
  };

  const handleEdit = (mentor: MentorProfile) => {
    setEditingMentor(mentor);
    // Fetch full mentor data
    supabase
      .from("mentor_profiles")
      .select("*")
      .eq("id", mentor.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setFormData({
            name: data.name,
            title: data.title,
            category: data.category,
            image_url: data.image_url || "",
            price: data.price.toString(),
            bio: data.bio,
            full_bio: data.full_bio,
            expertise: data.expertise.join(", "),
            languages: data.languages.join(", "),
            availability: data.availability,
            experience: data.experience,
            education: data.education,
            certifications: data.certifications ? data.certifications.join(", ") : "",
          });
        }
      });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this mentor?")) return;

    const { error } = await supabase
      .from("mentor_profiles")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting mentor:", error);
      toast.error("Failed to delete mentor");
      return;
    }

    toast.success("Mentor deleted successfully");
    fetchMentors();
  };

  const resetForm = () => {
    setFormData({
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
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-32">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-32">
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You do not have permission to access this page. Admin privileges are required.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-32">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-display font-bold">Manage Mentors</h1>
          <Dialog open={showDialog} onOpenChange={(open) => {
            setShowDialog(open);
            if (!open) {
              setEditingMentor(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="h-4 w-4 mr-2" />
                Add Mentor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingMentor ? "Edit Mentor" : "Add New Mentor"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                    <Label htmlFor="price">Price (USD) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="image_url">Image URL</Label>
                  <Input
                    id="image_url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="bio">Short Bio *</Label>
                  <Textarea
                    id="bio"
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
                    value={formData.full_bio}
                    onChange={(e) => setFormData({ ...formData, full_bio: e.target.value })}
                    rows={4}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="expertise">Expertise (comma-separated) *</Label>
                  <Input
                    id="expertise"
                    value={formData.expertise}
                    onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
                    placeholder="e.g. Business Strategy, Scaling, Fundraising"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="languages">Languages (comma-separated) *</Label>
                  <Input
                    id="languages"
                    value={formData.languages}
                    onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                    placeholder="e.g. English, Spanish"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="availability">Availability *</Label>
                  <Input
                    id="availability"
                    value={formData.availability}
                    onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="experience">Experience *</Label>
                  <Input
                    id="experience"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    placeholder="e.g. 15+ years in business strategy"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="education">Education *</Label>
                  <Input
                    id="education"
                    value={formData.education}
                    onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                    placeholder="e.g. MBA, Harvard Business School"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="certifications">Certifications (comma-separated)</Label>
                  <Input
                    id="certifications"
                    value={formData.certifications}
                    onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                    placeholder="e.g. Certified Strategic Planner, Executive Leadership Coach"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setShowDialog(false);
                    setEditingMentor(null);
                    resetForm();
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="hero">
                    {editingMentor ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {mentors.map((mentor) => (
            <Card key={mentor.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{mentor.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{mentor.title}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(mentor)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(mentor.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Category:</span> {mentor.category}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Price:</span> ${mentor.price}/session
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>{" "}
                    <span className={mentor.is_active ? "text-green-600" : "text-red-600"}>
                      {mentor.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-3">{mentor.bio}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {mentors.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">No mentors yet. Add your first mentor to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminMentors;
