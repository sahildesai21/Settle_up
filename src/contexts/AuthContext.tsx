import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth, db } from "@/integrations/firebase/client";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

interface User {
  id: string;
  email: string;
}

interface Session {
  userId: string;
}

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

interface LocalUserRecord {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

const toUserAndProfile = (record: LocalUserRecord): { user: User; profile: Profile } => ({
  user: {
    id: record.id,
    email: record.email,
  },
  profile: {
    display_name: record.display_name,
    avatar_url: record.avatar_url,
  },
});

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const syncProfile = async (record: LocalUserRecord) => {
    const userRef = doc(db, "users", record.id);
    const existingProfile = await getDoc(userRef);

    if (!existingProfile.exists()) {
      await setDoc(userRef, {
        email: record.email,
        display_name: record.display_name,
        avatar_url: record.avatar_url,
        created_at: serverTimestamp(),
      });
      return record;
    }

    const data = existingProfile.data();
    const nextDisplayName = (data.display_name as string | null | undefined) ?? record.display_name;
    const nextAvatarUrl = (data.avatar_url as string | null | undefined) ?? record.avatar_url;

    if (nextDisplayName !== data.display_name || nextAvatarUrl !== data.avatar_url) {
      await updateDoc(userRef, {
        display_name: nextDisplayName,
        avatar_url: nextAvatarUrl,
      });
    }

    return {
      ...record,
      display_name: nextDisplayName,
      avatar_url: nextAvatarUrl,
    };
  };

  const setCurrentUser = (record: LocalUserRecord | null) => {
    if (!record) {
      setUser(null);
      setSession(null);
      setProfile(null);
      return;
    }

    const mapped = toUserAndProfile(record);
    setUser(mapped.user);
    setSession({ userId: record.id });
    setProfile(mapped.profile);
  };

  useEffect(() => {
    // Clear any cached session on mount
    firebaseSignOut(auth);
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setCurrentUser(null);
        setLoading(false);
        return;
      }

      const baseRecord: LocalUserRecord = {
        id: firebaseUser.uid,
        email: firebaseUser.email ?? "",
        display_name: firebaseUser.displayName ?? firebaseUser.email?.split("@")[0] ?? "User",
        avatar_url: firebaseUser.photoURL,
      };

      const synced = await syncProfile(baseRecord);
      setCurrentUser(synced);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const signUp = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);

    await syncProfile({
      id: credential.user.uid,
      email: normalizedEmail,
      display_name: normalizedEmail.split("@")[0] || "User",
      avatar_url: null,
    });
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setDefaultLanguage('en');
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
