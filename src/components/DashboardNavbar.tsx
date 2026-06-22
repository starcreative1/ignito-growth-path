import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, X, MessageCircle, Store, LayoutDashboard, ShoppingBag, User as UserIcon, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

const navItems = [
  { to: "/creator-cabinet?tab=overview", label: "Overview", icon: LayoutDashboard, match: "overview" },
  { to: "/creator-cabinet?tab=products", label: "Shop", icon: ShoppingBag, match: "products" },
  { to: "/creator-cabinet?tab=storefront", label: "Storefront", icon: Store, match: "storefront" },
  { to: "/creator-cabinet?tab=profile", label: "Profile", icon: UserIcon, match: "profile" },
];

const DashboardNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { unreadCount } = useUnreadMessages(user);
  const currentTab = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 w-full z-50 glass-effect border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex-shrink-0">
            <h1 className="text-2xl font-display font-bold gradient-text">G.Creators</h1>
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            {navItems.map(({ to, label, icon: Icon, match }) => {
              const active = currentTab === match;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    active
                      ? "bg-accent/10 text-accent"
                      : "text-foreground/80 hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center space-x-2">
            {user && (
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => navigate("/creator-cabinet?tab=messages")}
                aria-label="Messages"
              >
                <MessageCircle className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 text-xs flex items-center justify-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Badge>
                )}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>

          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-foreground hover:text-accent">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="md:hidden py-4 space-y-1">
            {navItems.map(({ to, label, icon: Icon, match }) => {
              const active = currentTab === match;
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                    active ? "bg-accent/10 text-accent" : "text-foreground/80 hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
            <div className="pt-3 space-y-2 border-t border-border">
              {user && (
                <Button
                  variant="outline"
                  className="w-full relative"
                  onClick={() => {
                    setIsOpen(false);
                    navigate("/creator-cabinet?tab=messages");
                  }}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Messages
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1.5 text-xs">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Badge>
                  )}
                </Button>
              )}
              <Button variant="ghost" className="w-full" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default DashboardNavbar;