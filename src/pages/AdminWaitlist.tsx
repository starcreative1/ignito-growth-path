import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldAlert, Users, Mail, Calendar } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Navbar from "@/components/Navbar";
import { useUserRole } from "@/hooks/useUserRole";

interface WaitlistEntry {
  id: string;
  full_name: string;
  email: string;
  content_type: string | null;
  niche: string | null;
  audience_size: string | null;
  created_at: string;
}

const AdminWaitlist = () => {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();

  useEffect(() => {
    checkAuth();
    fetchEntries();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please sign in to access this page");
      navigate("/auth");
      return;
    }
    setUser(session.user);
  };

  useEffect(() => {
    if (!roleLoading && !isAdmin && user) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/");
    }
  }, [isAdmin, roleLoading, user, navigate]);

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("waitlist_signups")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching waitlist entries:", error);
      toast.error("Failed to load waitlist entries");
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-32">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-32">
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You do not have permission to access this page. Admin privileges are required.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-32">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-display font-bold">Waitlist</h1>
            <p className="text-muted-foreground mt-2">
              {entries.length} total sign-up{entries.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-accent" />
                      {entry.full_name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      {entry.email}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(entry.created_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  {entry.content_type && (
                    <div>
                      <span className="text-muted-foreground">Content type:</span>{" "}
                      {entry.content_type}
                    </div>
                  )}
                  {entry.niche && (
                    <div>
                      <span className="text-muted-foreground">Niche:</span>{" "}
                      {entry.niche}
                    </div>
                  )}
                  {entry.audience_size && (
                    <div>
                      <span className="text-muted-foreground">Audience:</span>{" "}
                      {entry.audience_size}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {entries.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">No waitlist sign-ups yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminWaitlist;
