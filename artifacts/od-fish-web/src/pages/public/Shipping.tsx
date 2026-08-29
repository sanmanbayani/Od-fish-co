import { PolicyLayout, PolicyList, PolicySection } from "@/components/layouts/PolicyLayout";

export default function Shipping() {
  return (
    <PolicyLayout
      eyebrow="Delivery"
      title="Delivery Policy"
      summary="How our same-day, slot-based delivery works for fresh seafish across serviceable Mumbai pincodes."
    >
      <PolicySection title="Where we deliver">
        <p>
          We deliver only within currently serviceable Mumbai pincodes. Enter your six-digit
          pincode on the storefront or during checkout to check coverage. Serviceability may
          change due to capacity, weather, road access or operational conditions, and an address
          outside an enabled pincode cannot be accepted.
        </p>
      </PolicySection>

      <PolicySection title="Same-day delivery slots">
        <p>
          Available slots are shown before checkout and depend on order time, catch availability
          and kitchen and rider capacity. Select a slot and complete the order before its
          cut-off. A slot is confirmed only with the order confirmation.
        </p>
        <p>
          We aim to arrive within the confirmed window, but it is an estimate rather than a
          guaranteed appointment. Mumbai traffic, heavy rain, local restrictions or other events
          may cause delay. If there is a material delay, we will use your registered contact
          details to update you.
        </p>
      </PolicySection>

      <PolicySection title="Preparation and cold handling">
        <p>
          Fish is sourced fresh, never frozen, and cleaned and cut after your order is accepted.
          It is packed for chilled transport and dispatched for same-day delivery. Please
          arrange immediate receipt and refrigeration; this is not a product that can be left
          unattended.
        </p>
      </PolicySection>

      <PolicySection title="Address and recipient responsibilities">
        <PolicyList>
          <li>Provide a complete address, correct pincode, landmark and reachable mobile number.</li>
          <li>Ensure you or an authorised adult recipient is available throughout the slot.</li>
          <li>Answer rider calls needed to locate the address or complete handover.</li>
          <li>Inspect the package and item count before sharing the OTP.</li>
        </PolicyList>
        <p>
          We cannot change delivery to an unserviceable pincode. An address change after
          preparation or dispatch may be refused or moved to a later available slot.
        </p>
      </PolicySection>

      <PolicySection title="OTP-confirmed handover">
        <p>
          The delivery OTP is sent to the customer&apos;s registered mobile number. Read it to
          the rider only when the order is physically present. A correct OTP confirms delivery
          to you or your authorised recipient. Do not share it remotely or before arrival.
        </p>
      </PolicySection>

      <PolicySection title="Missed and failed deliveries">
        <p>
          If no recipient can be reached, the rider will make a reasonable attempt to contact
          you and may wait briefly, subject to other deliveries and food-safety limits. We may
          attempt redelivery in a later slot where safe and operationally possible, but an
          additional charge may apply.
        </p>
        <p>
          Because seafood is perishable and cut to order, an order that cannot be handed over
          due to an incorrect address, unavailable recipient or unanswered contact may be
          treated as fulfilled without refund. If failure is caused by us, we will offer a
          replacement in the next available slot or a refund.
        </p>
      </PolicySection>

      <PolicySection title="Charges and support">
        <p>
          Any delivery fee, minimum order value or promotion is displayed at checkout before
          payment. If an order arrives damaged, incorrect or with a quality concern, refrigerate
          it and contact support within 2 hours with photographs under our Refund &amp;
          Cancellation Policy.
        </p>
      </PolicySection>
    </PolicyLayout>
  );
}
