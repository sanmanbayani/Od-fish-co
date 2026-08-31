import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Settings,
  MapPin,
  LogOut,
  Fish,
  Clock3,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Orders", href: "/admin/orders", icon: ShoppingCart },
  { title: "Products", href: "/admin/products", icon: Fish },
  { title: "Inventory", href: "/admin/inventory", icon: Package },
  { title: "Staff", href: "/admin/staff", icon: Users },
  { title: "Service Areas", href: "/admin/service-areas", icon: MapPin },
  { title: "Delivery Slots", href: "/admin/slots", icon: Clock3 },
  { title: "Settings", href: "/admin/settings", icon: Settings },
];

function NavLinks({ location }: { location: string }) {
  return (
    <>
      {navItems.map((item) => {
        const isActive =
          location === item.href ||
          (item.href !== "/admin" && location.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors md:py-2.5",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50",
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.title}
          </Link>
        );
      })}
    </>
  );
}

function UserPanel({
  staff,
  logout,
}: {
  staff: { fullName?: string | null; role?: string | null } | null | undefined;
  logout: () => void;
}) {
  return (
    <div className="border-t border-sidebar-border p-4 pb-safe">
      <div className="mb-4 flex items-center gap-3 px-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
          {staff?.fullName?.charAt(0) || "S"}
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold">
            {staff?.fullName}
          </span>
          <span className="text-xs text-muted-foreground">{staff?.role}</span>
        </div>
      </div>
      <Button
        variant="outline"
        className="w-full justify-start text-muted-foreground"
        onClick={logout}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sign Out
      </Button>
    </div>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { staff, logout } = useAuth();
  const [menuOpen, setMenuOpen] = React.useState(false);

  // Wouter's Link does not unmount the drawer, so without this the menu stays
  // open on top of the page the user just navigated to.
  React.useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  return (
    <div className="flex min-h-[100dvh] bg-muted/30">
      {/* Sidebar — desktop only */}
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-6">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="font-serif text-xl font-bold tracking-tight text-sidebar-primary">
              OD Fish Co.
            </span>
            <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
              OPS
            </span>
          </Link>
        </div>
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-6">
          <NavLinks location={location} />
        </div>
        <UserPanel staff={staff} logout={logout} />
      </aside>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header — the only way to reach navigation below `md` */}
        <header className="sticky top-0 z-40 flex min-h-16 items-center gap-1 border-b bg-background/95 px-2 backdrop-blur pt-safe md:hidden">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="flex w-[17rem] flex-col gap-0 bg-sidebar p-0"
            >
              <SheetTitle className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border px-6 font-serif text-xl font-bold tracking-tight text-sidebar-primary">
                OD Fish Co.
              </SheetTitle>
              <SheetDescription className="sr-only">
                Admin console navigation
              </SheetDescription>
              <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
                <NavLinks location={location} />
              </nav>
              <UserPanel staff={staff} logout={logout} />
            </SheetContent>
          </Sheet>
          <span className="truncate font-serif text-lg font-bold">
            OD Fish Co.
          </span>
          {staff?.role ? (
            <span className="ml-auto mr-1 shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
              {staff.role}
            </span>
          ) : null}
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-safe sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
