"use client";
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";
import { configured } from "@/lib/config";
const Context = createContext(null);
export const useAuth = () => useContext(Context);
export default function AuthProvider({ initialUser, children }) {
  const [user, setUser] = useState(initialUser);
  const router = useRouter();
  const lastId = useRef(initialUser?.id || null);
  useEffect(() => {
    setUser(initialUser);
    lastId.current = initialUser?.id || null;
  }, [initialUser]);
  useEffect(() => {
    if (!configured) return;
    const {
      data: { subscription },
    } = supabase().auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user;
      setUser(
        nextUser
          ? {
              id: nextUser.id,
              email: nextUser.email,
              full_name: nextUser.user_metadata?.full_name || "",
            }
          : null,
      );
      const id = nextUser?.id || null;
      if (lastId.current !== id || event === "USER_UPDATED") {
        lastId.current = id;
        router.refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);
  async function logout() {
    if (configured) {
      const { error } = await supabase().auth.signOut({ scope: "local" });
      if (error) throw error;
    }
    setUser(null);
    window.location.replace("/login?logged_out=1");
  }
  return (
    <Context.Provider value={{ user, configured, logout }}>
      {children}
    </Context.Provider>
  );
}
