import { useState, useMemo, useEffect } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MentorCard from "@/components/MentorCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import type { Mentor } from "@/data/mentors";

type CategoryFilter = "All" | "Business" | "Tech" | "Creators";

const Mentors = () => {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("All");
  const [sortBy, setSortBy] = useState<"rating" | "price">("rating");

  const categories: CategoryFilter[] = ["All", "Business", "Tech", "Creators"];

  useEffect(() => {
    fetchMentors();
  }, []);

  const fetchMentors = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("mentor_profiles")
      .select("*")
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching mentors:", error);
    } else {
      const formattedMentors = (data || []).map(mentor => ({
        id: mentor.id,
        name: mentor.name,
        title: mentor.title,
        category: mentor.category as "Business" | "Tech" | "Creators",
        image: mentor.image_url || "/placeholder.svg",
        rating: parseFloat(mentor.rating?.toString() || "0"),
        reviewCount: mentor.review_count || 0,
        price: parseFloat(mentor.price.toString()),
        bio: mentor.bio,
        fullBio: mentor.full_bio,
        expertise: mentor.expertise || [],
        languages: mentor.languages || [],
        availability: mentor.availability,
        experience: mentor.experience,
        education: mentor.education,
        certifications: mentor.certifications || [],
      }));
      setMentors(formattedMentors);
    }
    setLoading(false);
  };

  // Filter and sort mentors
  const filteredMentors = useMemo(() => {
    let filtered = mentors;

    // Filter by category
    if (selectedCategory !== "All") {
      filtered = filtered.filter((mentor) => mentor.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (mentor) =>
          mentor.name.toLowerCase().includes(query) ||
          mentor.title.toLowerCase().includes(query) ||
          mentor.expertise.some((skill) => skill.toLowerCase().includes(query)) ||
          mentor.bio.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === "rating") {
        return b.rating - a.rating;
      } else {
        return a.price - b.price;
      }
    });

    return filtered;
  }, [mentors, searchQuery, selectedCategory, sortBy]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-accent">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h1 className="text-5xl sm:text-6xl font-display font-bold">
              Find Your Perfect{" "}
              <span className="gradient-text">Mentor</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Connect with industry experts in Business, Tech, and Creator industries
            </p>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <Input
                type="text"
                placeholder="Search by name, skill, or expertise..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-6 text-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Filters Section */}
      <section className="py-8 border-b border-border sticky top-16 bg-background/95 backdrop-blur-sm z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
            {/* Category Tabs */}
            <Tabs value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as CategoryFilter)} className="w-full md:w-auto">
              <TabsList className="grid w-full md:w-auto grid-cols-4 gap-2">
                {categories.map((category) => (
                  <TabsTrigger
                    key={category}
                    value={category}
                    className="text-base px-6"
                  >
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Sort Options */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={16} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <Button
                variant={sortBy === "rating" ? "hero" : "ghost"}
                size="sm"
                onClick={() => setSortBy("rating")}
              >
                Rating
              </Button>
              <Button
                variant={sortBy === "price" ? "hero" : "ghost"}
                size="sm"
                onClick={() => setSortBy("price")}
              >
                Price
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Results Count */}
          <div className="mb-8">
            <p className="text-muted-foreground">
              {loading ? "Loading..." : (
                <>
                  Showing <span className="font-semibold text-foreground">{filteredMentors.length}</span> mentors
                  {selectedCategory !== "All" && (
                    <span> in <span className="font-semibold text-foreground">{selectedCategory}</span></span>
                  )}
                </>
              )}
            </p>
          </div>

          {/* Mentor Grid */}
          {filteredMentors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
              {filteredMentors.map((mentor) => (
                <MentorCard key={mentor.id} mentor={mentor} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-xl text-muted-foreground mb-4">
                No mentors found matching your criteria
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Mentors;