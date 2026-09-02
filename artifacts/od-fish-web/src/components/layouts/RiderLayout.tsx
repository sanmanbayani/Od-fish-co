import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { LogOut, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RiderLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { staff, logout } = useAuth();

  return (
    <div className="min-h-[100dvh] bg-muted/20 flex flex-col max-w-md mx-auto relative shadow-2xl overflow-hidden border-x border-border/50">
      {/* pt-safe: with viewport-fit=cover the page draws under the notch, so
          the header's own controls would sit beneath the cutout without it. */}
      <header className="bg-primary text-primary-foreground p-4 pt-safe flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex flex-col">
          <span className="font-serif text-lg font-bold">OD Fish Rider</span>
          <span className="text-xs opacity-80">{staff?.fullName}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={logout} className="text-primary-foreground hover:bg-primary/80">
          <LogOut className="w-5 h-5" />
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto pb-safe-nav">
        {children}
      </main>

      {/* `fixed` is viewport-relative, so on anything wider than the max-w-md
          shell this nav has to be re-centred or it hugs the left screen edge. */}
      <nav className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-md -translate-x-1/2 items-center justify-around border-t bg-background p-2 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <Link 
          href="/rider" 
          className={cn(
            "flex flex-col items-center p-2 rounded-lg min-w-[80px]",
            location === "/rider" ? "text-primary font-bold" : "text-muted-foreground"
          )}
        >
          <Package className={cn("w-6 h-6 mb-1", location === "/rider" ? "fill-primary/20" : "")} />
          <span className="text-[10px]">Deliveries</span>
        </Link>
      </nav>
    </div>
  );
}
