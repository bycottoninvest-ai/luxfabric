import { StoreShell } from "@/components/StoreShell";
import { OrderSuccessClient } from "@/components/OrderSuccessClient";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ no?: string; pay?: string; ps?: string; pw?: string }>;
}) {
  const { no, pay, ps, pw } = await searchParams;
  const orderNumber = no || "LF-000000";

  return (
    <StoreShell>
      <OrderSuccessClient
        orderNumber={orderNumber}
        initialPaymentMethod={pay || null}
        initialPaymentStatus={ps || null}
        paymentSetupHint={pw === "1"}
      />
    </StoreShell>
  );
}
