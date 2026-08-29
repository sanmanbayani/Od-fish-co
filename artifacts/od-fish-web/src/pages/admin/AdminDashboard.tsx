import React from "react";
import { useGetAdminDashboard } from "@workspace/api-client-react";
import { formatPaise } from "@/lib/format";
import { 
  Card, CardContent, CardHeader, CardTitle 
} from "@/components/ui/card";
import { AlertCircle, IndianRupee, ShoppingBag, PackageOpen, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

export default function AdminDashboard() {
  const { data: dashboard, isLoading, error } = useGetAdminDashboard();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="p-8 text-destructive flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        Failed to load dashboard
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Operations Dashboard</h1>
          <p className="text-muted-foreground mt-1">Live overview of today's business</p>
        </div>
        <div className="flex items-center gap-3 bg-card px-4 py-2 rounded-lg border shadow-sm">
          <div className={`w-3 h-3 rounded-full ${dashboard.storeOpen ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="font-medium text-sm">{dashboard.storeOpen ? 'Store is Open' : 'Store is Closed'}</span>
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Orders</CardTitle>
            <ShoppingBag className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.ordersToday}</div>
          </CardContent>
        </Card>
        
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Revenue</CardTitle>
            <IndianRupee className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPaise(dashboard.revenueTodayPaise)}</div>
            {dashboard.averageOrderValuePaise && (
              <p className="text-xs text-muted-foreground mt-1">
                Avg: {formatPaise(dashboard.averageOrderValuePaise)} / order
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card className="hover-elevate border-destructive/30 bg-destructive/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Pending Actions</CardTitle>
            <AlertTriangle className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{dashboard.pendingActionCount}</div>
            <p className="text-xs text-destructive/80 mt-1">Orders waiting to be packed</p>
          </CardContent>
        </Card>
        
        <Card className="hover-elevate border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-400">Low Stock Variants</CardTitle>
            <PackageOpen className="w-4 h-4 text-orange-700 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">{dashboard.lowStockCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Needs Action */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Needs Action</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.needsAction.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>All caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboard.needsAction.slice(0, 5).map(order => (
                  <Link key={order.id} href={`/admin/orders/${order.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-md bg-muted/50 hover:bg-muted cursor-pointer transition-colors border">
                      <div className="flex flex-col">
                        <span className="font-mono text-sm font-bold">{order.orderNumber}</span>
                        <span className="text-xs text-muted-foreground">{order.customerName} • {order.slotLabel}</span>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">{order.status}</span>
                        <span className="text-xs text-muted-foreground mt-1">{order.itemCount} items</span>
                      </div>
                    </div>
                  </Link>
                ))}
                {dashboard.needsAction.length > 5 && (
                  <Link href="/admin/orders" className="block text-center text-sm text-primary hover:underline mt-2">
                    View all {dashboard.needsAction.length} orders
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Slot Load */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Slot Load (Upcoming)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboard.slotLoad.map(slot => (
                <div key={`${slot.slotId}|${slot.deliveryDate}`} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{slot.label}</span>
                    <span className="text-muted-foreground">{slot.orders} / {slot.capacity}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full ${slot.orders >= slot.capacity ? 'bg-destructive' : slot.orders > slot.capacity * 0.8 ? 'bg-orange-500' : 'bg-primary'}`} 
                      style={{ width: `${Math.min(100, (slot.orders / slot.capacity) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              {dashboard.slotLoad.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No upcoming slots.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Needed icon that wasn't imported
function CheckCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}
