import React from "react";
import { Link } from "wouter";
import { Menu } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// This header is shared by every public page, so the section anchors have to be
// absolute. A bare "#about" from /faq or /contact jumps to a target that does
// not exist on that page instead of returning to the storefront section.
const base = import.meta.env.BASE_URL;

const sectionLinks = [
  { href: `${base}#about`, label: "Our Catch" },
  { href: `${base}#process`, label: "The Process" },
  { href: `${base}#delivery`, label: "Delivery" },
];

const pageLinks = [
  { href: "/faq", label: "FAQ" },
  { href: "/shipping", label: "Delivery Policy" },
  { href: "/contact", label: "Contact" },
];

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col font-sans">
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/40 pt-safe">
        <div className="container mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center group">
            <BrandLogo className="h-9 md:h-11 w-auto text-primary transition-transform duration-500 group-hover:scale-105" />
          </Link>
          <nav className="hidden md:flex items-center gap-8 font-medium text-sm text-foreground/80">
            {sectionLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="hover:text-primary transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
          {/* Mobile menu — without this the nav links are unreachable on a phone */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[16rem] pt-safe">
              <SheetTitle className="font-serif text-lg">Menu</SheetTitle>
              <SheetDescription className="sr-only">
                Site navigation
              </SheetDescription>
              <nav className="mt-6 flex flex-col gap-1 text-base font-medium">
                {sectionLinks.map((link) => (
                  <SheetClose asChild key={link.href}>
                    <a
                      href={link.href}
                      className="rounded-md px-2 py-3 hover:bg-muted"
                    >
                      {link.label}
                    </a>
                  </SheetClose>
                ))}
                <div className="my-2 border-t border-border/60" />
                {pageLinks.map((link) => (
                  <SheetClose asChild key={link.href}>
                    <Link
                      href={link.href}
                      className="rounded-md px-2 py-3 text-foreground/80 hover:bg-muted"
                    >
                      {link.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="bg-primary text-primary-foreground py-16 relative overflow-hidden">
        
        <div className="container mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-4 gap-12 relative z-10">
          <div className="md:col-span-2">
            <BrandLogo className="h-10 w-auto text-primary-foreground mb-6 opacity-90" />
            <p className="text-primary-foreground/70 text-sm max-w-sm leading-relaxed">
              Elevating fresh <span className="italic">seafish</span>, every day. 
              Cleaned, cut, and delivered to your doorstep in Mumbai.
              Dawn catch from Sassoon Dock, no ammonia, no compromise.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-primary-foreground/70">Information</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li><Link href="/shipping" className="hover:text-primary-foreground transition-colors">Delivery Policy</Link></li>
              <li><Link href="/faq" className="hover:text-primary-foreground transition-colors">Frequently Asked Questions</Link></li>
              <li><Link href="/contact" className="hover:text-primary-foreground transition-colors">Contact Us</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-primary-foreground/70">Legal</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li><Link href="/terms" className="hover:text-primary-foreground transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-primary-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link href="/refunds" className="hover:text-primary-foreground transition-colors">Refunds &amp; Cancellations</Link></li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 md:px-8 mt-16 pt-8 border-t border-primary-foreground/10 text-xs text-primary-foreground/70 text-center md:text-left">
          © {new Date().getFullYear()} OD Fish Co. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
