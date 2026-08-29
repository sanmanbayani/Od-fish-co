import { PolicyLayout, PolicyList, PolicySection } from "@/components/layouts/PolicyLayout";

export default function Refunds() {
  return (
    <PolicyLayout
      eyebrow="Orders"
      title="Refund & Cancellation Policy"
      summary="A practical policy for cut-to-order, perishable seafood—including when an order can be cancelled and how quality issues are resolved."
    >
      <PolicySection title="Order cancellations">
        <p>
          You may cancel an order online for a full refund until its status shows that the
          kitchen has started preparing it. Once preparation begins, the fish is being cleaned
          and cut specifically for you, so online cancellation is disabled.
        </p>
        <p>
          After preparation starts, call support immediately. We will try to stop the order, but
          cancellation is not guaranteed. If preparation or dispatch cannot reasonably be
          stopped, no cancellation refund is due. Refusing a valid delivery is treated the same
          way because the seafood cannot be restocked.
        </p>
      </PolicySection>

      <PolicySection title="Cancellations by OD Fish Co.">
        <p>
          We may cancel all or part of an order because of catch availability, quality checks,
          payment failure, an incorrect or unserviceable address, safety concerns or events
          beyond reasonable control. We will notify you and initiate a full refund for any
          prepaid item we cancel. Cash-on-delivery orders are not charged for cancelled items.
        </p>
      </PolicySection>

      <PolicySection title="No returns after handover">
        <p>
          Fresh seafood is perishable and cannot safely re-enter inventory. We therefore do not
          accept physical returns or exchanges once handover is confirmed by delivery OTP. This
          does not prevent you from making an eligible quality or fulfilment complaint.
        </p>
      </PolicySection>

      <PolicySection title="Report a problem within 2 hours">
        <p>
          Inspect your order as soon as it arrives. Contact support within 2 hours of delivery
          if an item is missing or incorrect, the pack is damaged, freshness is unsatisfactory,
          or the net weight is materially outside the range disclosed for that pack.
        </p>
        <PolicyList>
          <li>Provide the order number and registered phone number.</li>
          <li>Describe the issue and when you noticed it.</li>
          <li>Attach clear photographs of the fish, sealed pack/label and any damage or weight shown on a scale.</li>
          <li>Keep the product refrigerated while we review the complaint, unless support advises disposal for safety.</li>
        </PolicyList>
        <p>
          Complaints after 2 hours will still be reviewed, but may be declined where freshness
          or damage can no longer be reliably distinguished from post-delivery storage or
          handling.
        </p>
      </PolicySection>

      <PolicySection title="Expected processing loss">
        <p>
          Packs are sold by disclosed gross weight before cleaning and cutting, with an expected
          net weight range shown before purchase. Loss from scales, guts, head, fins, skin and
          bones is normal. A delivered net weight within that disclosed range is not eligible
          for refund merely because it is lower than gross weight.
        </p>
      </PolicySection>

      <PolicySection title="How approved claims are resolved">
        <p>
          After reviewing the order record and evidence, we may offer a replacement in the next
          available delivery slot or a full or partial refund appropriate to the affected item.
          We will confirm the resolution before processing it. Availability and pincode
          serviceability apply to replacements.
        </p>
      </PolicySection>

      <PolicySection title="Refund timing and method">
        <PolicyList>
          <li>Approved online-payment refunds are initiated to the original payment method.</li>
          <li>Cash-on-delivery refunds will be arranged by a mutually agreed electronic method after required details are verified.</li>
          <li>We aim to initiate approved refunds within 3–5 business days.</li>
          <li>Banks and payment providers may take an additional 5–10 business days to display the credit; their processing times are outside our control.</li>
        </PolicyList>
        <p>
          Delivery charges are refunded when the whole order is cancelled by us or the entire
          delivery is verified as defective. They may not be refunded for a complaint affecting
          only one item.
        </p>
      </PolicySection>
    </PolicyLayout>
  );
}
