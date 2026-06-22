import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Trash2, Download, ShieldAlert } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "@/hooks/use-toast";

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
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (roleLoading) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    load();
  }, [roleLoading, isAdmin]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("waitlist_signups")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    } else {
      setEntries((data ?? []) as WaitlistEntry[]);
    }
    setLoading(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this waitlist entry?")) return;
    const { error } = await supabase.from("waitlist_signups").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setEntries((prev) => prev.filter((e) => e.id !== id));
    toast({ title: "Entry deleted" });
  };

  const exportCsv = () => {
    const header = ["Full name", "Email", "Content type", "Niche", "Audience size", "Joined"];
    const rows = entries.map((e) => [
      e.full_name,
      e.email,
      e.content_type ?? "",
      e.niche ?? "",
      e.audience_size ?? "",
      new Date(e.created_at).toISOString(),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 container mx-auto px-4 max-w-md text-center">
          <ShieldAlert className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-display font-bold mb-2">Admin access required</h1>
          <p className="text-muted-foreground mb-6">You need an admin role to view waitlist submissions.</p>
          <Button onClick={() => navigate("/auth")}>Sign in</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-28 pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
            <div>
              <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">
                Waitlist <span className="gradient-text">submissions</span>
              </h1>
              <p className="text-muted-foreground mt-2">
                {entries.length} total {entries.length === 1 ? "signup" : "signups"}
              </p>
            </div>
            <Button variant="outline" onClick={exportCsv} disabled={!entries.length}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm shadow-subtle overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Niche</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      No waitlist signups yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.full_name}</TableCell>
                      <TableCell>{e.email}</TableCell>
                      <TableCell>
                        {e.content_type ? <Badge variant="secondary">{e.content_type}</Badge> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>{e.niche || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>
                        {e.audience_size ? <Badge variant="outline">{e.audience_size}</Badge> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(e.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => remove(e.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminWaitlist;