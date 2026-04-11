import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const SUPER_ADMIN = "alfacompofficial@gmail.com";
const TEACHERS = ["alfacompofficial@gmail.com", "idrisovjasur@gmail.com"];

export function useAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (user && user.email) {
        setIsAdmin(user.email === SUPER_ADMIN);
        setIsTeacher(TEACHERS.includes(user.email));
      } else {
        setIsAdmin(false);
        setIsTeacher(false);
      }
    }
  }, [user, authLoading]);

  // Return loading false immediately if auth is done loading
  return { isAdmin, isTeacher, loading: authLoading };
}
