import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { MentorStatsCard } from "@/components/MentorStatsCard";
import { MentorBookingsCard } from "@/components/MentorBookingsCard";
import { MentorProfileEditor } from "@/components/MentorProfileEditor";
import { MentorAvailabilityManager } from "@/components/MentorAvailabilityManager";
import { ConversationsList } from "@/components/ConversationsList";
import { NotificationSettings } from "@/components/NotificationSettings";
import { AvatarManagementTab } from "@/components/AvatarManagementTab";
import { MentorProductsTab } from "@/components/MentorProductsTab";
import { User } from "@supabase/supabase-js";
import { LogOut, Settings, ShoppingBag } from "lucide-react";

interface MentorProfile {
  id: string;
  user_id: string;
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
  rating: number | null;
  review_count: number | null;
  username: string | null;
}

interface Booking {
  id: string;
  user_email: string;
  booking_date: string;
  booking_time: string;
  status: string;
  price: number;
}

interface TimeSlot {
  id: string;
  date: string;
  time: string;
  is_available: boolean;
}

const MentorCabinet = () => {
  const [user, setUser] = useState<User | null>(null);
  const [mentorProfile, setMentorProfile] = useState<MentorProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }
    
    setUser(session.user);
    loadMentorData(session.user.id);
  };

  const loadMentorData = async (userId: string) => {
    setLoading(true);

    // Load mentor profile
    const { data: profileData } = await supabase
      .from("mentor_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    setMentorProfile(profileData);

    if (profileData) {
      // Load bookings for this mentor
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("*")
        .eq("mentor_id", profileData.id)
        .order("booking_date", { ascending: false });

      setBookings(bookingsData || []);

      // Load time slots
      const { data: slotsData } = await supabase
        .from("mentor_time_slots")
        .select("*")
        .eq("mentor_id", profileData.id)
        .order("date", { ascending: true });

      setTimeSlots(slotsData || []);
    }

    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const expertise = formData.get("expertise")?.toString().split(",").map(e => e.trim()).filter(Boolean) || [];
    const languages = formData.get("languages")?.toString().split(",").map(l => l.trim()).filter(Boolean) || [];
    const certifications = formData.get("certifications")?.toString().split(",").map(c => c.trim()).filter(Boolean) || [];

    const profileData = {
      user_id: user.id,
      name: formData.get("name")?.toString() || "",
      title: formData.get("title")?.toString() || "",
      category: formData.get("category")?.toString() || "",
      bio: formData.get("bio")?.toString() || "",
      full_bio: formData.get("full_bio")?.toString() || "",
      price: parseFloat(formData.get("price")?.toString() || "0"),
      expertise,
      languages,
      availability: formData.get("availability")?.toString() || "",
      experience: formData.get("experience")?.toString() || "",
      education: formData.get("education")?.toString() || "",
      certifications,
      image_url: formData.get("image_url")?.toString() || null,
      username: formData.get("username")?.toString().toLowerCase().replace(/[^a-z0-9_-]/g, "") || null,
    };

    if (mentorProfile) {
      // Update existing profile
      const { error } = await supabase
        .from("mentor_profiles")
        .update(profileData)
        .eq("id", mentorProfile.id);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
        loadMentorData(user.id);
      }
    } else {
      // Create new profile
      const { error } = await supabase
        .from("mentor_profiles")
        .insert(profileData);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Mentor profile created successfully",
        });
        loadMentorData(user.id);
      }
    }
  };

  const upcomingBookings = bookings.filter(b => 
    new Date(b.booking_date) >= new Date() && b.status !== "cancelled"
  );
  
  const pastBookings = bookings.filter(b => 
    new Date(b.booking_date) < new Date() || b.status === "cancelled"
  );

  const totalEarnings = bookings
    .filter(b => b.status === "confirmed")
    .reduce((sum, b) => sum + Number(b.price), 0);

  const uniqueStudents = new Set(bookings.map(b => b.user_email)).size;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container pt-32 px-4">
          <p className="text-center">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container pt-32 px-4 pb-16">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Mentor Cabinet</h1>
            <p className="text-muted-foreground">
              Welcome back, {mentorProfile?.name || user?.email}
            </p>
          </div>
          <Button onClick={handleSignOut} variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {mentorProfile && (
          <div className="mb-6">
            <MentorStatsCard
              totalEarnings={totalEarnings}
              totalStudents={uniqueStudents}
              averageRating={mentorProfile.rating || 0}
              upcomingSessions={upcomingBookings.length}
            />
          </div>
        )}

        <Tabs defaultValue={mentorProfile ? "overview" : "profile"} className="space-y-6">
          <TabsList>
            {mentorProfile && <TabsTrigger value="overview">Overview</TabsTrigger>}
            <TabsTrigger value="profile">Profile</TabsTrigger>
            {mentorProfile && <TabsTrigger value="avatar">AI Avatar</TabsTrigger>}
            {mentorProfile && (
              <TabsTrigger value="shop">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Shop
              </TabsTrigger>
            )}
            {mentorProfile && <TabsTrigger value="availability">Availability</TabsTrigger>}
            {mentorProfile && <TabsTrigger value="sessions">Sessions</TabsTrigger>}
            {mentorProfile && <TabsTrigger value="messages">Messages</TabsTrigger>}
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {mentorProfile && (
            <TabsContent value="overview" className="space-y-6">
              <MentorBookingsCard bookings={upcomingBookings} type="upcoming" />
            </TabsContent>
          )}

          <TabsContent value="profile">
            <MentorProfileEditor 
              profile={mentorProfile}
              onSubmit={handleProfileSubmit}
              userId={user?.id || ""}
            />
          </TabsContent>

          {mentorProfile && (
            <TabsContent value="avatar">
              <AvatarManagementTab mentorId={mentorProfile.id} />
            </TabsContent>
          )}

          {mentorProfile && (
            <TabsContent value="shop">
              <MentorProductsTab
                mentorId={mentorProfile.id}
                mentorUsername={mentorProfile.username}
                mentorName={mentorProfile.name}
              />
            </TabsContent>
          )}

          {mentorProfile && (
            <>
              <TabsContent value="availability">
                <MentorAvailabilityManager
                  mentorId={mentorProfile.id}
                  timeSlots={timeSlots}
                  onUpdate={() => loadMentorData(user?.id || "")}
                />
              </TabsContent>

              <TabsContent value="sessions" className="space-y-6">
                <MentorBookingsCard bookings={upcomingBookings} type="upcoming" />
                <MentorBookingsCard bookings={pastBookings} type="past" />
              </TabsContent>

              <TabsContent value="messages">
                <ConversationsList userId={user?.id || ""} />
              </TabsContent>
            </>
          )}

          <TabsContent value="settings">
            <NotificationSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MentorCabinet;
