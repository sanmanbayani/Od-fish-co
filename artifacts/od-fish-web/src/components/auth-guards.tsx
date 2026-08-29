import React, { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { staff, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/admin/login");
    } else if (!isLoading && isAuthenticated && staff?.role === "RIDER") {
      setLocation("/rider");
    }
  }, [isLoading, isAuthenticated, staff, setLocation]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  if (!isAuthenticated || staff?.role === "RIDER") {
    return null; // Will redirect
  }

  return <>{children}</>;
}

export function RiderGuard({ children }: { children: React.ReactNode }) {
  const { staff, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/rider/login");
    } else if (!isLoading && isAuthenticated && staff?.role !== "RIDER") {
      setLocation("/admin");
    }
  }, [isLoading, isAuthenticated, staff, setLocation]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  if (!isAuthenticated || staff?.role !== "RIDER") {
    return null; // Will redirect
  }

  return <>{children}</>;
}
