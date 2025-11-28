import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "moderator" | "user";

export const useUserRole = () => {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRoles = async () => {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setRoles([]);
        setUserId(null);
        setLoading(false);
        return;
      }

      setUserId(session.user.id);

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (error) {
        console.error("Error fetching user roles:", error);
        setRoles([]);
      } else {
        setRoles(data?.map((r) => r.role as AppRole) || []);
      }
      
      setLoading(false);
    };

    fetchUserRoles();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserRoles();
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasRole = (role: AppRole): boolean => {
    return roles.includes(role);
  };

  const isAdmin = hasRole("admin");
  const isModerator = hasRole("moderator");

  return {
    roles,
    loading,
    userId,
    hasRole,
    isAdmin,
    isModerator,
  };
};
