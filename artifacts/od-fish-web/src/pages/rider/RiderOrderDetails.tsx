import React, { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { 
  useListRiderOrders, 
  useVerifyDeliveryOtp, 
  useReportUnreachable,
  useStartRiderDelivery
} from "@workspace/api-client-react";
import { formatPaise, formatOnlyDate, slotWindow } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, Phone, Package, ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck, Clock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage } from "@/lib/api-error";

export default function RiderOrderDetails() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: orders, isLoading, error: loadError } = useListRiderOrders();
  const order = orders?.find(o => o.id === id);

  const [otp, setOtp] = useState("");
  const [cashCollected, setCashCollected] = useState(false);
  const verifyOtp = useVerifyDeliveryOtp();
  const reportUnreachable = useReportUnreachable();
  const startDelivery = useStartRiderDelivery();

  if (isLoading) return <div className="p-8 flex justify-center min-h-[50vh] items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (loadError) return (
    <div className="p-8 text-center space-y-2 min-h-[50vh] flex flex-col items-center justify-center" data-testid="text-deliveries-failed">
      <AlertTriangle className="w-10 h-10 text-destructive mb-2" />
      <p className="font-medium text-lg">Could not load your deliveries.</p>
      <p className="text-sm text-muted-foreground">{apiErrorMessage(loadError, "Check your signal and try again.")}</p>
    </div>
  );
  if (!order) return <div className="p-8 text-center min-h-[50vh] flex items-center justify-center text-muted-foreground">Order not found</div>;

  const handleStartDelivery = () => {
    startDelivery.mutate({ id: id! }, {
      onSuccess: () => {
        toast({ title: "Delivery Started" });
        queryClient.invalidateQueries({ queryKey: ["/api/rider/orders"] });
      },
      onError: (err: any) => {
        toast({ title: "Could not start the delivery", description: apiErrorMessage(err, "Please try again."), variant: "destructive" });
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
        toast({ title: "Could not confirm delivery", description: apiErrorMessage(err, "Please try again."), variant: "destructive" });
      }
    });
  };

  const handleReportUnreachable = () => {
    if (window.confirm("Are you sure the customer is unreachable? The operations team will be notified.")) {
      reportUnreachable.mutate({ id: id! }, {
        onSuccess: () => {
          toast({ title: "Reported Unreachable" });
          queryClient.invalidateQueries({ queryKey: ["/api/rider/orders"] });
        },
        onError: (err: any) => {
          toast({ title: "Could not report the customer", description: apiErrorMessage(err, "Please try again."), variant: "destructive" });
        }
      });
    }
  };

  const needsCash = order.collectCashPaise > 0;
  const isDelivered = order.status === 'DELIVERED';
  const isFailed = order.status === 'FAILED' || order.status === 'CANCELLED';

  return (
    <div className="flex flex-col min-h-full pb-10">
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-20 flex items-center gap-3 shadow-md">
        <Button variant="ghost" size="icon" asChild className="text-primary-foreground hover:bg-primary-foreground/20 w-11 h-11 shrink-0 rounded-full">
          <Link href="/rider" className="flex items-center justify-center"><ArrowLeft className="w-6 h-6" /></Link>
        </Button>
        <div className="min-w-0">
          <h1 className="font-mono font-bold text-xl truncate">{order.orderNumber}</h1>
          <p className="text-xs opacity-80 uppercase tracking-wide truncate">{order.status}</p>
        </div>
      </div>

      <div className="p-4 space-y-4 flex-1">
        <Card className="shadow-sm">
          <CardContent className="p-4 space-y-5">
            <div className="flex justify-between items-start gap-4">
              <div className="min-w-0">
                <h2 className="font-bold text-xl truncate">{order.customerName}</h2>
                <div className="flex items-center gap-2 mt-1.5">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a href={`tel:${order.customerPhone}`} className="text-blue-600 font-medium text-base h-8 inline-flex items-center active:bg-blue-50 px-1 -ml-1 rounded">
                    {order.customerPhone}
                  </a>
                </div>
              </div>
              <Button size="icon" variant="outline" className="rounded-full w-14 h-14 bg-blue-50 border-blue-200 text-blue-600 shrink-0 shadow-sm active:scale-95 transition-transform" asChild>
                <a href={`tel:${order.customerPhone}`} className="flex items-center justify-center"><Phone className="w-6 h-6 fill-current" /></a>
              </Button>
            </div>

            <div className="pt-4 border-t flex gap-3">
              <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-medium text-base leading-snug">{order.address.line1}</p>
                {order.address.line2 && <p className="text-muted-foreground mt-0.5 leading-snug">{order.address.line2}</p>}
                <p className="text-muted-foreground mt-0.5 leading-snug">{order.address.area}, {order.address.pincode}</p>
              </div>
            </div>
            
            <div className="pt-4 border-t flex gap-3">
              <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-medium text-base leading-snug">{formatOnlyDate(order.deliveryDate)} · {slotWindow(order.slotLabel)}</p>
                <p className="text-muted-foreground text-sm mt-0.5">Delivery window</p>
              </div>
            </div>

            <Button variant="outline" className="w-full h-12 text-base active:bg-muted font-medium" asChild>
              <a href={`https://maps.google.com/?q=${encodeURIComponent(`${order.address.line1} ${order.address.area} ${order.address.pincode}`)}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2">
                <MapPin className="w-4 h-4" /> Open in Google Maps
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4 pb-4 border-b gap-3">
              <span className="font-medium text-base">Total Items</span>
              <span className="font-bold text-lg">{order.itemCount}</span>
            </div>
            <div className="flex justify-between items-center bg-muted/50 p-4 rounded-xl border gap-3">
              <div className="min-w-0">
                <span className="block text-sm text-muted-foreground mb-1">To Collect</span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md font-bold inline-block uppercase tracking-wide">
                  {order.collectCashPaise > 0 ? "Cash on Delivery" : "Prepaid"}
                </span>
              </div>
              <span className="text-3xl font-bold text-primary shrink-0">{formatPaise(order.collectCashPaise)}</span>
            </div>
          </CardContent>
        </Card>

        {order.status === 'PACKED' && (
          <Card className="border-primary bg-primary/5 shadow-md">
            <CardContent className="p-6 text-center">
              <Package className="w-14 h-14 mx-auto text-primary mb-4" />
              <h3 className="font-bold text-xl mb-2">Pick up from store</h3>
              <p className="text-sm text-muted-foreground mb-6 px-2">Confirm once you have picked up this order and are leaving for delivery.</p>
              <Button className="w-full h-14 text-lg font-bold shadow-sm" onClick={handleStartDelivery} disabled={startDelivery.isPending}>
                Start Delivery
              </Button>
            </CardContent>
          </Card>
        )}

        {order.status === 'OUT_FOR_DELIVERY' && (
          <Card className="border-green-500 shadow-md overflow-hidden">
            <CardContent className="p-5 space-y-5">
              <div className="flex items-center gap-3 text-green-700 bg-green-50 p-3 rounded-lg border border-green-100">
                <ShieldCheck className="w-6 h-6 shrink-0 text-green-600" />
                <span className="text-sm font-semibold leading-tight">Customer will provide a 4-digit OTP</span>
              </div>
              
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <Input 
                    placeholder="4-Digit OTP" 
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="h-16 text-center text-4xl font-mono tracking-[0.5em] bg-muted/50 border-2 focus-visible:ring-primary focus-visible:border-primary focus:bg-background"
                    maxLength={4}
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                  {order.otpAttemptsRemaining < 3 && (
                    <p className="text-sm font-medium text-destructive mt-3 text-center">
                      {order.otpAttemptsRemaining} attempts remaining
                    </p>
                  )}
                </div>
                
                {needsCash && (
                  <label
                    htmlFor="cash-collected"
                    className={`flex items-center gap-4 rounded-xl border-2 p-5 cursor-pointer transition-all ${
                      cashCollected
                        ? "border-green-500 bg-green-50 shadow-sm"
                        : "border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10"
                    }`}
                    data-testid="label-cash-collected"
                  >
                    <Checkbox
                      id="cash-collected"
                      checked={cashCollected}
                      onCheckedChange={(checked) => setCashCollected(checked === true)}
                      className="w-7 h-7 shrink-0 rounded-md"
                      data-testid="checkbox-cash-collected"
                    />
                    <span className="text-base font-medium leading-snug">
                      I have collected{" "}
                      <span className="font-bold text-lg inline-block whitespace-nowrap bg-white px-1.5 py-0.5 rounded shadow-sm mx-0.5">{formatPaise(order.collectCashPaise)}</span>{" "}
                      in cash
                    </span>
                  </label>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-14 text-lg font-bold shadow-sm" 
                  disabled={otp.length !== 4 || (needsCash && !cashCollected) || verifyOtp.isPending}
                  data-testid="button-verify-complete"
                >
                  {verifyOtp.isPending
                    ? "Verifying..."
                    : needsCash && !cashCollected
                      ? "Confirm cash to finish"
                      : "Verify & Complete"}
                </Button>
              </form>

              <div className="pt-5 border-t text-center">
                <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive h-12 w-full font-medium text-base" onClick={handleReportUnreachable} disabled={reportUnreachable.isPending || order.flaggedUnreachable}>
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  {order.flaggedUnreachable ? "Customer Reported Unreachable" : "Customer Unreachable?"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isDelivered && (
          <div className="bg-green-50 border border-green-200 text-green-800 p-6 rounded-xl text-center space-y-3 shadow-sm">
            <CheckCircle2 className="w-14 h-14 mx-auto text-green-500" />
            <h3 className="font-bold text-2xl">Delivered Successfully</h3>
            <p className="text-base leading-snug">
              {order.cashCollectedPaise
                ? `${formatPaise(order.cashCollectedPaise)} cash collected. Hand it in at the counter.`
                : "Great job! This order is complete."}
            </p>
          </div>
        )}
        
        {isFailed && (
          <div className="bg-destructive/5 border border-destructive/20 text-destructive p-6 rounded-xl text-center space-y-3 shadow-sm">
            <AlertTriangle className="w-14 h-14 mx-auto opacity-80" />
            <h3 className="font-bold text-2xl">Delivery Failed</h3>
            <p className="text-base leading-snug">
              This order was marked as unreachable or cancelled. Return the items to the counter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
