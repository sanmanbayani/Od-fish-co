import React, { useState } from "react";
import { useAdminLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { apiErrorMessage } from "@/lib/api-error";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { Fish, Snowflake, Truck } from "lucide-react";

const LOGO = `${import.meta.env.BASE_URL}brand/od-fish-logo.png`;

export default function AdminLogin() {
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
          // Hard redirect so the cookie-backed session is picked up cleanly.
          window.location.href = `${import.meta.env.BASE_URL}admin`;
        },
        onError: (err: any) => {
          setErrorMsg(apiErrorMessage(err, "Login failed. Please check your credentials."));
        },
      },
    );
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr]">
      {/* Left: the ice counter */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-primary px-14 py-12 text-primary-foreground">
        {/* Faint scale pattern, like light off wet ice */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 12px 0, transparent 11px, currentColor 12px, transparent 13px)",
            backgroundSize: "24px 16px",
          }}
        />

        <div className="relative flex items-center gap-3">
          {/* The mark is navy ink on cream paper, so it sits on its own cream
              tile rather than being filtered onto the navy panel. */}
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-background">
            <img src={LOGO} alt="" className="h-8 w-8 object-contain" />
          </span>
          <div>
            <p className="font-serif text-xl leading-tight">OD Fish Co.</p>
            <p className="text-[11px] uppercase tracking-[0.16em] text-primary-foreground/60">
              Elevating fresh seafish
            </p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="font-serif text-[2.6rem] leading-[1.08]">
            Behind the counter.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-primary-foreground/70">
            Stock, cuts, slots and riders — everything that has to be right
            before the ice box leaves the dock.
          </p>

          <ul className="mt-9 space-y-3.5 text-sm text-primary-foreground/75">
            <li className="flex items-center gap-3">
              <Fish className="h-4 w-4 shrink-0 text-primary-foreground/50" />
              Catalogue, packs and live stock
            </li>
            <li className="flex items-center gap-3">
              <Snowflake className="h-4 w-4 shrink-0 text-primary-foreground/50" />
              Slot cutoffs and cutting capacity
            </li>
            <li className="flex items-center gap-3">
              <Truck className="h-4 w-4 shrink-0 text-primary-foreground/50" />
              Order pipeline through to handover
            </li>
          </ul>
        </div>

        <p className="relative text-xs text-primary-foreground/40">
          Landed at Sassoon Dock, Mumbai.
        </p>
      </aside>

      {/* Right: the form */}
      <main className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-9 lg:hidden">
            <img src={LOGO} alt="" className="mb-4 h-12 w-12 object-contain" />
          </div>

          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Staff &amp; operations
          </p>
          <h1 className="mt-2 font-serif text-3xl text-foreground">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Admin, ops and rider accounts all start here.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                placeholder="ops@odfishco.in"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
                placeholder="••••••••"
              />
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {errorMsg}
              </div>
            )}

            <Button
              type="submit"
              className="h-11 w-full text-base"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-8 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">
            Riders can sign in here too and will be sent straight to the
            delivery console.
          </p>
        </div>
      </main>
    </div>
  );
}
