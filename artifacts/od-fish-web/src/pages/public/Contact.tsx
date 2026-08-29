import { Clock, Mail, MapPin, Phone } from "lucide-react";
import {
  LEGAL_DETAILS,
  PolicyLayout,
  PolicyList,
  PolicySection,
} from "@/components/layouts/PolicyLayout";

export default function Contact() {
  return (
    <PolicyLayout
      eyebrow="Support"
      title="Contact OD Fish Co."
      summary="We are here to help with orders, delivery, payments and concerns about the quality of your catch."
    >
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <Phone className="mb-4 h-6 w-6 text-primary" />
          <h2 className="font-serif text-xl font-bold">Call or WhatsApp</h2>
          <p className="mt-2 text-foreground/70">{LEGAL_DETAILS.supportPhone}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <Mail className="mb-4 h-6 w-6 text-primary" />
          <h2 className="font-serif text-xl font-bold">Email</h2>
          <p className="mt-2 break-words text-foreground/70">{LEGAL_DETAILS.supportEmail}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <Clock className="mb-4 h-6 w-6 text-primary" />
          <h2 className="font-serif text-xl font-bold">Customer service hours</h2>
          {/* TODO(client): Confirm and replace with the actual staffed support hours. */}
          <p className="mt-2 text-foreground/70">[Support hours to be confirmed]</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <MapPin className="mb-4 h-6 w-6 text-primary" />
          <h2 className="font-serif text-xl font-bold">Registered office</h2>
          <p className="mt-2 text-foreground/70">{LEGAL_DETAILS.registeredAddress}</p>
        </div>
      </section>

      <PolicySection title="For the fastest help">
        <PolicyList>
          <li>Include your order number and the mobile number used for the order.</li>
          <li>For delivery help, tell us the selected slot and complete address.</li>
          <li>For payment help, include the payment method, amount and transaction reference—but never a card PIN, CVV or UPI PIN.</li>
          <li>For a quality, damage, wrong-item or weight concern, contact us within 2 hours and attach clear photographs.</li>
        </PolicyList>
      </PolicySection>

      <PolicySection title="Business details">
        <p>Brand: OD Fish Co.</p>
        <p>Legal entity: {LEGAL_DETAILS.registeredName}</p>
        <p>GSTIN: {LEGAL_DETAILS.gstin}</p>
        <p>Registered address: {LEGAL_DETAILS.registeredAddress}</p>
      </PolicySection>

      <PolicySection title="Escalations">
        <p>
          If a support response does not resolve your concern, reply on the same email or
          WhatsApp thread and ask for escalation. For a privacy grievance, identify the request
          as “Privacy grievance” so it can be routed appropriately.
        </p>
      </PolicySection>
    </PolicyLayout>
  );
}
