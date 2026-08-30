import React, { useState } from "react";
import { useGetPublicSummary, useCheckServiceability, getCheckServiceabilityQueryKey, useJoinWaitlist } from "@workspace/api-client-react";
import { formatPaise, formatWeightRange } from "@/lib/format";
import { apiErrorMessage } from "@/lib/api-error";
import { mediaUrl } from "@/lib/api-config";
import { Button } from "@/components/ui/button";
import { Fish, MapPin, Clock, ShieldCheck, CheckCircle2 } from "lucide-react";

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
      <section className="relative pt-12 md:pt-20 pb-16 md:pb-24 bg-primary text-primary-foreground">
        
        <div className="container relative z-20 mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto text-center flex flex-col items-center">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-foreground/10 text-primary-foreground text-sm font-medium border border-primary-foreground/20 backdrop-blur-md mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <span className={`w-2 h-2 rounded-full ${summary.storeOpen ? 'bg-green-400 animate-pulse' : 'bg-destructive'}`}></span>
              {summary.storeOpen ? "Catch of the day is live" : "Store is closed for today"}
            </span>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold leading-[1.1] mb-6 text-primary-foreground animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
              Elevating Fresh <span className="italic font-light">Seafish.</span>
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/80 mb-12 max-w-xl leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
              Premium Arabian Sea catch. Cleaned, cut to order, and delivered to Mumbai homes same-day. No ammonia, no compromise.
            </p>
            
            <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500 fill-mode-both relative z-30">
              <div className="bg-background text-foreground p-2 pl-6 rounded-full shadow-2xl flex items-center gap-2 border border-border/50 hover:border-primary/30 focus-within:ring-2 focus-within:ring-primary/40 transition-colors">
                <MapPin className="w-5 h-5 text-primary/60 shrink-0" />
                <form onSubmit={handleCheck} className="flex-1 flex gap-2">
                  <input 
                    aria-label="Delivery pincode"
                    placeholder="Enter 6-digit Pincode" 
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="bg-transparent text-lg h-12 flex-1 outline-none font-medium placeholder:text-muted-foreground/60 w-full min-w-0"
                    maxLength={6}
                    inputMode="numeric"
                    autoComplete="postal-code"
                  />
                  <Button type="submit" size="lg" className="rounded-full px-6 md:px-8 shrink-0 hover-elevate" disabled={pincode.length !== 6 || isChecking}>
                    Check
                  </Button>
                </form>
              </div>

              {/* Status overlays with smooth animation */}
              <div className="absolute top-full left-0 right-0 mt-4 text-left">
                {checkPincode && checkError && (
                  <div className="bg-destructive text-destructive-foreground p-4 rounded-2xl shadow-xl animate-in fade-in slide-in-from-top-2" data-testid="text-check-failed">
                    {apiErrorMessage(checkError, "Could not check that pincode just now. Please try again.")}
                  </div>
                )}

                {checkPincode && serviceability && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    {serviceability.serviceable ? (
                      <div className="flex gap-3 text-green-800 bg-green-50 p-4 rounded-2xl shadow-xl border border-green-200/50">
                        <CheckCircle2 className="w-6 h-6 flex-shrink-0 text-green-600" />
                        <div>
                          <p className="font-semibold text-green-900">Great news! We deliver to {serviceability.areaName || checkPincode}.</p>
                          <p className="text-sm mt-1 text-green-800/80">Download our app to place your first order.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 text-foreground bg-background p-5 rounded-2xl shadow-xl border border-border">
                        <p className="font-semibold flex items-start gap-2 text-destructive">
                          We don't deliver to {checkPincode} yet.
                        </p>
                        {!waitlistJoined ? (
                          <form onSubmit={handleWaitlist} className="mt-1 flex flex-col gap-3">
                            <p className="text-sm text-muted-foreground">Leave your number and we'll text you when we expand.</p>
                            <div className="flex gap-2">
                              <input 
                                aria-label="Mobile number for waitlist"
                                placeholder="10-digit Mobile" 
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                className="bg-muted px-4 rounded-xl h-12 flex-1 outline-none text-base border border-transparent focus:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
                                type="tel"
                                inputMode="tel"
                                autoComplete="tel"
                              />
                              <Button type="submit" className="rounded-xl h-12 px-6" disabled={phone.length !== 10 || joinWaitlist.isPending}>
                                Join Waitlist
                              </Button>
                            </div>
                            {joinWaitlist.isError && (
                              <p className="text-sm font-medium text-destructive mt-1" data-testid="text-waitlist-error">
                                {apiErrorMessage(joinWaitlist.error, "Could not add your number just now. Please try again.")}
                              </p>
                            )}
                          </form>
                        ) : (
                          <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-center gap-3">
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                            <span className="font-medium">You're on the list! We'll be in touch.</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* Trust Signals */}
      <section className="py-16 bg-background text-foreground relative border-b border-border/40">
        <div className="container mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left relative z-10">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-4 hover-elevate p-4 rounded-2xl transition-colors hover:bg-muted/30">
            <div className="w-14 h-14 rounded-full bg-primary/5 text-primary flex items-center justify-center shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-bold text-xl font-serif text-primary mb-2">Honest Weights</h4>
              <p className="text-muted-foreground leading-relaxed">Gross & net weight plainly disclosed before you buy. You pay only for what you eat.</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center md:items-start gap-4 hover-elevate p-4 rounded-2xl transition-colors hover:bg-muted/30">
            <div className="w-14 h-14 rounded-full bg-primary/5 text-primary flex items-center justify-center shrink-0">
              <Clock className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-bold text-xl font-serif text-primary mb-2">Same-Day Slots</h4>
              <p className="text-muted-foreground leading-relaxed">Cut and cleaned to order just hours before delivery. Never frozen, never stored.</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center md:items-start gap-4 hover-elevate p-4 rounded-2xl transition-colors hover:bg-muted/30">
            <div className="w-14 h-14 rounded-full bg-primary/5 text-primary flex items-center justify-center shrink-0">
              <Fish className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-bold text-xl font-serif text-primary mb-2">Local Catch</h4>
              <p className="text-muted-foreground leading-relaxed">Sourced from Sassoon Dock & trusted Koliwada sellers. Dawn catch direct to you.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {summary.featured && summary.featured.length > 0 && (
        <section id="about" className="py-24 bg-card border-b border-border/40">
          <div className="container mx-auto px-4 md:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16">
              <div>
                <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-4">Today's Premium Catch</h2>
                <p className="text-muted-foreground max-w-xl text-lg md:text-xl">
                  Hand-selected by our experts this morning. Limited stock available.
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {summary.featured.map((product) => (
                <div key={product.id} className="group bg-background rounded-[2rem] overflow-hidden border border-border shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 flex flex-col">
                  <div className="aspect-[4/3] overflow-hidden bg-muted relative">
                    {product.imageUrls?.[0] ? (
                      <img 
                        src={mediaUrl(product.imageUrls[0])} 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 bg-primary/5">
                        <Fish className="w-16 h-16" />
                      </div>
                    )}
                    {!product.inStock && (
                      <div className="absolute top-4 left-4 bg-background/95 backdrop-blur px-4 py-1.5 rounded-full text-xs font-bold text-destructive shadow-sm">
                        Sold Out
                      </div>
                    )}
                  </div>
                  <div className="p-8 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4 gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-2xl font-bold font-serif text-primary truncate">{product.name}</h3>
                        {product.nameLocal && (
                          <p className="text-base text-muted-foreground italic mt-1 truncate">{product.nameLocal}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-medium text-muted-foreground block mb-1 uppercase tracking-wider">Starts at</span>
                        <span className="text-xl font-bold text-primary">{formatPaise(product.fromPricePaise)}</span>
                      </div>
                    </div>
                    
                    <p className="text-base text-muted-foreground mt-2 line-clamp-2 leading-relaxed flex-1">
                      {product.shortDesc}
                    </p>
                    
                    {product.variants && product.variants.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-border">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Available Cuts</p>
                        <div className="flex flex-wrap gap-2">
                          {product.variants.slice(0, 3).map(v => (
                            <span key={v.id} className="text-sm px-3 py-1.5 bg-primary/5 border border-primary/10 rounded-full text-foreground/90 font-medium">
                              {v.packLabel}
                            </span>
                          ))}
                          {product.variants.length > 3 && (
                            <span className="text-sm px-3 py-1.5 text-muted-foreground font-medium">+{product.variants.length - 3} more</span>
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
      <section id="process" className="py-32 bg-background relative overflow-hidden">
        {/* Floating fish illustration */}
        <div className="absolute top-16 md:top-10 right-[-12%] md:right-12 w-64 md:w-96 h-auto opacity-20 md:opacity-35 pointer-events-none animate-float">
          <img 
            src={`${import.meta.env.BASE_URL}brand/fish-catch.svg`} 
            alt="" 
            className="w-full h-full object-contain" 
          />
        </div>
        
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-16 leading-tight">
              From dock to door, <br className="hidden md:block" /><span className="italic font-light opacity-90">without the detour.</span>
            </h2>
            
            <div className="space-y-12">
              <div className="flex gap-8 group">
                <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl flex-shrink-0 font-serif border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-500">1</div>
                <div>
                  <h4 className="text-2xl font-serif font-bold mb-3 text-primary">The Early Catch</h4>
                  <p className="text-muted-foreground text-lg leading-relaxed">We partner directly with trusted boats at Sassoon Dock. Our experts select only the firmest, brightest catch before the sun comes up.</p>
                </div>
              </div>
              <div className="flex gap-8 group">
                <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl flex-shrink-0 font-serif border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-500">2</div>
                <div>
                  <h4 className="text-2xl font-serif font-bold mb-3 text-primary">Zero Ammonia</h4>
                  <p className="text-muted-foreground text-lg leading-relaxed">Our fish travels on pure, clean ice. We strictly test for ammonia and formalin. If it doesn't pass, it doesn't enter our facility.</p>
                </div>
              </div>
              <div className="flex gap-8 group">
                <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl flex-shrink-0 font-serif border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-500">3</div>
                <div>
                  <h4 className="text-2xl font-serif font-bold mb-3 text-primary">Cleaned & Cut to Order</h4>
                  <p className="text-muted-foreground text-lg leading-relaxed">We never pre-cut. When you place an order, our master cutters clean, descale, and slice exactly how you want it.</p>
                </div>
              </div>
              <div className="flex gap-8 group">
                <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl flex-shrink-0 font-serif border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-500">4</div>
                <div>
                  <h4 className="text-2xl font-serif font-bold mb-3 text-primary">Chilled Delivery</h4>
                  <p className="text-muted-foreground text-lg leading-relaxed">Delivered in temperature-controlled bags. The cold chain is never broken until you open the pack in your kitchen.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* App CTA */}
      <section id="delivery" className="py-32 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="container mx-auto px-4 md:px-8 text-center max-w-3xl relative z-10">
          <Fish className="w-16 h-16 mx-auto mb-8 opacity-50 animate-float" />
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-8 leading-tight">Ready to taste <span className="italic font-light">the difference?</span></h2>
          <p className="text-xl text-primary-foreground/80 mb-12 font-medium">
            Download our consumer app to place your first order. 
            Free delivery on your first catch.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" variant="secondary" className="rounded-full h-14 px-10 text-lg font-bold hover-elevate shadow-xl" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
              Check My Pincode
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
