import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { CreatorStatsCard } from "@/components/CreatorStatsCard";
import { CreatorBookingsCard } from "@/components/CreatorBookingsCard";
import { CreatorProfileEditor } from "@/components/CreatorProfileEditor";
import { WeeklyAvailabilityEditor } from "@/components/WeeklyAvailabilityEditor";
import { GoogleCalendarSync } from "@/components/GoogleCalendarSync";
import { AvailabilitySummary } from "@/components/AvailabilitySummary";
import { ConversationsList } from "@/components/ConversationsList";
import { NotificationSettings } from "@/components/NotificationSettings";
import { AvatarManagementTab } from "@/components/AvatarManagementTab";
import { CreatorProductsTab } from "@/components/CreatorProductsTab";
import { CreatorSalesTab } from "@/components/CreatorSalesTab";
import { CreatorQuestionsTab } from "@/components/CreatorQuestionsTab";
import { ProfileCompletenessCard, QuickActionsCard, NoProfileEmptyState } from "@/components/CreatorOverviewWidgets";
import { User } from "@supabase/supabase-js";
import { LogOut, Settings, ShoppingBag, Receipt, MessageCircle, LayoutDashboard, User as UserIcon, Bot, CalendarClock, HelpCircle, CalendarDays, MessageSquare } from "lucide-react";

interface CreatorProfile {
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

const CreatorCabinet = () => {
  const [user, setUser] = useState<User | null>(null);
  const [mentorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAvatar, setHasAvatar] = useState(false);
  const [hasAvailability, setHasAvailability] = useState(false);
  const [hasProducts, setHasProducts] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || (mentorProfile ? "overview" : "profile");

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

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
    loadCreatorData(session.user.id);
  };

  const loadCreatorData = async (userId: string) => {
    setLoading(true);

    // Load mentor profile
    const { data: profileData } = await supabase
      .from("mentor_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    setCreatorProfile(profileData);

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

      // Load completeness signals in parallel
      const [{ data: avatarRow }, { count: availCount }, { count: productCount }] = await Promise.all([
        supabase.from("mentor_avatars").select("id").eq("mentor_id", profileData.id).limit(1).maybeSingle(),
        (supabase as any).from("mentor_weekly_availability").select("id", { count: "exact", head: true }).eq("mentor_id", profileData.id),
        supabase.from("mentor_products").select("id", { count: "exact", head: true }).eq("mentor_id", profileData.id),
      ]);
      setHasAvatar(Boolean(avatarRow));
      setHasAvailability((availCount || 0) > 0);
      setHasProducts((productCount || 0) > 0);
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
        loadCreatorData(user.id);
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
          description: "Creator profile created successfully",
        });
        loadCreatorData(user.id);
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
      <div className="container pt-24 sm:pt-32 px-3 sm:px-4 pb-16">
        {/* Mobile-friendly header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-4xl font-bold mb-1 sm:mb-2 truncate">Creator Cabinet</h1>
            <p className="text-sm sm:text-base text-muted-foreground truncate">
              Welcome back, {mentorProfile?.name || user?.email}
            </p>
          </div>
          <Button onClick={handleSignOut} variant="outline" size="sm" className="self-start sm:self-auto shrink-0">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {mentorProfile && (
          <div className="mb-4 sm:mb-6">
            <CreatorStatsCard
              totalEarnings={totalEarnings}
              totalStudents={uniqueStudents}
              averageRating={mentorProfile.rating || 0}
              upcomingSessions={upcomingBookings.length}
            />
          </div>
        )}

        {!mentorProfile && (
          <NoProfileEmptyState onStart={() => handleTabChange("profile")} />
        )}

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 sm:space-y-6">
          {/* Scrollable tabs for mobile, wraps on desktop */}
          <div className="w-full overflow-x-auto scrollbar-none border-b -mx-3 sm:mx-0 px-3 sm:px-0">
            <TabsList className="inline-flex h-auto p-1 w-max sm:w-full sm:flex-wrap sm:justify-start gap-1">
              {mentorProfile && (
                <TabsTrigger value="overview" className="px-3 py-2 text-xs sm:text-sm">
                  <LayoutDashboard className="h-4 w-4 mr-1.5 sm:mr-2" />
                  <span className="hidden xs:inline">Overview</span>
                  <span className="xs:hidden">Home</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="profile" className="px-3 py-2 text-xs sm:text-sm">
                <UserIcon className="h-4 w-4 mr-1.5 sm:mr-2" />
                Profile
              </TabsTrigger>
              {mentorProfile && (
                <TabsTrigger value="avatar" className="px-3 py-2 text-xs sm:text-sm">
                  <Bot className="h-4 w-4 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">AI Avatar</span>
                  <span className="sm:hidden">Avatar</span>
                </TabsTrigger>
              )}
              {mentorProfile && (
                <TabsTrigger value="shop" className="px-3 py-2 text-xs sm:text-sm">
                  <ShoppingBag className="h-4 w-4 mr-1.5 sm:mr-2" />
                  Shop
                </TabsTrigger>
              )}
              {mentorProfile && (
                <TabsTrigger value="sales" className="px-3 py-2 text-xs sm:text-sm">
                  <Receipt className="h-4 w-4 mr-1.5 sm:mr-2" />
                  Sales
                </TabsTrigger>
              )}
              {mentorProfile && (
                <TabsTrigger value="availability" className="px-3 py-2 text-xs sm:text-sm">
                  <CalendarClock className="h-4 w-4 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">Availability</span>
                  <span className="sm:hidden">Slots</span>
                </TabsTrigger>
              )}
              {mentorProfile && (
                <TabsTrigger value="questions" className="px-3 py-2 text-xs sm:text-sm">
                  <HelpCircle className="h-4 w-4 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">Questions</span>
                  <span className="sm:hidden">Q&A</span>
                </TabsTrigger>
              )}
              {mentorProfile && (
                <TabsTrigger value="sessions" className="px-3 py-2 text-xs sm:text-sm">
                  <CalendarDays className="h-4 w-4 mr-1.5 sm:mr-2" />
                  Sessions
                </TabsTrigger>
              )}
              {mentorProfile && (
                <TabsTrigger value="messages" className="px-3 py-2 text-xs sm:text-sm">
                  <MessageSquare className="h-4 w-4 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">Messages</span>
                  <span className="sm:hidden">Chat</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="settings" className="px-3 py-2 text-xs sm:text-sm">
                <Settings className="h-4 w-4 mr-1.5 sm:mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>
          </div>

          {mentorProfile && (
            <TabsContent value="overview" className="space-y-6">
              {(() => {
                const isComplete =
                  Boolean(mentorProfile.name && mentorProfile.bio && mentorProfile.image_url && mentorProfile.expertise?.length) &&
                  Boolean(mentorProfile.username) &&
                  hasAvailability && hasAvatar && hasProducts;
                return isComplete ? (
                  <QuickActionsCard username={mentorProfile.username} onNavigate={handleTabChange} />
                ) : (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <ProfileCompletenessCard
                      profile={mentorProfile}
                      hasAvatar={hasAvatar}
                      hasAvailability={hasAvailability}
                      hasProducts={hasProducts}
                      onNavigate={handleTabChange}
                    />
                    <QuickActionsCard username={mentorProfile.username} onNavigate={handleTabChange} />
                  </div>
                );
              })()}
              <CreatorBookingsCard bookings={upcomingBookings} type="upcoming" />
            </TabsContent>
          )}

          <TabsContent value="profile">
            <CreatorProfileEditor 
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
              <CreatorProductsTab
                mentorId={mentorProfile.id}
                mentorUsername={mentorProfile.username}
                mentorName={mentorProfile.name}
              />
            </TabsContent>
          )}

          {mentorProfile && (
            <TabsContent value="sales">
              <CreatorSalesTab mentorId={mentorProfile.id} />
            </TabsContent>
          )}

          {mentorProfile && (
            <>
              <TabsContent value="availability" className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <WeeklyAvailabilityEditor mentorId={mentorProfile.id} />
                  </div>
                  <div className="space-y-6">
                    <AvailabilitySummary mentorId={mentorProfile.id} />
                    <GoogleCalendarSync mentorId={mentorProfile.id} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="questions">
                <CreatorQuestionsTab mentorId={mentorProfile.id} />
              </TabsContent>

              <TabsContent value="sessions" className="space-y-6">
                <CreatorBookingsCard bookings={upcomingBookings} type="upcoming" />
                <CreatorBookingsCard bookings={pastBookings} type="past" />
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

export default CreatorCabinet;
