import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api } from "./api";
import { supabase } from "./supabase";

type AuthState = {
  session: Session | null;
  // True only while the initial session is being restored from storage. When
  // Supabase isn't configured there's nothing to load, so this starts false.
  loading: boolean;
};

const AuthContext = createContext<AuthState>({ session: null, loading: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(supabase !== null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      userIdRef.current = data.session?.user.id ?? null;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      const nextUserId = next?.user.id ?? null;
      // Switching accounts (or signing out) must not leak the previous user's
      // cached problems/reviews into the new session.
      if (nextUserId !== userIdRef.current) {
        queryClient.clear();
        userIdRef.current = nextUserId;
      }
      setSession(next);
      setLoading(false);

      // On sign-in, provision the user's library. The server seeds the NeetCode 150
      // exactly once (at account creation) and no-ops on every later sign-in, so a
      // first-time Google user gets all 150 and returning users are untouched. Fires
      // on the SIGNED_IN event only — not on session restore (INITIAL_SESSION) or
      // token refresh. Re-fetch only when seeding actually happened.
      if (event === "SIGNED_IN" && next) {
        api
          .bootstrap()
          .then((res) => {
            if (res.seeded) queryClient.invalidateQueries();
          })
          .catch((err) => console.error("Library provisioning failed:", err));
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export async function signInWithGoogle() {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  // On success the browser redirects to Google; this line is only reached on a
  // failure to initiate the flow.
  if (error) throw error;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
