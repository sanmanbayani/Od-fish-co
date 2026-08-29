import {
  LEGAL_DETAILS,
  PolicyLayout,
  PolicyList,
  PolicySection,
} from "@/components/layouts/PolicyLayout";

export default function Privacy() {
  return (
    <PolicyLayout
      eyebrow="Legal"
      title="Privacy Policy"
      summary="How OD Fish Co. collects, uses, shares and protects personal information when serving customers."
    >
      <PolicySection title="1. Who controls your information">
        <p>
          This policy applies to OD Fish Co., operated by {LEGAL_DETAILS.registeredName}, at{" "}
          {LEGAL_DETAILS.registeredAddress}. It covers our website, ordering experience and
          customer-support interactions.
        </p>
      </PolicySection>

      <PolicySection title="2. Information we collect">
        <PolicyList>
          <li>Identity and contact details, such as your name, mobile number and email address.</li>
          <li>Delivery details, including address, pincode, directions and selected slot.</li>
          <li>Order history, preferences, refunds, complaints and communications with support.</li>
          <li>Payment status, method and transaction references. Payment providers handle complete card or UPI credentials.</li>
          <li>Technical and usage data such as IP address, browser, device, pages visited, cookies and diagnostic events.</li>
          <li>Photographs or other evidence you voluntarily submit with a quality complaint.</li>
        </PolicyList>
      </PolicySection>

      <PolicySection title="3. Why we use it">
        <PolicyList>
          <li>To verify serviceability, accept payment, prepare, deliver and confirm orders by OTP.</li>
          <li>To provide support and decide refund, replacement and cancellation requests.</li>
          <li>To prevent fraud, secure our services and maintain transaction and tax records.</li>
          <li>To operate, troubleshoot and improve products, delivery slots and the customer experience.</li>
          <li>To send order and service messages, and marketing only where permitted; you may opt out of promotional messages.</li>
          <li>To comply with law, lawful requests and our contractual obligations.</li>
        </PolicyList>
        <p>
          We process information as necessary to fulfil your order, comply with legal duties,
          protect legitimate business and security interests, and on the basis of consent where
          consent is required.
        </p>
      </PolicySection>

      <PolicySection title="4. When we share information">
        <p>We share only what is reasonably necessary with:</p>
        <PolicyList>
          <li>Payment gateways, banks and fraud-prevention providers for transactions.</li>
          <li>Riders and delivery partners for fulfilment and OTP-confirmed handover.</li>
          <li>Cloud hosting, communications, analytics and customer-support service providers acting for us.</li>
          <li>Professional advisers, regulators, courts or law enforcement where required or permitted by law.</li>
          <li>A successor in a merger, financing or sale, subject to appropriate confidentiality safeguards.</li>
        </PolicyList>
        <p>We do not sell or rent personal information.</p>
      </PolicySection>

      <PolicySection title="5. Cookies and payment security">
        <p>
          We may use essential cookies for sessions, checkout and security, and limited
          analytics cookies to understand site performance. Browser settings can block
          non-essential cookies, but some functions may then not work correctly.
        </p>
        <p>
          Online payment details are transmitted to the selected payment provider over secure
          connections. We receive transaction status and references, not complete card numbers,
          CVV or UPI PINs. Never share a card PIN, CVV or UPI PIN with our staff or riders.
        </p>
      </PolicySection>

      <PolicySection title="6. Retention and security">
        <p>
          We retain information only as long as needed for fulfilment, support, fraud prevention,
          accounting, tax and legal requirements, and dispute resolution. Retention periods vary
          by record type. We use reasonable administrative and technical safeguards, but no
          internet transmission or storage system is completely secure.
        </p>
      </PolicySection>

      <PolicySection title="7. Your choices and rights">
        <p>
          Subject to applicable Indian law, you may ask to access, correct or erase personal
          information, withdraw consent, or raise a grievance. Some information must be retained
          for legal, tax, fraud-prevention or transaction-record purposes. To make a request,
          contact us and provide enough information to verify your account.
        </p>
      </PolicySection>

      <PolicySection title="8. Children, changes and grievances">
        <p>
          Our service is not directed to children, and orders should be placed by adults legally
          capable of contracting. We may update this policy and will post the revised date here.
        </p>
        <p>
          For privacy requests or grievances, contact the Grievance Officer at{" "}
          {LEGAL_DETAILS.supportEmail}, {LEGAL_DETAILS.supportPhone}, or write to{" "}
          {LEGAL_DETAILS.registeredAddress}.
        </p>
        {/* TODO(client): Identify the appointed Grievance Officer by name if required for the business. */}
        <p>Grievance Officer: [Name to be confirmed].</p>
      </PolicySection>
    </PolicyLayout>
  );
}
