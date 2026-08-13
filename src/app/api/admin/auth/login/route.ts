import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/admin-password";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_DAYS,
  cookieOptions,
  createSessionToken,
  sessionExpiryMs,
} from "@/lib/admin-session";

const schema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(1),
});

const DEFAULT_EMAIL = "admin@luxfabricshop.uz";

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const email = (body.email || DEFAULT_EMAIL).trim().toLowerCase();
    const password = body.password.trim();
    // Vercel UI da ba’zan "parol" qo‘shtirnoq bilan saqlanadi
    const envPass = (process.env.ADMIN_PASSWORD || "")
      .trim()
      .replace(/^["']+|["']+$/g, "");

    let user = await prisma.adminUser.findUnique({ where: { email } });

    let ok = false;
    let matchedEnv = false;
    if (envPass && password === envPass) {
      ok = true;
      matchedEnv = true;
    } else if (user) {
      ok = verifyPassword(password, user.passwordHash);
    }

    if (!ok) {
      return NextResponse.json(
        { error: "Email yoki parol noto‘g‘ri" },
        { status: 401 }
      );
    }

    if (!user) {
      user = await prisma.adminUser.create({
        data: {
          email,
          name: "Luxfabric Admin",
          passwordHash: hashPassword(password),
          role: "ADMIN",
        },
      });
    } else if (matchedEnv) {
      // Vercel ADMIN_PASSWORD yangilanganda DB hash ham sinxron bo‘lsin
      await prisma.adminUser.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(password) },
      });
    }

    const token = await createSessionToken({
      sub: user.id,
      email: user.email,
      exp: sessionExpiryMs(),
    });

    const res = NextResponse.json({
      ok: true,
      email: user.email,
      name: user.name,
    });
    res.cookies.set(
      ADMIN_COOKIE,
      token,
      cookieOptions(ADMIN_SESSION_DAYS * 24 * 60 * 60)
    );
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Xatolik" },
      { status: 400 }
    );
  }
}
