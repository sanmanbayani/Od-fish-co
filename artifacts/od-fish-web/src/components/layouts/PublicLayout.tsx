import React from "react";
import { Link } from "wouter";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/40">
        <div className="container mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img 
              src={`${import.meta.env.BASE_URL}brand/od-fish-logo.png`} 
              alt="OD Fish Co." 
              className="h-12 w-auto mix-blend-multiply" 
            />
          </Link>
          <nav className="hidden md:flex items-center gap-8 font-medium text-sm text-foreground/80">
            <a href="#about" className="hover:text-primary transition-colors">Our Catch</a>
            <a href="#process" className="hover:text-primary transition-colors">The Process</a>
            <a href="#delivery" className="hover:text-primary transition-colors">Delivery</a>
          </nav>
          <div className="flex items-center">
             {/* A placeholder for a potential CTA button if we want one */}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="bg-foreground text-background py-16 mt-20">
        <div className="container mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <span className="font-serif text-2xl font-bold mb-4 block">OD Fish Co.</span>
            <p className="text-background/70 text-sm max-w-xs">
              Elevating fresh seafish, every day. 
              Cleaned, cut, and delivered to your doorstep in Mumbai.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-background/50">Contact</h4>
            <ul className="space-y-2 text-sm text-background/80">
              <li>Sassoon Dock, Mumbai</li>
              <li>support@odfish.co</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-background/50">Legal</h4>
            <ul className="space-y-2 text-sm text-background/80">
              <li>Terms of Service</li>
              <li>Privacy Policy</li>
              <li>Refunds & Cancellations</li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 md:px-8 mt-16 pt-8 border-t border-background/10 text-xs text-background/40 text-center md:text-left">
          © {new Date().getFullYear()} OD Fish Co. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
