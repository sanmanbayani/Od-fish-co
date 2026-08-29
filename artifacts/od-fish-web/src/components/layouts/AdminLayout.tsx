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
  Clock3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { staff, logout } = useAuth();

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border hidden md:flex flex-col flex-shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="font-serif text-xl font-bold text-sidebar-primary tracking-tight">OD Fish Co.</span>
            <span className="text-xs px-2 py-0.5 bg-accent text-accent-foreground rounded-full font-medium ml-2">OPS</span>
          </Link>
        </div>
        <div className="flex-1 py-6 px-3 flex flex-col gap-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/admin" && location.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.title}
              </Link>
            );
          })}
        </div>
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {staff?.fullName?.charAt(0) || "S"}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{staff?.fullName}</span>
              <span className="text-xs text-muted-foreground">{staff?.role}</span>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header (simplified) */}
        <header className="h-16 border-b bg-background flex items-center justify-between px-4 md:hidden">
          <span className="font-serif text-lg font-bold">OD Fish Co.</span>
          <Button variant="ghost" size="icon">
            <LayoutDashboard className="w-5 h-5" />
          </Button>
        </header>
        
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
