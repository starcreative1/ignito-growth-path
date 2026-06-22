import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import WaitlistSection from "@/components/Waitlist";

const WaitlistPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Join the Waitlist — G.Creators Founding Creators"
        description="Become a Founding Creator. Early access for creators ready to monetise and scale expertise with GCreators."
        path="/waitlist"
      />
      <Navbar />
      <main className="flex-1 pt-16">
        <WaitlistSection />
      </main>
      <Footer />
    </div>
  );
};

export default WaitlistPage;