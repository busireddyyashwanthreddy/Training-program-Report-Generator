import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  provider: 'google' | 'password';
}

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  signingIn: boolean;
  authError: string | null;
  signUpWithEmail: (
    fullName: string,
    email: string,
    password: string
  ) => Promise<boolean>;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  signOutUser: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const SESSION_TOKEN_STORAGE_KEY = 'mb_pwd_session_token_v1';

function readStoredSessionToken(): string | null {
  try {
    const token = window.sessionStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
    return token && token.startsWith('mb_v1.') ? token : null;
  } catch {
    return null;
  }
}

function writeStoredSessionToken(token: string | null): void {
  try {
    if (token && token.startsWith('mb_v1.')) {
      window.sessionStorage.setItem(SESSION_TOKEN_STORAGE_KEY, token);
    } else {
      window.sessionStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage access restrictions in private browsing modes
  }
}

async function parseJsonSafe<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const passwordTokenRef = useRef<string | null>(readStoredSessionToken());
  const cookieUserRef = useRef<AppUser | null>(null);
  const bootedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    let firebaseResolved = false;
    let cookieResolved = false;
    let firebaseUserState: AppUser | null = null;

    const finalizeBoot = () => {
      if (!mounted) return;
      if (firebaseResolved && cookieResolved && !bootedRef.current) {
        bootedRef.current = true;
        if (firebaseUserState) {
          setUser(firebaseUserState);
        } else if (cookieUserRef.current) {
          setUser(cookieUserRef.current);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      firebaseResolved = true;
      firebaseUserState = fbUser
        ? {
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName,
            photoURL: fbUser.photoURL,
            provider: 'google',
          }
        : null;

      if (!bootedRef.current) {
        finalizeBoot();
      } else if (mounted) {
        if (firebaseUserState) {
          setUser(firebaseUserState);
        } else {
          setUser((prev) => (prev?.provider === 'google' ? null : prev));
        }
      }
    });

    // Check existing HttpOnly cookie OR tab-scoped Bearer token fallback (iframe-safe)
    const bootHeaders: Record<string, string> = {};
    if (passwordTokenRef.current) {
      bootHeaders.Authorization = `Bearer ${passwordTokenRef.current}`;
    }

    fetch('/api/auth/me', {
      credentials: 'include',
      headers: bootHeaders,
    })
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) {
            passwordTokenRef.current = null;
            writeStoredSessionToken(null);
          }
          return null;
        }
        const data = await parseJsonSafe<{ user?: AppUser }>(res);
        return data?.user || null;
      })
      .then((sessionUser) => {
        cookieResolved = true;
        cookieUserRef.current = sessionUser;
        finalizeBoot();
      })
      .catch(() => {
        cookieResolved = true;
        cookieUserRef.current = null;
        finalizeBoot();
      });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const signUpWithEmail = useCallback(
    async (fullName: string, email: string, password: string): Promise<boolean> => {
      setSigningIn(true);
      setAuthError(null);
      try {
        if (auth.currentUser) {
          await signOut(auth).catch(() => undefined);
        }
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName, email, password }),
        });
        const payload = await parseJsonSafe<{
          token?: string;
          user?: AppUser;
          error?: string;
        }>(res);
        if (!res.ok || !payload?.user) {
          setAuthError(
            payload?.error || 'Unable to create account. Please try again.'
          );
          return false;
        }
        passwordTokenRef.current = payload.token || null;
        writeStoredSessionToken(passwordTokenRef.current);
        cookieUserRef.current = payload.user;
        setUser(payload.user);
        return true;
      } catch (error) {
        console.error('Registration failed:', error);
        setAuthError('Unable to create account right now. Please try again.');
        return false;
      } finally {
        setSigningIn(false);
      }
    },
    []
  );

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setSigningIn(true);
      setAuthError(null);
      try {
        if (auth.currentUser) {
          await signOut(auth).catch(() => undefined);
        }
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const payload = await parseJsonSafe<{
          token?: string;
          user?: AppUser;
          error?: string;
        }>(res);
        if (!res.ok || !payload?.user) {
          setAuthError(payload?.error || 'Invalid email address or password.');
          return false;
        }
        passwordTokenRef.current = payload.token || null;
        writeStoredSessionToken(passwordTokenRef.current);
        cookieUserRef.current = payload.user;
        setUser(payload.user);
        return true;
      } catch (error) {
        console.error('Login failed:', error);
        setAuthError('Unable to log in right now. Please try again.');
        return false;
      } finally {
        setSigningIn(false);
      }
    },
    []
  );

  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    setSigningIn(true);
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      passwordTokenRef.current = null;
      writeStoredSessionToken(null);
      cookieUserRef.current = null;
      void fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(
        () => undefined
      );
      setUser({
        uid: cred.user.uid,
        email: cred.user.email || '',
        displayName: cred.user.displayName,
        photoURL: cred.user.photoURL,
        provider: 'google',
      });
      return true;
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: unknown }).code)
          : '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setAuthError(null);
      } else {
        console.error('Google sign-in failed:', error);
        setAuthError('Unable to sign in with Google. Please allow pop-ups and try again.');
      }
      return false;
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthError(null);
    passwordTokenRef.current = null;
    writeStoredSessionToken(null);
    cookieUserRef.current = null;
    try {
      await Promise.allSettled([
        signOut(auth),
        fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }),
      ]);
    } finally {
      setUser(null);
    }
  }, []);

  const getIdToken = useCallback(async (): Promise<string | null> => {
    if (auth.currentUser) {
      try {
        return await auth.currentUser.getIdToken();
      } catch (error) {
        console.error('Failed to retrieve Firebase ID token:', error);
        try {
          return await auth.currentUser.getIdToken(true);
        } catch {
          return null;
        }
      }
    }
    return passwordTokenRef.current || readStoredSessionToken();
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signingIn,
        authError,
        signUpWithEmail,
        signInWithEmail,
        signInWithGoogle,
        signOutUser,
        getIdToken,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
