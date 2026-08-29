import React, { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { 
  useListRiderOrders, 
  useVerifyDeliveryOtp, 
  useReportUnreachable,
  useStartRiderDelivery
} from "@workspace/api-client-react";
import { formatPaise } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, Phone, Package, ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function RiderOrderDetails() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: orders, isLoading } = useListRiderOrders();
  const order = orders?.find(o => o.id === id);

  const [otp, setOtp] = useState("");
  const [cashCollected, setCashCollected] = useState(false);
  const verifyOtp = useVerifyDeliveryOtp();
  const reportUnreachable = useReportUnreachable();
  // Riders get their own dispatch route; the ops status endpoint refuses them.
  const startDelivery = useStartRiderDelivery();

  if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (!order) return <div className="p-8 text-center">Order not found</div>;

  const handleStartDelivery = () => {
    startDelivery.mutate({ id: id! }, {
      onSuccess: () => {
        toast({ title: "Delivery Started" });
        queryClient.invalidateQueries({ queryKey: ["/api/rider/orders"] });
      }
    });
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 4) return;
    if (needsCash && !cashCollected) return;

    verifyOtp.mutate({ id: id!, data: { otp, cashCollected } }, {
      onSuccess: () => {
        toast({
          title: "Delivery Successful!",
          description: needsCash
            ? `Order delivered and ${formatPaise(order.collectCashPaise)} cash recorded.`
            : "Order marked as delivered.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/rider/orders"] });
      },
      onError: (err: any) => {
        toast({ title: "Invalid OTP", description: err.error || "Please try again.", variant: "destructive" });
      }
    });
  };

  const handleReportUnreachable = () => {
    if (confirm("Are you sure the customer is unreachable? The operations team will be notified.")) {
      reportUnreachable.mutate({ id: id! }, {
        onSuccess: () => {
          toast({ title: "Reported Unreachable" });
          queryClient.invalidateQueries({ queryKey: ["/api/rider/orders"] });
        }
      });
    }
  };

  /** A cash order cannot be closed until the rider says the money is in hand. */
  const needsCash = order.collectCashPaise > 0;
  const isDelivered = order.status === 'DELIVERED';
  const isFailed = order.status === 'FAILED' || order.status === 'CANCELLED';

  return (
    <div className="flex flex-col min-h-full pb-8">
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="text-primary-foreground hover:bg-primary-foreground/20">
          <Link href="/rider"><ArrowLeft className="w-6 h-6" /></Link>
        </Button>
        <div>
          <h1 className="font-mono font-bold text-xl">{order.orderNumber}</h1>
          <p className="text-xs opacity-80">{order.status}</p>
        </div>
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* Customer & Address */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-bold text-lg">{order.customerName}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a href={`tel:${order.customerPhone}`} className="text-blue-600 font-medium">{order.customerPhone}</a>
                </div>
              </div>
              <Button size="icon" variant="outline" className="rounded-full w-12 h-12 bg-blue-50 border-blue-200 text-blue-600" asChild>
                <a href={`tel:${order.customerPhone}`}><Phone className="w-5 h-5 fill-current" /></a>
              </Button>
            </div>

            <div className="pt-4 border-t flex gap-3">
              <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{order.address.line1}</p>
                {order.address.line2 && <p className="text-muted-foreground">{order.address.line2}</p>}
                <p className="text-muted-foreground">{order.address.area}, {order.address.pincode}</p>
              </div>
            </div>
            
            <Button variant="outline" className="w-full" asChild>
              <a href={`https://maps.google.com/?q=${encodeURIComponent(`${order.address.line1} ${order.address.area} ${order.address.pincode}`)}`} target="_blank" rel="noreferrer">
                Open in Google Maps
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Order Items & Cash */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4 pb-4 border-b">
              <span className="font-medium">Total Items</span>
              <span className="font-bold">{order.itemCount}</span>
            </div>
            <div className="flex justify-between items-center bg-muted/50 p-3 rounded-lg border">
              <div>
                <span className="block text-sm text-muted-foreground">To Collect</span>
                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium mt-1 inline-block">
                  {order.collectCashPaise > 0 ? "Cash on Delivery" : "Prepaid"}
                </span>
              </div>
              <span className="text-2xl font-bold text-primary">{formatPaise(order.collectCashPaise)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Action Area */}
        {order.status === 'PACKED' && (
          <Card className="border-primary bg-primary/5">
            <CardContent className="p-6 text-center">
              <Package className="w-12 h-12 mx-auto text-primary mb-4" />
              <h3 className="font-bold text-lg mb-2">Pick up from store</h3>
              <p className="text-sm text-muted-foreground mb-6">Confirm once you have picked up this order and are leaving for delivery.</p>
              <Button className="w-full h-14 text-lg font-bold" onClick={handleStartDelivery} disabled={startDelivery.isPending}>
                Start Delivery
              </Button>
            </CardContent>
          </Card>
        )}

        {order.status === 'OUT_FOR_DELIVERY' && (
          <Card className="border-green-500 shadow-md">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-md">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-sm font-medium">Customer will provide a 4-digit OTP</span>
              </div>
              
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <Input 
                    placeholder="Enter 4-Digit OTP" 
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="h-16 text-center text-3xl font-mono tracking-widest bg-muted border-2 focus-visible:ring-primary focus-visible:border-primary"
                    maxLength={4}
                  />
                  {order.otpAttemptsRemaining < 3 && (
                    <p className="text-xs text-destructive mt-2 text-center">
                      {order.otpAttemptsRemaining} attempts remaining
                    </p>
                  )}
                </div>
                
                {needsCash && (
                  <label
                    htmlFor="cash-collected"
                    className={`flex items-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                      cashCollected
                        ? "border-green-500 bg-green-50"
                        : "border-dashed border-primary/40 bg-primary/5"
                    }`}
                    data-testid="label-cash-collected"
                  >
                    <Checkbox
                      id="cash-collected"
                      checked={cashCollected}
                      onCheckedChange={(checked) => setCashCollected(checked === true)}
                      className="w-6 h-6"
                      data-testid="checkbox-cash-collected"
                    />
                    <span className="text-sm font-medium leading-snug">
                      I have collected{" "}
                      <span className="font-bold">{formatPaise(order.collectCashPaise)}</span>{" "}
                      in cash
                    </span>
                  </label>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-14 text-lg font-bold" 
                  disabled={otp.length !== 4 || (needsCash && !cashCollected) || verifyOtp.isPending}
                  data-testid="button-verify-complete"
                >
                  {verifyOtp.isPending
                    ? "Verifying..."
                    : needsCash && !cashCollected
                      ? "Confirm the cash first"
                      : "Verify & Complete"}
                </Button>
              </form>

              <div className="pt-4 border-t text-center">
                <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleReportUnreachable} disabled={reportUnreachable.isPending || order.flaggedUnreachable}>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  {order.flaggedUnreachable ? "Customer Reported Unreachable" : "Customer Unreachable?"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isDelivered && (
          <div className="bg-green-50 border border-green-200 text-green-700 p-6 rounded-xl text-center space-y-2 shadow-sm">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-500" />
            <h3 className="font-bold text-xl">Delivered Successfully</h3>
            <p className="text-sm">
              {order.cashCollectedPaise
                ? `${formatPaise(order.cashCollectedPaise)} cash collected. Hand it in at the counter.`
                : "Great job! This order is complete."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
