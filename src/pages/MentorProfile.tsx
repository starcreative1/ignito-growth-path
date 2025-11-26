import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowLeft, Star, MapPin, Globe, Award, Calendar, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReviewCard from "@/components/ReviewCard";
import CourseCard from "@/components/CourseCard";
import TimeSlotSelector from "@/components/TimeSlotSelector";
import { QuestionSubmissionForm } from "@/components/QuestionSubmissionForm";
import type { Mentor, Review, Course } from "@/data/mentors";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TimeSlot {
  id: string;
  mentor_id: string;
  date: string;
  time: string;
  is_available: boolean;
}

const MentorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  useEffect(() => {
    if (id) {
      fetchMentorData();
    }
  }, [id]);

  const fetchMentorData = async () => {
    setLoading(true);
    
    // Fetch mentor profile
    const { data: mentorData, error: mentorError } = await supabase
      .from("mentor_profiles")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();

    if (mentorError || !mentorData) {
      console.error("Error fetching mentor:", mentorError);
      setLoading(false);
      return;
    }

    setMentor({
      id: mentorData.id,
      name: mentorData.name,
      title: mentorData.title,
      category: mentorData.category as "Business" | "Tech" | "Creators",
      image: mentorData.image_url || "/placeholder.svg",
      rating: parseFloat(mentorData.rating?.toString() || "0"),
      reviewCount: mentorData.review_count || 0,
      price: parseFloat(mentorData.price.toString()),
      bio: mentorData.bio,
      fullBio: mentorData.full_bio,
      expertise: mentorData.expertise || [],
      languages: mentorData.languages || [],
      availability: mentorData.availability,
      experience: mentorData.experience,
      education: mentorData.education,
      certifications: mentorData.certifications || [],
    });

    // Fetch reviews
    const { data: reviewsData } = await supabase
      .from("mentor_reviews")
      .select("*")
      .eq("mentor_id", id)
      .order("created_at", { ascending: false });

    if (reviewsData) {
      setReviews(reviewsData.map(r => ({
        id: r.id,
        mentorId: r.mentor_id,
        userName: r.user_name,
        userAvatar: r.user_avatar || "/placeholder.svg",
        rating: r.rating,
        date: new Date(r.created_at).toISOString().split('T')[0],
        comment: r.comment,
      })));
    }

    // Fetch courses
    const { data: coursesData } = await supabase
      .from("mentor_courses")
      .select("*")
      .eq("mentor_id", id)
      .eq("is_active", true);

    if (coursesData) {
      setCourses(coursesData.map(c => ({
        id: c.id,
        mentorId: c.mentor_id,
        title: c.title,
        description: c.description,
        price: parseFloat(c.price.toString()),
        duration: c.duration,
        lessons: c.lessons,
        level: c.level as "Beginner" | "Intermediate" | "Advanced",
        thumbnail: c.thumbnail_url || "/placeholder.svg",
      })));
    }

    // Fetch time slots
    const { data: slotsData } = await supabase
      .from("mentor_time_slots")
      .select("*")
      .eq("mentor_id", id)
      .eq("is_available", true)
      .gte("date", new Date().toISOString().split('T')[0])
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    if (slotsData) {
      setTimeSlots(slotsData.map(s => ({
        id: s.id,
        mentor_id: s.mentor_id,
        date: s.date,
        time: s.time,
        is_available: s.is_available,
      })));
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-32">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const mentorReviews = reviews;
  const mentorCourses = courses;

  if (!mentor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Mentor not found</h1>
          <Button onClick={() => navigate("/mentors")}>Back to Mentors</Button>
        </div>
      </div>
    );
  }

  const handleStartConversation = async () => {
    if (!user) {
      toast.error("Please sign in to message mentors");
      navigate("/auth");
      return;
    }

    // Check if conversation already exists
    const { data: existingConv } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_id", user.id)
      .eq("mentor_id", mentor.id)
      .maybeSingle();

    if (existingConv) {
      navigate(`/messages/${existingConv.id}`);
      return;
    }

    // Create new conversation
    const { data: newConv, error } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        mentor_id: mentor.id,
        mentor_name: mentor.name,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to start conversation");
    } else {
      navigate(`/messages/${newConv.id}`);
    }
  };

  const handleBookSession = async () => {
    if (!selectedSlot) {
      toast.error("Please select a time slot first");
      return;
    }

    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast.error("Please sign in to book a session");
      navigate("/auth");
      return;
    }

    setIsBooking(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-booking", {
        body: {
          mentorId: mentor.id,
          mentorName: mentor.name,
          bookingDate: selectedSlot.date,
          bookingTime: selectedSlot.time,
          price: mentor.price,
          userEmail: session.user.email,
          userId: session.user.id,
        },
      });

      if (error) throw error;

      // Redirect to Stripe checkout
      if (data?.sessionUrl) {
        window.location.href = data.sessionUrl;
      } else {
        throw new Error("No session URL received");
      }
    } catch (error) {
      console.error("Booking error:", error);
      toast.error("Failed to create booking", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-accent">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/mentors")}
            className="mb-6"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Mentors
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Card */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardContent className="p-6 space-y-6">
                  {/* Image */}
                  <div className="relative">
                    <img
                      src={mentor.image}
                      alt={mentor.name}
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                    <Badge className="absolute top-4 right-4 bg-accent text-accent-foreground shadow-medium">
                      {mentor.category}
                    </Badge>
                  </div>

                  {/* Name & Title */}
                  <div className="text-center">
                    <h1 className="text-3xl font-display font-bold mb-2">
                      {mentor.name}
                    </h1>
                    <p className="text-muted-foreground mb-4">{mentor.title}</p>

                    {/* Rating */}
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <div className="flex items-center gap-1">
                        <Star className="text-accent fill-accent" size={20} />
                        <span className="text-xl font-semibold">{mentor.rating}</span>
                      </div>
                      <span className="text-muted-foreground">
                        ({mentor.reviewCount} reviews)
                      </span>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="space-y-3 pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-sm">
                      <Globe size={16} className="text-muted-foreground" />
                      <span>{mentor.languages.join(", ")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar size={16} className="text-muted-foreground" />
                      <span>{mentor.availability}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Award size={16} className="text-muted-foreground" />
                      <span>{mentor.experience}</span>
                    </div>
                  </div>

                  {/* Price & CTA */}
                  <div className="pt-4 border-t border-border space-y-4">
                    <div className="text-center">
                      <div className="text-4xl font-display font-bold gradient-text mb-1">
                        ${mentor.price}
                      </div>
                      <div className="text-sm text-muted-foreground">per session (60 min)</div>
                    </div>
                    <Button 
                      variant="hero" 
                      size="lg" 
                      className="w-full"
                      onClick={() => document.getElementById('booking-tab')?.click()}
                    >
                      Book a Session
                    </Button>
                    <Button 
                      variant="outline" 
                      size="lg" 
                      className="w-full"
                      onClick={handleStartConversation}
                    >
                      <MessageSquare size={18} className="mr-2" />
                      Send Message
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Content Area */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="overview" className="space-y-8">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews ({mentorReviews.length})</TabsTrigger>
                  <TabsTrigger value="courses">Courses ({mentorCourses.length})</TabsTrigger>
                  <TabsTrigger value="booking" id="booking-tab">Book Session</TabsTrigger>
                  <TabsTrigger value="question">Ask Question</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>About {mentor.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-muted-foreground leading-relaxed">
                        {mentor.fullBio}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Expertise</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {mentor.expertise.map((skill, index) => (
                          <Badge key={index} variant="secondary" className="text-sm">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Education & Certifications</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Education</h4>
                        <p className="text-muted-foreground">{mentor.education}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Certifications</h4>
                        <ul className="space-y-2">
                          {mentor.certifications.map((cert, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <Award size={16} className="text-accent mt-1" />
                              <span className="text-muted-foreground">{cert}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Reviews Tab */}
                <TabsContent value="reviews" className="space-y-6">
                  <div className="grid gap-6">
                    {mentorReviews.length > 0 ? (
                      mentorReviews.map((review) => (
                        <ReviewCard key={review.id} review={review} />
                      ))
                    ) : (
                      <Card>
                        <CardContent className="p-12 text-center">
                          <p className="text-muted-foreground">No reviews yet</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                {/* Courses Tab */}
                <TabsContent value="courses" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {mentorCourses.length > 0 ? (
                      mentorCourses.map((course) => (
                        <CourseCard key={course.id} course={course} />
                      ))
                    ) : (
                      <Card className="col-span-2">
                        <CardContent className="p-12 text-center">
                          <p className="text-muted-foreground">No courses available yet</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                {/* Booking Tab */}
                <TabsContent value="booking" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Book a Session with {mentor.name}</CardTitle>
                      <p className="text-muted-foreground">
                        Select an available time slot below. All times are shown in your local timezone.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <TimeSlotSelector
                        timeSlots={timeSlots as any}
                        onSelectSlot={(slot: any) => setSelectedSlot(slot as TimeSlot)}
                      />

                      {selectedSlot && (
                        <div className="mt-6 p-6 bg-accent/10 rounded-lg border border-accent/20 space-y-4">
                          <h4 className="font-semibold text-lg">Selected Time Slot:</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(selectedSlot.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })} at {selectedSlot.time}
                          </p>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between pt-4 border-t border-border">
                              <div>
                                <div className="text-2xl font-display font-bold">${mentor.price}</div>
                                <div className="text-xs text-muted-foreground">60-minute session</div>
                              </div>
                              <Button 
                                variant="hero" 
                                onClick={handleBookSession}
                                disabled={isBooking}
                              >
                                {isBooking ? "Processing..." : "Proceed to Payment"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Question Tab */}
                <TabsContent value="question" className="space-y-6">
                  <QuestionSubmissionForm
                    mentorId={id!}
                    mentorName={mentor.name}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default MentorProfile;