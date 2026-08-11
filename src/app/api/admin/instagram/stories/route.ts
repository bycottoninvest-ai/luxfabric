import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const include = {
  product: { select: { id: true, name: true, slug: true, price: true } },
} as const;

export async function GET() {
  const stories = await prisma.instagramStory.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include,
  });
  return NextResponse.json(stories);
}

const schema = z.object({
  title: z.string().min(1),
  caption: z.string().optional(),
  mediaUrl: z.string().min(1),
  mediaType: z.enum(["image", "video"]).optional(),
  productId: z.string().optional().nullable(),
  linkLabel: z.string().optional(),
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const mediaType =
      body.mediaType ||
      (/\.(mp4|webm|mov)(\?|$)/i.test(body.mediaUrl) ? "video" : "image");

    const story = await prisma.instagramStory.create({
      data: {
        title: body.title,
        caption: body.caption || "",
        mediaUrl: body.mediaUrl,
        mediaType,
        productId: body.productId || null,
        linkLabel: body.linkLabel || "Sotib olish",
        isPublished: body.isPublished ?? true,
        sortOrder: body.sortOrder ?? 0,
      },
      include,
    });
    return NextResponse.json(story);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Xatolik" },
      { status: 400 }
    );
  }
}

const patchSchema = schema.partial().extend({ id: z.string() });

export async function PATCH(req: Request) {
  try {
    const body = patchSchema.parse(await req.json());
    const { id, ...data } = body;
    const story = await prisma.instagramStory.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.caption !== undefined ? { caption: data.caption } : {}),
        ...(data.mediaUrl !== undefined ? { mediaUrl: data.mediaUrl } : {}),
        ...(data.mediaType !== undefined ? { mediaType: data.mediaType } : {}),
        ...(data.productId !== undefined ? { productId: data.productId } : {}),
        ...(data.linkLabel !== undefined ? { linkLabel: data.linkLabel } : {}),
        ...(typeof data.isPublished === "boolean" ? { isPublished: data.isPublished } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      },
      include,
    });
    return NextResponse.json(story);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Xatolik" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
    await prisma.instagramStory.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Xatolik" },
      { status: 400 }
    );
  }
}
