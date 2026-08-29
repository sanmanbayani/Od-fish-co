import React, { useState } from "react";
import { useGetPublicSummary, useCheckServiceability, getCheckServiceabilityQueryKey, useJoinWaitlist } from "@workspace/api-client-react";
import { formatPaise, formatWeightRange } from "@/lib/format";
import { apiErrorMessage } from "@/lib/api-error";
import { mediaUrl } from "@/lib/api-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Fish, MapPin, Clock, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function Storefront() {
  const { data: summary, isLoading, error } = useGetPublicSummary();
  const [pincode, setPincode] = useState("");
  const [phone, setPhone] = useState("");
  const [checkPincode, setCheckPincode] = useState("");
  const { data: serviceability, isLoading: isChecking, error: checkError } = useCheckServiceability(checkPincode, {
    query: {
      enabled: checkPincode.length === 6,
      retry: false,
      queryKey: getCheckServiceabilityQueryKey(checkPincode)
    }
  });

  const joinWaitlist = useJoinWaitlist();
  const [waitlistJoined, setWaitlistJoined] = useState(false);

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (pincode.length === 6) {
      setCheckPincode(pincode);
    }
  };

  const handleWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length === 10 && checkPincode.length === 6) {
      joinWaitlist.mutate(
        { data: { phone, pincode: checkPincode } },
        {
          onSuccess: () => setWaitlistJoined(true)
        }
      );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <h2 className="text-2xl font-serif text-destructive">Something went wrong</h2>
        <p className="text-muted-foreground mt-2">Could not load the storefront. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[85vh] min-h-[600px] flex items-center bg-foreground text-background overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}assets/hero-fish.jpg`} 
            alt="Fresh Catch" 
            className="w-full h-full object-cover opacity-40 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/50 to-transparent"></div>
        </div>
        
        <div className="container relative z-10 mx-auto px-4 md:px-8 mt-20">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/30 text-background text-sm font-medium border border-background/20 backdrop-blur-md mb-6">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              {summary.storeOpen ? "Catch of the day is live" : "Store is closed for today"}
            </span>
            <h1 className="text-5xl md:text-7xl font-serif font-bold leading-tight mb-6 text-background">
              Elevating Fresh Seafish, Every Day.
            </h1>
            <p className="text-lg md:text-xl text-background/80 mb-10 max-w-lg leading-relaxed">
              Premium Arabian Sea catch. Cleaned, cut to order, and delivered to Mumbai homes same-day. No ammonia, no compromise.
            </p>
            
            <div className="bg-background text-foreground p-6 rounded-xl shadow-2xl max-w-md">
              <h3 className="font-bold mb-4 flex items-center gap-2 text-lg">
                <MapPin className="w-5 h-5 text-primary" />
                Check Delivery Status
              </h3>
              
              <form onSubmit={handleCheck} className="flex gap-2">
                <Input 
                  placeholder="Enter 6-digit Pincode" 
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="bg-muted text-lg h-12"
                  maxLength={6}
                />
                <Button type="submit" size="lg" className="h-12 px-6" disabled={pincode.length !== 6 || isChecking}>
                  Check
                </Button>
              </form>

              {checkPincode && checkError && (
                <div className="mt-4 pt-4 border-t border-border text-sm font-medium text-destructive" data-testid="text-check-failed">
                  {apiErrorMessage(checkError, "Could not check that pincode just now. Please try again.")}
                </div>
              )}

              {checkPincode && serviceability && (
                <div className="mt-4 pt-4 border-t border-border animate-in fade-in slide-in-from-top-2">
                  {serviceability.serviceable ? (
                    <div className="flex gap-3 text-green-700 dark:text-green-600 bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                      <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                      <div>
                        <p className="font-semibold">Great news! We deliver to {serviceability.areaName || checkPincode}.</p>
                        <p className="text-sm mt-1 text-green-800/80">Download our app to place your first order.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 text-destructive bg-destructive/10 p-4 rounded-lg">
                      <p className="font-semibold flex items-start gap-2">
                        We don't deliver to {checkPincode} yet.
                      </p>
                      {!waitlistJoined ? (
                        <form onSubmit={handleWaitlist} className="mt-2 flex flex-col gap-2">
                          <p className="text-sm text-foreground/80 mb-2">Leave your number and we'll text you when we expand.</p>
                          <div className="flex gap-2">
                            <Input 
                              placeholder="10-digit Mobile" 
                              value={phone}
                              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                              className="bg-background h-10 border-destructive/20"
                            />
                            <Button type="submit" disabled={phone.length !== 10 || joinWaitlist.isPending}>
                              Join Waitlist
                            </Button>
                          </div>
                          {joinWaitlist.isError && (
                            <p className="text-sm font-medium" data-testid="text-waitlist-error">
                              {apiErrorMessage(joinWaitlist.error, "Could not add your number just now. Please try again.")}
                            </p>
                          )}
                        </form>
                      ) : (
                        <div className="bg-green-50 text-green-700 p-3 rounded flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="text-sm font-medium">You're on the list! We'll be in touch.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="py-12 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-foreground/10 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-lg font-serif">Honest Weights</h4>
              <p className="text-sm text-primary-foreground/70">Gross & net weight plainly disclosed before you buy.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-foreground/10 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-lg font-serif">Same-Day Slots</h4>
              <p className="text-sm text-primary-foreground/70">Cut and cleaned to order. Never frozen, never stored.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-foreground/10 flex items-center justify-center">
              <Fish className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-lg font-serif">Local Catch</h4>
              <p className="text-sm text-primary-foreground/70">Sourced from Sassoon Dock & trusted Koliwada sellers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {summary.featured && summary.featured.length > 0 && (
        <section id="about" className="py-24 bg-card">
          <div className="container mx-auto px-4 md:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
              <div>
                <h2 className="text-4xl font-serif font-bold text-primary mb-4">Today's Premium Catch</h2>
                <p className="text-muted-foreground max-w-xl text-lg">
                  Hand-selected by our experts this morning. Limited stock available.
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {summary.featured.map((product) => (
                <div key={product.id} className="group bg-background rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-lg transition-all duration-300">
                  <div className="aspect-[4/3] overflow-hidden bg-muted relative">
                    {product.imageUrls?.[0] ? (
                      <img 
                        src={mediaUrl(product.imageUrls[0])} 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                        <Fish className="w-16 h-16" />
                      </div>
                    )}
                    {!product.inStock && (
                      <div className="absolute top-4 left-4 bg-background/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-destructive">
                        Sold Out
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-xl font-bold font-serif text-primary">{product.name}</h3>
                        {product.nameLocal && (
                          <p className="text-sm text-muted-foreground italic">{product.nameLocal}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground block mb-1">Starts at</span>
                        <span className="text-lg font-bold">{formatPaise(product.fromPricePaise)}</span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-4 line-clamp-2">
                      {product.shortDesc}
                    </p>
                    
                    {product.variants && product.variants.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-border">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Available Cuts</p>
                        <div className="flex flex-wrap gap-2">
                          {product.variants.slice(0, 3).map(v => (
                            <span key={v.id} className="text-xs px-2 py-1 bg-muted rounded-md text-foreground/80 font-medium">
                              {v.packLabel}
                            </span>
                          ))}
                          {product.variants.length > 3 && (
                            <span className="text-xs px-2 py-1 text-muted-foreground">+{product.variants.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* The Process Section */}
      <section id="process" className="py-24 bg-background relative overflow-hidden">
        <div className="absolute right-0 top-0 w-1/2 h-full opacity-20 hidden md:block">
          <img 
            src={`${import.meta.env.BASE_URL}assets/waitlist-boat.jpg`} 
            alt="Boat at dawn" 
            className="w-full h-full object-cover mix-blend-multiply mask-image-gradient-l" 
          />
        </div>
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <div className="max-w-2xl">
            <h2 className="text-4xl font-serif font-bold text-primary mb-12">From dock to door, without the detour.</h2>
            
            <div className="space-y-10">
              <div className="flex gap-6">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl flex-shrink-0 font-serif">1</div>
                <div>
                  <h4 className="text-xl font-bold mb-2">The Early Catch</h4>
                  <p className="text-muted-foreground">We partner directly with trusted boats at Sassoon Dock. Our experts select only the firmest, brightest catch before the sun comes up.</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl flex-shrink-0 font-serif">2</div>
                <div>
                  <h4 className="text-xl font-bold mb-2">Zero Ammonia</h4>
                  <p className="text-muted-foreground">Our fish travels on pure, clean ice. We strictly test for ammonia and formalin. If it doesn't pass, it doesn't enter our facility.</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl flex-shrink-0 font-serif">3</div>
                <div>
                  <h4 className="text-xl font-bold mb-2">Cleaned & Cut to Order</h4>
                  <p className="text-muted-foreground">We never pre-cut. When you place an order, our master cutters clean, descale, and slice exactly how you want it.</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl flex-shrink-0 font-serif">4</div>
                <div>
                  <h4 className="text-xl font-bold mb-2">Chilled Delivery</h4>
                  <p className="text-muted-foreground">Delivered in temperature-controlled bags. The cold chain is never broken until you open the pack in your kitchen.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* App CTA */}
      <section id="delivery" className="py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 md:px-8 text-center max-w-3xl">
          <Fish className="w-16 h-16 mx-auto mb-8 opacity-50" />
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">Ready to taste the difference?</h2>
          <p className="text-xl text-primary-foreground/80 mb-10">
            Download our consumer app to place your first order. 
            Free delivery on your first catch.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" variant="secondary" className="h-14 px-8 text-lg font-bold" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
              Check My Pincode
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
