
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { supabase } from '../lib/supabaseClient.js';
import { validateRegistration } from '../utils/censorship.js';

const AuthCtx = createContext(null);

export const useAuth = () => useContext(AuthCtx);

// Basic information from Supabase Authentication
function normalizeUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name:
      user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'Member',
    role: null,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Retrieve the user's profile, including their role
  const fetchUserProfile = useCallback(async (authUser) => {
    if (!authUser) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, email, role')
      .eq('id', authUser.id)
      .maybeSingle();

    if (error) {
      console.error('Profile loading error:', error);
      return normalizeUser(authUser);
    }

    return {
      id: authUser.id,
      email: data?.email || authUser.email,
      name:
        data?.full_name ||
        authUser.user_metadata?.full_name ||
        authUser.email?.split('@')[0] ||
        'Member',
      role: data?.role || null,
    };
  }, []);

  // Restore session and listen for authentication changes
  useEffect(() => {
    let mounted = true;
    let requestId = 0;

    const loadSession = async (currentSession) => {
      const currentRequest = ++requestId;

      if (!mounted) return;

      setSession(currentSession);

      if (!currentSession?.user) {
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      const profileUser = await fetchUserProfile(
        currentSession.user
      );

      if (!mounted || currentRequest !== requestId) return;

      setUser(profileUser);
      setLoading(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        // Run profile loading after the auth callback finishes
        Promise.resolve().then(() => loadSession(currentSession));
      }
    );

    // Restore existing session
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;

      if (error) {
        console.error('Session loading error:', error);
        loadSession(null);
      } else {
        loadSession(data.session);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  // LOGIN
  const signIn = useCallback(
    async (email, password) => {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) throw error;

      setSession(data.session);

      const profileUser = await fetchUserProfile(data.user);

      setUser(profileUser);

      return profileUser;
    },
    [fetchUserProfile]
  );

// REGISTER
const signUp = useCallback(async (name, email, password) => {

  // Check inappropriate words before registration
  validateRegistration(name, email, password);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
      },
    },
  });

  if (error) throw error;

  if (!data.session) {
    return {
      user: normalizeUser(data.user),
      needsEmailConfirmation: true,
    };
  }

  setSession(data.session);

  const profileUser = await fetchUserProfile(data.user);
  setUser(profileUser);

  return {
    user: profileUser,
    needsEmailConfirmation: false,
  };
}, [fetchUserProfile]);

  // LOGOUT
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    setSession(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      signIn,
      signUp,
      signOut,
    }),
    [user, session, loading, signIn, signUp, signOut]
  );

  return (
    <AuthCtx.Provider value={value}>
      {children}
    </AuthCtx.Provider>
  );
}