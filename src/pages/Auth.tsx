import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Wallet, Mail, Lock, ArrowRight, Loader2, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Auth = () => {
  const { signIn, signUp, signInWithGoogle, signOut, user } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleLoadingTimeoutRef = useRef<number | null>(null);

  const clearGoogleLoadingTimeout = () => {
    if (googleLoadingTimeoutRef.current !== null) {
      window.clearTimeout(googleLoadingTimeoutRef.current);
      googleLoadingTimeoutRef.current = null;
    }
  };

  const getErrorMessage = (error: any): string => {
    const code = error?.code?.toLowerCase() || "";
    const message = error?.message?.toLowerCase() || "";

    const errorMap: { [key: string]: string } = {
      "auth/invalid-credential": "Wrong email or password.",
      "auth/user-not-found": "No account found.",
      "auth/wrong-password": "Wrong password.",
      "auth/email-already-in-use": "Email already in use. Sign in instead.",
      "auth/weak-password": "Password too short. Use 6+ characters.",
      "auth/invalid-email": "Invalid email address.",
      "auth/user-disabled": "This account has been disabled.",
      "auth/operation-not-allowed": "Operation not allowed.",
    };

    return errorMap[code] || error.message || "An error occurred. Please try again.";
  };

  useEffect(() => {
    return () => clearGoogleLoadingTimeout();
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password);
        toast({ title: "✅ Account created", description: "Your account is ready." });
      }
    } catch (err: any) {
      const errorMsg = getErrorMessage(err);
      const code = err?.code?.toLowerCase() || "";
      
      const needsSignup = code === "auth/user-not-found" || code === "auth/invalid-credential";
      toast({ 
        title: (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <X className="h-5 w-5 text-red-500" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-gray-900">Login error</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{errorMsg}</span>
                {needsSignup && isLogin && (
                  <button
                    onClick={() => setIsLogin(false)}
                    className="text-xs font-medium text-red-500 hover:text-red-600 whitespace-nowrap hover:underline underline-offset-2"
                  >
                    Sign up
                  </button>
                )}
              </div>
            </div>
          </div>
        ),
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    clearGoogleLoadingTimeout();
    const hadUserBeforeGoogleAttempt = Boolean(user);
    setGoogleLoading(true);

    googleLoadingTimeoutRef.current = window.setTimeout(() => {
      setGoogleLoading(false);
      googleLoadingTimeoutRef.current = null;
    }, 10000);

    try {
      await signInWithGoogle();
    } catch (err: any) {
      const message = String(err?.message ?? "").toLowerCase();
      const code = String(err?.code ?? "").toLowerCase();
      const isUserCancelled =
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request" ||
        message.includes("popup-closed-by-user") ||
        message.includes("cancelled-popup-request");

      if (isUserCancelled && !hadUserBeforeGoogleAttempt) {
        await signOut();
      }

      if (!isUserCancelled) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    } finally {
      clearGoogleLoadingTimeout();
      setGoogleLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5">
      <div className="w-full max-w-sm space-y-6 animate-fade-in">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="h-14 w-14 rounded-2xl gradient-primary flex items-center justify-center shadow-glow mx-auto">
            <Wallet className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-display font-extrabold text-2xl tracking-tight">SettleUp</h1>
          <p className="text-muted-foreground text-sm">
            {isLogin ? "Welcome back! Sign in to continue." : "Create an account to get started."}
          </p>
        </div>

        <Button
          variant="outline"
          className="w-full h-12 rounded-xl gap-2.5 text-sm font-medium shadow-soft"
          onClick={handleGoogleAuth}
          disabled={googleLoading}
        >
          {googleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
          Continue with Google
        </Button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailAuth} className="space-y-2">
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 rounded-xl border border-input bg-card pl-10 pr-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-soft"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 rounded-xl border border-input bg-card pl-10 pr-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-soft"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl gap-2 gradient-primary border-0 shadow-glow hover:opacity-90 transition-opacity font-semibold"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>
                {isLogin ? "Sign In" : "Create Account"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary font-semibold hover:underline"
          >
            {isLogin ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
