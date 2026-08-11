import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ kind: string; value: string }> };

/** Universal QR landing: /q/sku/BARCODE | /q/order/LF-xxx | /q/warehouse/id */
export default async function QrLandingPage({ params }: Props) {
  const { kind, value } = await params;
  const decoded = decodeURIComponent(value);

  if (kind === "order") {
    redirect(`/card/${decoded.toUpperCase()}`);
  }

  if (kind === "sku") {
    const variant = await prisma.productVariant.findUnique({
      where: { barcode: decoded },
      include: { product: true },
    });
    if (!variant) notFound();
    redirect(`/product/${variant.product.slug}`);
  }

  if (kind === "warehouse") {
    redirect(`/admin/warehouse`);
  }

  notFound();
}
