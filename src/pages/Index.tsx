import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import SEO from "@/components/SEO";
import HowItWorks from "@/components/HowItWorks";
import Storefront from "@/components/Storefront";
import RealTimeMonetization from "@/components/RealTimeMonetization";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="G.Creators — The AI Operating System for Creators"
        description="Build, scale, and monetize your creator business with one AI-powered platform built for creators, experts, and educators."
        path="/"
      />
      <Navbar />
      <Hero />
      <HowItWorks />
      <Storefront />
      <RealTimeMonetization />
      <CTA />
      <Footer />
    </div>
  );
};

export default Index;