import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
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
import { mentors, reviews, courses, generateTimeSlots, TimeSlot } from "@/data/mentors";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MentorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [isBooking, setIsBooking] = useState(false);

  const mentor = mentors.find((m) => m.id === id);
  const mentorReviews = reviews.filter((r) => r.mentorId === id);
  const mentorCourses = courses.filter((c) => c.mentorId === id);
  const timeSlots = id ? generateTimeSlots(id) : [];

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
                    <Button variant="outline" size="lg" className="w-full">
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
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews ({mentorReviews.length})</TabsTrigger>
                  <TabsTrigger value="courses">Courses ({mentorCourses.length})</TabsTrigger>
                  <TabsTrigger value="booking" id="booking-tab">Book Session</TabsTrigger>
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
                        timeSlots={timeSlots}
                        onSelectSlot={setSelectedSlot}
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