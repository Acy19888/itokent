"use client";

import { useRouter } from "next/navigation";
import { CardForm, type CardInput } from "@/components/payment/card-form";
import { payMaintenanceFee } from "@/lib/actions/payments";

interface Props {
  ticketId: string;
  feeDisplay: string;
}

export function MaintenanceCheckoutClient({ ticketId, feeDisplay }: Props) {
  const router = useRouter();

  const onPay = async (card: CardInput) => {
    return await payMaintenanceFee({ ticketId, card });
  };

  const onSuccess = () => {
    router.push("/maintenance");
    router.refresh();
  };

  return (
    <CardForm feeDisplay={feeDisplay} onPay={onPay} onSuccess={onSuccess} />
  );
}
