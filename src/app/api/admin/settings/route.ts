import { NextResponse } from "next/server";
import { z } from "zod";
import { setSettings } from "@/lib/settings";

const schema = z.record(z.string(), z.string());

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    await setSettings(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Xatolik" },
      { status: 400 }
    );
  }
}
