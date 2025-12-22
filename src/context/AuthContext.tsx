"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2, ShieldAlert } from "lucide-react";

// Define types for authentication
interface User {
  id: string;
  name: string;
  email: string;
  apiKey?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, apiKey?: string) => Promise<boolean>;
  logout: () => void;
  updateApiKey: (apiKey: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on initial load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // In a real app, this would check with your backend
        // For now, we'll use localStorage for demo purposes
        const storedUser = localStorage.getItem("supersmartx_user");
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string, apiKey?: string): Promise<boolean> => {
    try {
      setIsLoading(true);

      // In a real app, this would call your authentication API
      // For demo purposes, we'll simulate a successful login

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create mock user
      const mockUser: User = {
        id: "user_" + Math.random().toString(36).substr(2, 9),
        name: "Smartmeet User",
        email,
        apiKey: apiKey || process.env.NEXT_PUBLIC_DEFAULT_API_KEY || ""
      };

      // Store user in localStorage
      localStorage.setItem("supersmartx_user", JSON.stringify(mockUser));
      setUser(mockUser);

      return true;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Clear user data
    localStorage.removeItem("supersmartx_user");
    setUser(null);
  };

  const updateApiKey = (apiKey: string) => {
    if (user) {
      const updatedUser = { ...user, apiKey };
      localStorage.setItem("supersmartx_user", JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateApiKey,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/**
 * Protected route wrapper
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-black">
        <div className="relative">
          <Loader2 className="w-12 h-12 text-brand-via animate-spin" />
        </div>
        <p className="mt-4 text-sm font-medium text-zinc-400 dark:text-zinc-600 animate-pulse uppercase tracking-widest">
          Loading Smartmeet...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-black">
        <div className="text-center p-12 bg-white dark:bg-zinc-900 rounded-[32px] border-2 border-zinc-100 dark:border-zinc-800 shadow-2xl max-w-md w-full mx-4">
          <div className="w-20 h-20 bg-rose-50 dark:bg-rose-950/30 rounded-[32px] flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10 text-rose-500" />
          </div>
          <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mb-2 tracking-tight uppercase">Access Denied</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8 font-medium">Please login to access your dashboard and recordings.</p>
          <button
            onClick={() => router.push("/login")}
            className="w-full py-4 bg-brand-gradient text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] transition-all shadow-glow flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" /> Go to Login
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
