import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const SUPER_ADMIN = "alfacompofficial@gmail.com";
const TEACHERS = ["alfacompofficial@gmail.com", "idrisovjasur@gmail.com"];

export function useAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (user && user.email) {
        setIsAdmin(user.email.toLowerCase() === SUPER_ADMIN.toLowerCase());
        setIsTeacher(TEACHERS.some(t => t.toLowerCase() === user.email?.toLowerCase()));
      } else {
        setIsAdmin(false);
        setIsTeacher(false);
      }
      setRoleLoading(false);
    }
  }, [user, authLoading]);

  return { isAdmin, isTeacher, loading: authLoading || roleLoading };
}
