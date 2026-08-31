import React from "react";
import { useListRiderOrders, getListRiderOrdersQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { formatPaise, formatOnlyDate, slotWindow } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone, Package, IndianRupee, ArrowRight, AlertCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function RiderDashboard() {
  const { data: orders, isLoading, error } = useListRiderOrders({
    query: { 
      refetchInterval: 10000,
      queryKey: getListRiderOrdersQueryKey()
    }
  });

  if (isLoading) {
    return <div className="p-8 flex justify-center min-h-[50vh] items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  if (error || !orders) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[50vh]">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold">Could not load deliveries</h2>
        <p className="text-muted-foreground mt-2 text-sm">Please check your connection and try again.</p>
      </div>
    );
  }

  const activeOrders = orders.filter(o => ['OUT_FOR_DELIVERY', 'PACKED'].includes(o.status));
  const completedOrders = orders.filter(o => ['DELIVERED', 'FAILED', 'CANCELLED'].includes(o.status));

  return (
    <div className="p-4 space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold font-serif mb-1">Your Deliveries</h1>
        <p className="text-muted-foreground text-sm">Today's assigned orders</p>
      </div>

      <div className="space-y-4">
        <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Package className="w-4 h-4" /> Active ({activeOrders.length})
        </h2>
        
        {activeOrders.length === 0 ? (
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No active deliveries right now.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {activeOrders.map(order => (
              <Link key={order.id} href={`/rider/orders/${order.id}`} className="block">
                <Card className="hover-elevate cursor-pointer border-primary/20 shadow-md active:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-3 mb-4 border-b pb-3">
                      <div className="min-w-0">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="font-mono font-bold text-lg">{order.orderNumber}</span>
                          {order.status === 'PACKED' && (
                            <Badge variant="outline" className="text-[10px] bg-yellow-100 text-yellow-800 border-yellow-200">Waiting for pickup</Badge>
                          )}
                          {order.status === 'OUT_FOR_DELIVERY' && (
                            <Badge className="text-[10px] bg-blue-500 text-white border-blue-600">Out for delivery</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs text-muted-foreground block mb-0.5">Collect</span>
                        <span className="font-bold text-primary text-base">{formatPaise(order.collectCashPaise)}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-semibold text-base truncate">{order.customerName}</div>
                          <div className="text-muted-foreground leading-snug line-clamp-2 mt-0.5">
                            {order.address.line1}, {order.address.area}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        <span className="text-muted-foreground leading-snug break-words">
                          {formatOnlyDate(order.deliveryDate)} · {slotWindow(order.slotLabel)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {completedOrders.length > 0 && (
        <div className="space-y-4 pt-6 border-t">
          <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
            Completed ({completedOrders.length})
          </h2>
          <div className="space-y-3 opacity-80">
            {completedOrders.map(order => (
              <Link key={order.id} href={`/rider/orders/${order.id}`} className="block">
                <Card className="hover-elevate cursor-pointer active:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center gap-3">
                      <div className="min-w-0 flex items-center flex-wrap gap-2">
                        <span className="font-mono font-bold">{order.orderNumber}</span>
                        <Badge variant="secondary" className="text-[10px] uppercase">{order.status}</Badge>
                      </div>
                      <span className="text-sm font-medium shrink-0">{formatPaise(order.collectCashPaise)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
