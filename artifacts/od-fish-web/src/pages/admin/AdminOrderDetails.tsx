import React from "react";
import { 
  useGetAdminOrder, 
  getGetAdminOrderQueryKey, 
  useUpdateAdminOrderStatus, 
  useAssignRider,
  useListStaff
} from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { formatPaise, formatOnlyDate, formatTime, formatWeight } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clock, MapPin, Phone, User, Package, FileText, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminOrderDetails() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: order, isLoading, error } = useGetAdminOrder(id!, {
    query: {
      enabled: !!id,
      queryKey: getGetAdminOrderQueryKey(id!)
    }
  });

  const { data: staffList } = useListStaff();
  const riders = staffList?.filter(s => s.role === 'RIDER' && s.isActive) || [];

  const updateStatus = useUpdateAdminOrderStatus();
  const assignRider = useAssignRider();

  const handleStatusChange = (newStatus: any) => {
    updateStatus.mutate({ id: id!, data: { status: newStatus } }, {
      onSuccess: () => {
        toast({ title: "Status updated", description: `Order moved to ${newStatus}` });
        queryClient.invalidateQueries({ queryKey: getGetAdminOrderQueryKey(id!) });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      },
      onError: (err: any) => {
        toast({ title: "Failed to update", description: err.error || "Unknown error", variant: "destructive" });
      }
    });
  };

  const handleRiderAssign = (riderId: string) => {
    if (riderId === "unassigned") return;
    assignRider.mutate({ id: id!, data: { riderId } }, {
      onSuccess: () => {
        toast({ title: "Rider assigned" });
        queryClient.invalidateQueries({ queryKey: getGetAdminOrderQueryKey(id!) });
      },
      onError: (err: any) => {
        toast({ title: "Failed to assign", description: err.error || "Unknown error", variant: "destructive" });
      }
    });
  };

  if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (error || !order) return <div className="p-8 text-destructive">Failed to load order.</div>;

  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/orders"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-serif font-bold text-foreground">Order {order.orderNumber}</h1>
            <Badge variant="secondary" className="text-sm bg-primary/10 text-primary hover:bg-primary/20">{order.status}</Badge>
            {order.flaggedUnreachable && <Badge variant="destructive">Customer Unreachable</Badge>}
          </div>
          <p className="text-sm text-muted-foreground mt-1">Placed {formatOnlyDate(order.createdAt)} at {formatTime(order.createdAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="w-5 h-5 text-primary" /> Order Items ({order.itemCount})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium p-4">Item</th>
                    <th className="text-center font-medium p-4">Qty</th>
                    <th className="text-right font-medium p-4">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {order.items.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.productName} className="w-12 h-12 rounded object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                              <Package className="w-6 h-6 text-muted-foreground/30" />
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-base">{item.productName}</div>
                            <div className="text-xs text-muted-foreground mb-1">{item.cutType} • {item.packLabel}</div>
                            {item.grossWeightG && <div className="text-xs font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded w-fit">Gross: {formatWeight(item.grossWeightG)}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center font-medium">{item.quantity} x {formatPaise(item.unitPricePaise)}</td>
                      <td className="p-4 text-right font-bold">{formatPaise(item.lineTotalPaise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 bg-muted/30 flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPaise(order.subtotalPaise)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span>{formatPaise(order.deliveryFeePaise)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Handling Fee</span>
                  <span>{formatPaise(order.handlingFeePaise)}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t mt-1">
                  <span>Total</span>
                  <span className="text-primary">{formatPaise(order.totalPaise)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="w-5 h-5 text-primary" /> Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {order.events.map((event, idx) => (
                  <div key={event.id} className="flex gap-4 relative">
                    {idx !== order.events.length - 1 && (
                      <div className="absolute left-4 top-8 bottom-[-16px] w-px bg-border z-0"></div>
                    )}
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center z-10 flex-shrink-0 border border-background">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-sm">{event.toStatus}</span>
                        <span className="text-xs text-muted-foreground">{formatTime(event.createdAt)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        By {event.actorType}
                      </div>
                      {event.note && (
                        <div className="mt-2 text-sm bg-muted p-2 rounded-md border text-foreground/80">
                          "{event.note}"
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Actions */}
          <Card className="border-primary/20 shadow-md">
            <CardHeader className="bg-primary/5 pb-4">
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {order.allowedTransitions.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Update Status</p>
                  <div className="flex flex-col gap-2">
                    {order.allowedTransitions.map(status => (
                      <Button 
                        key={status} 
                        onClick={() => handleStatusChange(status)}
                        variant={status === 'CANCELLED' ? 'destructive' : 'default'}
                        className="w-full justify-start"
                        disabled={updateStatus.isPending}
                      >
                        Move to {status}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-2">
                  No further status updates available.
                </div>
              )}

              {/* Rider Assignment if status allows */}
              {['CONFIRMED', 'PACKED', 'OUT_FOR_DELIVERY'].includes(order.status) && (
                <div className="space-y-3 pt-4 border-t">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Assign Rider</p>
                  <Select 
                    value={order.riderId || "unassigned"} 
                    onValueChange={handleRiderAssign}
                    disabled={assignRider.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Rider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned" disabled>Select Rider</SelectItem>
                      {riders.map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer & Delivery */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg">Delivery Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-sm">
              <div className="flex gap-3">
                <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-bold">{order.customerName}</div>
                  <div className="text-muted-foreground">{order.customerPhone}</div>
                </div>
              </div>
              <div className="flex gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-bold">{order.address.receiverName}</div>
                  <div className="text-muted-foreground">{order.address.line1}</div>
                  {order.address.line2 && <div className="text-muted-foreground">{order.address.line2}</div>}
                  <div className="text-muted-foreground">{order.address.area}, {order.address.pincode}</div>
                </div>
              </div>
              <div className="flex gap-3 pt-2 border-t">
                <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-bold">Slot: {order.slotLabel}</div>
                  <div className="text-muted-foreground">{formatOnlyDate(order.deliveryDate)}</div>
                </div>
              </div>
              {order.customerNote && (
                <div className="flex gap-3 pt-2 border-t">
                  <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-900/50 w-full italic">
                    "{order.customerNote}"
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg">Payment Info</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method</span>
                <span className="font-bold">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className={`font-bold ${order.paymentStatus === 'PAID' ? 'text-green-600' : 'text-orange-500'}`}>
                  {order.paymentStatus}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
