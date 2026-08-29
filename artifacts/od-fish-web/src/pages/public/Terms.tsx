import {
  LEGAL_DETAILS,
  PolicyLayout,
  PolicyList,
  PolicySection,
} from "@/components/layouts/PolicyLayout";

export default function Terms() {
  return (
    <PolicyLayout
      eyebrow="Legal"
      title="Terms of Service"
      summary="The terms that apply when you browse OD Fish Co. or order our fresh, cut-to-order seafood."
    >
      <PolicySection title="1. About OD Fish Co.">
        <p>
          OD Fish Co. (“we”, “us” or “our”) is operated by {LEGAL_DETAILS.registeredName},
          with its registered address at {LEGAL_DETAILS.registeredAddress} and GSTIN{" "}
          {LEGAL_DETAILS.gstin}. By accessing our website or placing an order, you agree to
          these Terms, our Privacy Policy, Refund &amp; Cancellation Policy, and Delivery
          Policy.
        </p>
        <p>
          You must be legally capable of entering into a contract under Indian law. You are
          responsible for giving complete and accurate contact, address, pincode and payment
          information.
        </p>
      </PolicySection>

      <PolicySection title="2. Product, packs and weights">
        <p>
          We sell fresh, never-frozen seafish in fixed packs by gross weight. Gross weight is
          measured before the selected cleaning and cutting process. Each product displays an
          expected net weight range after processing.
        </p>
        <p>
          Descaling, gutting, removing the head, fins, skin or bones, and cutting naturally
          reduces weight. This expected processing loss is not a shortage where the delivered
          net weight falls within the range disclosed before purchase. Fish is a natural
          product, so colour, shape, piece count and exact yield may vary.
        </p>
        <p>
          Product photographs are illustrative. Availability depends on the day&apos;s catch.
          If an item becomes unavailable after checkout, we will contact you and offer a
          refund or an agreed substitute; we will not make a substitution without consent.
        </p>
      </PolicySection>

      <PolicySection title="3. Orders and acceptance">
        <p>
          An order is a request to purchase. It is accepted when we confirm it for preparation.
          We may reject or cancel an order for stock, serviceability, pricing, safety, payment,
          address or operational reasons. If we cancel a prepaid order, we will initiate a
          refund to the original payment method.
        </p>
        <p>
          Customers may cancel online only until the kitchen begins preparation. After that
          point, cancellation is not guaranteed and must be requested through support because
          the fish is being cut specifically for the order.
        </p>
      </PolicySection>

      <PolicySection title="4. Prices and payment">
        <PolicyList>
          <li>Prices are shown in Indian rupees and include applicable taxes unless stated otherwise.</li>
          <li>Any delivery charge or discount is shown before order confirmation.</li>
          <li>We accept cash on delivery, UPI and supported cards.</li>
          <li>Online payments are processed by authorised third-party payment providers; we do not store complete card details.</li>
        </PolicyList>
        <p>
          A payment debit without an order confirmation may be a pending or failed transaction.
          Contact support with the transaction reference so it can be traced.
        </p>
      </PolicySection>

      <PolicySection title="5. Delivery and handover">
        <p>
          Delivery is offered only to serviceable Mumbai pincodes and in available slots.
          Quoted times are estimates and may be affected by traffic, weather, catch availability
          or other circumstances outside reasonable control.
        </p>
        <p>
          Handover is completed when the customer or an authorised recipient reads the delivery
          OTP to the rider. Sharing the OTP confirms receipt and the apparent condition of the
          package. Please check the package and item count before providing it.
        </p>
      </PolicySection>

      <PolicySection title="6. Freshness, storage and use">
        <p>
          Seafood is highly perishable. Refrigerate it immediately on receipt and cook it
          promptly. Follow safe food-handling practices and do not consume fish that has been
          left unrefrigerated. Customers are responsible for storage and handling after OTP
          handover, including checking for allergies and suitability.
        </p>
      </PolicySection>

      <PolicySection title="7. Complaints, refunds and liability">
        <p>
          No returns are accepted after handover because fresh seafood cannot safely be
          restocked. Quality, wrong-item, damage or material weight complaints should be raised
          within 2 hours of delivery with clear photographs. Eligible claims are handled under
          our Refund &amp; Cancellation Policy.
        </p>
        <p>
          Nothing in these Terms excludes rights or remedies that cannot be excluded under
          applicable Indian consumer law. To the extent permitted by law, we are not responsible
          for indirect or consequential loss, or loss caused by incorrect customer information,
          missed delivery, unauthorised OTP sharing, or improper post-delivery storage.
        </p>
      </PolicySection>

      <PolicySection title="8. Website use and intellectual property">
        <p>
          Site content, branding, photographs and design are owned by or licensed to us. You may
          use the site for personal shopping only. You must not misuse the site, interfere with
          its operation, attempt unauthorised access, scrape content at scale, or use our
          intellectual property without permission.
        </p>
      </PolicySection>

      <PolicySection title="9. Changes, governing law and contact">
        <p>
          We may update these Terms prospectively by posting a revised version and date. Terms
          applicable when an order was placed continue to govern that order. These Terms are
          governed by Indian law, and courts with jurisdiction in Mumbai, Maharashtra will have
          jurisdiction, subject to applicable consumer-forum rights.
        </p>
        <p>
          Legal notices may be sent to {LEGAL_DETAILS.supportEmail} or{" "}
          {LEGAL_DETAILS.registeredAddress}.
        </p>
      </PolicySection>
    </PolicyLayout>
  );
}
