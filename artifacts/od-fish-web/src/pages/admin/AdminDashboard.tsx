import { useGetAdminDashboard, getGetAdminDashboardQueryKey } from "@workspace/api-client-react";
import { formatPaise, formatOnlyDate, slotWindow } from "@/lib/format";
import {
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  IndianRupee,
  PackageOpen,
  ShoppingBag,
  Truck,
  Wallet,
} from "lucide-react";
import { Link } from "wouter";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";

/** Short weekday for the trend axis; the newest column is always "Today". */
function dayLabel(iso: string, isLast: boolean): string {
  if (isLast) return "Today";
  const date = new Date(`${iso}T00:00:00`);
  return new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(date);
}

/** Compact rupees for the chart, where two decimals are noise: ₹4.1k. */
function compactRupees(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(1)}L`;
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1)}k`;
  return `₹${Math.round(rupees)}`;
}

function TrendTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium">{formatOnlyDate(point.date)}</div>
      <div className="text-muted-foreground mt-0.5">
        {formatPaise(point.revenuePaise)} · {point.orders} {point.orders === 1 ? "order" : "orders"}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  // The counter is a live surface — someone leaves it open on a screen through
  // service, so it has to keep up without anyone reloading it.
  const { data: dashboard, isLoading, error } = useGetAdminDashboard({
    query: {
      refetchInterval: 30000,
      queryKey: getGetAdminDashboardQueryKey(),
    },
  });

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

  const trend = dashboard.revenueTrend ?? [];
  const trendTotal = trend.reduce((sum, point) => sum + point.revenuePaise, 0);
  const chartData = trend.map((point, index) => ({
    ...point,
    label: dayLabel(point.date, index === trend.length - 1),
  }));

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

      {/* Two different days are in play at once: what came in today, and what
          goes out today. Keeping them side by side stops one being read as the
          other. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="hover-elevate" data-testid="card-orders-today">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Orders Taken Today</CardTitle>
            <ShoppingBag className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-orders-placed-today">
              {dashboard.ordersPlacedToday}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatPaise(dashboard.revenuePlacedTodayPaise)} of business
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-deliveries-today">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Going Out Today</CardTitle>
            <Truck className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-deliveries-today">
              {dashboard.ordersToday}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatPaise(dashboard.revenueTodayPaise)} to deliver
              {(dashboard.averageOrderValuePaise ?? 0) > 0
                ? ` · avg ${formatPaise(dashboard.averageOrderValuePaise)}`
                : ""}
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-cash-today">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cash Collected</CardTitle>
            <Wallet className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-cash-collected">
              {formatPaise(dashboard.cashCollectedTodayPaise)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {dashboard.cashPendingTodayPaise > 0
                ? `${formatPaise(dashboard.cashPendingTodayPaise)} still out with riders`
                : "All cash accounted for"}
            </p>
          </CardContent>
        </Card>

        <Card
          className={`hover-elevate ${dashboard.pendingActionCount > 0 ? 'border-destructive/30 bg-destructive/5' : ''}`}
          data-testid="card-pending-actions"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className={`text-sm font-medium ${dashboard.pendingActionCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
              Waiting On You
            </CardTitle>
            <AlertTriangle className={`w-4 h-4 ${dashboard.pendingActionCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${dashboard.pendingActionCount > 0 ? 'text-destructive' : ''}`}
              data-testid="text-pending-actions"
            >
              {dashboard.pendingActionCount}
            </div>
            <p className={`text-xs mt-1 ${dashboard.pendingActionCount > 0 ? 'text-destructive/80' : 'text-muted-foreground'}`}>
              {dashboard.pendingActionCount > 0
                ? "Orders to confirm, pack or send out"
                : "Nothing waiting"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Last 7 days */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-baseline justify-between">
              <CardTitle className="text-lg">Last 7 Days</CardTitle>
              <span className="text-sm text-muted-foreground">
                {compactRupees(trendTotal)} delivered
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {trendTotal === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                No deliveries in the last seven days yet.
              </div>
            ) : (
              <div className="h-[200px]" data-testid="chart-revenue-trend">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      className="text-xs fill-muted-foreground"
                    />
                    <Tooltip cursor={{ fill: "hsl(var(--muted))" }} content={<TrendTooltip />} />
                    <Bar
                      dataKey="revenuePaise"
                      radius={[4, 4, 0, 0]}
                      fill="hsl(var(--primary))"
                      maxBarSize={48}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Running low — the count alone told nobody what to reorder. */}
        <Card data-testid="card-low-stock">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Running Low</CardTitle>
              <PackageOpen className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            {dashboard.lowStock.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Everything well stocked</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dashboard.lowStock.slice(0, 5).map((item) => (
                  <div
                    key={item.variantId}
                    className="flex items-center justify-between gap-2 text-sm"
                    data-testid={`row-low-stock-${item.variantId}`}
                  >
                    <span className="truncate">
                      {item.productName}
                      <span className="text-muted-foreground"> · {item.packLabel}</span>
                    </span>
                    <span
                      className={`shrink-0 font-medium tabular-nums ${item.stockState === 'OUT' ? 'text-destructive' : 'text-orange-600 dark:text-orange-400'}`}
                    >
                      {item.stockState === 'OUT' ? 'Out' : `${item.stockQty} left`}
                    </span>
                  </div>
                ))}
                <Link
                  href="/admin/inventory"
                  className="flex items-center gap-1 text-sm text-primary hover:underline pt-2"
                  data-testid="link-inventory"
                >
                  {dashboard.lowStockCount > 5
                    ? `All ${dashboard.lowStockCount} low items`
                    : "Open inventory"}
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
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
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>All caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboard.needsAction.slice(0, 5).map(order => (
                  <Link key={order.id} href={`/admin/orders/${order.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-md bg-muted/50 hover:bg-muted cursor-pointer transition-colors border">
                      <div className="flex flex-col">
                        <span className="font-mono text-sm font-bold">{order.orderNumber}</span>
                        <span className="text-xs text-muted-foreground">{order.customerName} • {formatOnlyDate(order.deliveryDate)} · {slotWindow(order.slotLabel)}</span>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">{order.status}</span>
                        <span className="text-xs text-muted-foreground mt-1">{order.itemCount} items</span>
                      </div>
                    </div>
                  </Link>
                ))}
                {dashboard.pendingActionCount > 5 && (
                  <Link href="/admin/orders" className="block text-center text-sm text-primary hover:underline mt-2">
                    View all {dashboard.pendingActionCount} orders
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
                    <span className="font-medium">{slot.label} <span className="font-normal text-muted-foreground">· {formatOnlyDate(slot.deliveryDate)}</span></span>
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
