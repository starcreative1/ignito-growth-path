import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { RecommendationsCard } from "@/components/RecommendationsCard";
import { ConversationsList } from "@/components/ConversationsList";
import { User, Session } from "@supabase/supabase-js";
import { Calendar, Clock, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Profile {
  id: string;
  full_name: string | null;
  interests: string[] | null;
  skill_level: string | null;
  goals: string | null;
}

interface Booking {
  id: string;
  mentor_name: string;
  booking_date: string;
  booking_time: string;
  status: string;
  price: number;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session?.user) {
          navigate("/auth");
        } else {
          setTimeout(() => {
            loadUserData(session.user.id);
          }, 0);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate("/auth");
      } else {
        loadUserData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadUserData = async (userId: string) => {
    setLoading(true);
    
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    
    setProfile(profileData);

    const { data: bookingsData } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", userId)
      .order("booking_date", { ascending: false });
    
    setBookings(bookingsData || []);
    setLoading(false);

    // Load recommendations if profile is complete
    if (profileData?.interests && profileData?.skill_level) {
      loadRecommendations(userId);
    }
  };

  const loadRecommendations = async (userId: string) => {
    setRecommendationsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("recommend-mentors", {
        body: { userId },
      });

      if (error) throw error;

      if (data?.recommendations) {
        setRecommendations(data.recommendations);
      }
    } catch (error: any) {
      console.error("Recommendations error:", error);
      if (error.message?.includes("Rate limit")) {
        toast({
          title: "Rate Limit",
          description: "Too many requests. Please try again in a moment.",
          variant: "destructive",
        });
      } else if (error.message?.includes("credits")) {
        toast({
          title: "Credits Exhausted",
          description: "AI credits exhausted. Please add credits to continue.",
          variant: "destructive",
        });
      }
    } finally {
      setRecommendationsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const interests = formData.get("interests")?.toString().split(",").map(i => i.trim()).filter(Boolean) || [];

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: formData.get("full_name")?.toString(),
        interests,
        skill_level: formData.get("skill_level")?.toString(),
        goals: formData.get("goals")?.toString(),
      })
      .eq("id", user.id);

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
      loadUserData(user.id);
    }
  };

  const upcomingSessions = bookings.filter(b => 
    new Date(b.booking_date) >= new Date() && b.status !== "cancelled"
  );
  
  const pastSessions = bookings.filter(b => 
    new Date(b.booking_date) < new Date() || b.status === "cancelled"
  );

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
            <h1 className="text-4xl font-bold mb-2">My Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {profile?.full_name || user?.email}</p>
          </div>
          <Button onClick={handleSignOut} variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        <Tabs defaultValue="recommendations" className="space-y-6">
          <TabsList>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="sessions">My Sessions</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="profile" id="profile-tab">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="recommendations" className="space-y-6">
            <RecommendationsCard 
              recommendations={recommendations}
              loading={recommendationsLoading}
            />
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            <ConversationsList userId={user?.id || ""} />
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Sessions</CardTitle>
                <CardDescription>Your scheduled mentorship sessions</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingSessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No upcoming sessions</p>
                    <Button className="mt-4" onClick={() => navigate("/mentors")}>
                      Book a Session
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingSessions.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <p className="font-semibold">{booking.mentor_name}</p>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(booking.booking_date).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {booking.booking_time}
                            </span>
                          </div>
                        </div>
                        <Badge>{booking.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Past Sessions</CardTitle>
                <CardDescription>Your booking history</CardDescription>
              </CardHeader>
              <CardContent>
                {pastSessions.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">No past sessions</p>
                ) : (
                  <div className="space-y-4">
                    {pastSessions.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg opacity-60">
                        <div className="space-y-1">
                          <p className="font-semibold">{booking.mentor_name}</p>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(booking.booking_date).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {booking.booking_time}
                            </span>
                          </div>
                        </div>
                        <Badge variant="secondary">{booking.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Update your profile information and preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      defaultValue={profile?.full_name || ""}
                      placeholder="Your name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="interests">Interests (comma-separated)</Label>
                    <Input
                      id="interests"
                      name="interests"
                      defaultValue={profile?.interests?.join(", ") || ""}
                      placeholder="AI, Machine Learning, Web Development"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="skill_level">Skill Level</Label>
                    <Select name="skill_level" defaultValue={profile?.skill_level || ""}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your skill level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="goals">Goals</Label>
                    <Textarea
                      id="goals"
                      name="goals"
                      defaultValue={profile?.goals || ""}
                      placeholder="What are your learning goals?"
                      rows={4}
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    Update Profile
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;