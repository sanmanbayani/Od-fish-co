import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PolicyLayout } from "@/components/layouts/PolicyLayout";

const questions = [
  {
    question: "Is your fish fresh or frozen?",
    answer:
      "Our seafish is sold fresh and never frozen. We select the catch, keep it chilled on clean ice, and clean and cut it only after an order is accepted for same-day delivery.",
  },
  {
    question: "Why is the net weight lower than the pack's gross weight?",
    answer:
      "The fixed pack is sold by gross weight before processing. Cleaning choices such as descaling, gutting and removing the head, fins, skin or bones cause natural weight loss. Every pack shows an expected net weight range before purchase so you know the likely take-home yield.",
  },
  {
    question: "Will the piece count always be the same?",
    answer:
      "Not necessarily. Fish vary naturally in size, and cuts vary in thickness and shape. We fulfil the selected pack and cut, with net yield expected to fall within the range displayed for it.",
  },
  {
    question: "Where do you deliver?",
    answer:
      "We deliver only to serviceable Mumbai pincodes. Use the pincode checker on our storefront before ordering. Coverage and slot availability can change with daily capacity.",
  },
  {
    question: "Is delivery always on the same day?",
    answer:
      "Available orders are prepared and delivered in the same-day slot selected at checkout. The displayed window is an estimate; traffic, heavy rain or operational disruption can cause delays, in which case we will try to update you.",
  },
  {
    question: "How does delivery OTP handover work?",
    answer:
      "When the order is physically with you, inspect the package and read the OTP sent to your registered mobile number to the rider. The correct OTP confirms handover. Never share it remotely or before the rider arrives.",
  },
  {
    question: "Which payment methods do you accept?",
    answer:
      "You can pay by cash on delivery, UPI or supported cards. Available methods and any delivery charge are shown at checkout.",
  },
  {
    question: "Can I cancel my order?",
    answer:
      "You can cancel online until the kitchen starts preparing the order. After preparation begins, call support immediately. Cancellation is then not guaranteed because the fish is being cut specifically for you.",
  },
  {
    question: "Can I return seafood after delivery?",
    answer:
      "No. Fresh seafood cannot safely be restocked, so physical returns are not accepted after OTP-confirmed handover. Eligible quality and fulfilment complaints can still receive a refund or replacement.",
  },
  {
    question: "What should I do if there is a quality or order issue?",
    answer:
      "Refrigerate the product and contact support within 2 hours of delivery. Send your order number, a description, and clear photos of the fish, pack label and any damage or weight issue. We will review it and may provide a refund or replacement in the next available slot.",
  },
  {
    question: "How should I store the fish?",
    answer:
      "Refrigerate it immediately on receipt, keep it properly covered and cook it promptly. Do not consume seafood that has been left unrefrigerated, and follow safe handling practices in your kitchen.",
  },
];

export default function Faq() {
  return (
    <PolicyLayout
      eyebrow="Help"
      title="Frequently Asked Questions"
      summary="Straight answers about freshness, weights, delivery, payment, cancellations and quality support."
    >
      <Accordion type="single" collapsible className="border-t border-border">
        {questions.map(({ question, answer }, index) => (
          <AccordionItem key={question} value={`item-${index}`}>
            <AccordionTrigger className="py-6 text-left font-serif text-lg font-bold text-primary hover:no-underline">
              {question}
            </AccordionTrigger>
            <AccordionContent className="max-w-2xl pb-6 text-base leading-7 text-foreground/75">
              {answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </PolicyLayout>
  );
}
