"use client";

import { useRouter } from "next/navigation";
import { CardForm, type CardInput } from "@/components/payment/card-form";
import { payPartyFee } from "@/lib/actions/payments";

interface Props {
  bookingId: string;
  feeDisplay: string;
}

export function PartyCheckoutClient({ bookingId, feeDisplay }: Props) {
  const router = useRouter();

  const onPay = async (card: CardInput) => {
    return await payPartyFee({ bookingId, card });
  };

  const onSuccess = () => {
    router.push("/party-house");
    router.refresh();
  };

  return (
    <CardForm feeDisplay={feeDisplay} onPay={onPay} onSuccess={onSuccess} />
  );
}
