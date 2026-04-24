"use client";

import { useRouter } from "next/navigation";
import { CardForm, type CardInput } from "@/components/payment/card-form";
import { payEventFee } from "@/lib/actions/payments";

interface Props {
  eventId: string;
  feeDisplay: string;
}

export function CheckoutClient({ eventId, feeDisplay }: Props) {
  const router = useRouter();

  const onPay = async (card: CardInput) => {
    return await payEventFee({ eventId, card });
  };

  const onSuccess = () => {
    router.push(`/events/${eventId}`);
    router.refresh();
  };

  return (
    <CardForm feeDisplay={feeDisplay} onPay={onPay} onSuccess={onSuccess} />
  );
}
