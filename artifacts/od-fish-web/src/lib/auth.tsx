import React, { createContext, useContext, type ReactNode } from "react";
import {
  useGetCurrentStaff,
  getGetCurrentStaffQueryKey,
  logoutStaff,
  type Staff,
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  staff: Staff | undefined;
  isLoading: boolean;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // The landing page has no staff session, so probing /admin/me there would
  // fire a guaranteed 401 on every public visit. Only ask on staff surfaces.
  const isStaffSurface = location.startsWith("/admin") || location.startsWith("/rider");

  const { data: staff, isLoading, error } = useGetCurrentStaff({
    query: {
      queryKey: getGetCurrentStaffQueryKey(),
      retry: false,
      enabled: isStaffSurface,
    },
  });

  const logout = async () => {
    try {
      await logoutStaff();
    } catch {
      // A failed logout call still clears the client; the cookie expires server-side.
    } finally {
      const target = staff?.role === "RIDER" ? "/rider/login" : "/admin/login";
      queryClient.clear();
      setLocation(target);
    }
  };

  const isAuthenticated = !!staff && !error;

  return (
    <AuthContext.Provider
      value={{ staff, isLoading: isStaffSurface && isLoading, logout, isAuthenticated }}
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
