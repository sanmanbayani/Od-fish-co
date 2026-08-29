import React, { useState } from "react";
import { useAdminLogin } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiErrorMessage } from "@/lib/api-error";

const LOGO = `${import.meta.env.BASE_URL}brand/od-fish-logo.png`;

export default function RiderLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loginMutation = useAdminLogin();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading, staff } = useAuth();

  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation(staff?.role === "RIDER" ? "/rider" : "/admin");
    }
  }, [isLoading, isAuthenticated, staff, setLocation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    loginMutation.mutate(
      { data: { email, password } },
      {
        onSuccess: () => {
          queryClient.clear();
          window.location.href = `${import.meta.env.BASE_URL}rider`;
        },
        onError: (err: any) => {
          setErrorMsg(apiErrorMessage(err, "Login failed. Check your email and password."));
        },
      },
    );
  };

  return (
    // Riders work one-handed, outdoors, on a phone. Big targets, high contrast,
    // nothing decorative competing for the tap.
    <div className="flex min-h-[100dvh] flex-col bg-primary text-primary-foreground">
      <div className="flex flex-1 flex-col justify-center px-6 py-10">
        <div className="mx-auto w-full max-w-sm">
          {/* Navy-on-cream mark, so give it a cream tile on the navy panel. */}
          <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-background">
            <img src={LOGO} alt="" className="h-10 w-10 object-contain" />
          </span>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-primary-foreground/55">
            OD Fish Co. · Delivery fleet
          </p>
          <h1 className="mt-2 font-serif text-[2.1rem] leading-tight">
            Ready to ride?
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-primary-foreground/65">
            Sign in to see today's runs, collect cash, and close deliveries with
            the customer's OTP.
          </p>

          <form onSubmit={handleSubmit} className="mt-9 space-y-3">
            <Input
              type="email"
              required
              autoComplete="username"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-14 rounded-xl border-transparent bg-primary-foreground/10 text-lg text-primary-foreground placeholder:text-primary-foreground/45 focus-visible:ring-primary-foreground/40"
              placeholder="Email address"
            />
            <Input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-14 rounded-xl border-transparent bg-primary-foreground/10 text-lg text-primary-foreground placeholder:text-primary-foreground/45 focus-visible:ring-primary-foreground/40"
              placeholder="Password"
            />

            {errorMsg && (
              <p
                role="alert"
                className="rounded-lg bg-primary-foreground/10 px-3 py-2.5 text-center text-sm font-medium text-red-300"
              >
                {errorMsg}
              </p>
            )}

            <Button
              type="submit"
              variant="secondary"
              className="mt-2 h-14 w-full rounded-xl text-lg font-semibold"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
      </div>

      <p className="px-6 pb-8 text-center text-xs text-primary-foreground/40">
        Trouble signing in? Ask the ops desk to reset your account.
      </p>
    </div>
  );
}
