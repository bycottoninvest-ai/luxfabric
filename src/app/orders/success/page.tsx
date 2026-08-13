import { StoreShell } from "@/components/StoreShell";
import { OrderSuccessClient } from "@/components/OrderSuccessClient";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ no?: string }>;
}) {
  const { no } = await searchParams;
  const orderNumber = no || "LF-000000";

  return (
    <StoreShell>
      <OrderSuccessClient orderNumber={orderNumber} />
    </StoreShell>
  );
}
