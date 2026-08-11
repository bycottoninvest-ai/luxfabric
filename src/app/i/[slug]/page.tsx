import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ slug: string }> };

/**
 * Instagram Story / post havolasi.
 * Mijoz ochganda birinchi shu model (mahsulot) sahifasi chiqadi.
 */
export default async function InstagramProductGate({ params }: Props) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    select: { slug: true },
  });
  if (!product) notFound();
  redirect(`/product/${product.slug}?from=instagram`);
}
