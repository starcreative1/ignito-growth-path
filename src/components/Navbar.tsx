import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 w-full z-50 glass-effect border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <h1 className="text-2xl font-display font-bold gradient-text">
              G.Creators
            </h1>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/mentors" className="text-foreground hover:text-accent transition-colors">
              Find Mentors
            </Link>
            <a href="/#courses" className="text-foreground hover:text-accent transition-colors">
              Courses
            </a>
            <a href="/#how-it-works" className="text-foreground hover:text-accent transition-colors">
              How It Works
            </a>
            <a href="/#pricing" className="text-foreground hover:text-accent transition-colors">
              Pricing
            </a>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Button variant="ghost">Sign In</Button>
            <Button variant="hero" onClick={() => navigate('/mentors')}>
              Get Started
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-foreground hover:text-accent"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 space-y-4">
            <Link
              to="/mentors"
              className="block text-foreground hover:text-accent transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Find Mentors
            </Link>
            <a
              href="/#courses"
              className="block text-foreground hover:text-accent transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Courses
            </a>
            <a
              href="/#how-it-works"
              className="block text-foreground hover:text-accent transition-colors"
              onClick={() => setIsOpen(false)}
            >
              How It Works
            </a>
            <a
              href="/#pricing"
              className="block text-foreground hover:text-accent transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Pricing
            </a>
            <div className="pt-4 space-y-2">
              <Button variant="ghost" className="w-full">
                Sign In
              </Button>
              <Button 
                variant="hero" 
                className="w-full"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/mentors');
                }}
              >
                Get Started
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;