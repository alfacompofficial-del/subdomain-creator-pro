import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const OWNER = "alfacompofficial@gmail.com";

export function useAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) {
        setIsAdmin(false);
        setIsTeacher(false);
        setIsOwner(false);
        setRoleLoading(false);
        return;
      }

      // Check owner first
      const isUserOwner = user.email?.toLowerCase() === OWNER.toLowerCase();
      
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      const role = data?.role || "student";
      
      setIsOwner(isUserOwner);
      setIsAdmin(isUserOwner || role === "admin");
      setIsTeacher(isUserOwner || role === "admin" || role === "teacher");
      setRoleLoading(false);
    };

    if (!authLoading) {
      fetchRole();
    }
  }, [user, authLoading]);

  return { isAdmin, isTeacher, isOwner, loading: authLoading || roleLoading };
}
