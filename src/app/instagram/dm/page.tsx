"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ReelsShell } from "@/components/ReelsShell";
import { Send } from "lucide-react";

type Msg = { from: "user" | "bot"; text: string };

const replies: { match: RegExp; answer: string }[] = [
  {
    match: /narx|price|qancha/i,
    answer: "Futbolka — 129 000 so‘m. Sotib olish: /product/nice-print-futbolka",
  },
  {
    match: /olcham|size|m\b|l\b|xl/i,
    answer: "Omborda: S · M · L · XL · XXL. Qaysi o‘lcham?",
  },
  {
    match: /yetkaz|dostavka|qachon/i,
    answer: "1–2 kun ichida yetkazamiz — butun O‘zbekiston.",
  },
  {
    match: /rang|qora|yashil|oq/i,
    answer: "Ranglar: Qora, Oq, Qizil, Yashil. Havola yuboraymi?",
  },
  {
    match: /buyurtma|order|link|havola/i,
    answer: "Mana: /product/nice-print-futbolka",
  },
];

function answerFor(text: string) {
  const hit = replies.find((r) => r.match.test(text));
  return hit?.answer || "Salom! Narx, o‘lcham yoki yetkazish haqida so‘rang.";
}

export default function InstagramDmPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    { from: "bot", text: "Salom! 👋 Narx yoki o‘lcham so‘rang." },
  ]);

  const quick = useMemo(
    () => ["Narxi qancha?", "M o‘lcham?", "Yetkazish?", "Havola"],
    []
  );

  function send(text: string) {
    const value = text.trim();
    if (!value) return;
    setMessages((m) => [
      ...m,
      { from: "user", text: value },
      {
        from: "bot",
        text: /operator/i.test(value) ? "Tez orada javob beramiz." : answerFor(value),
      },
    ]);
    setInput("");
  }

  return (
    <ReelsShell>
      <div className="flex h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom))] flex-col bg-black">
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-lf-red text-xs font-bold">
            lf
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">luxfabric</div>
            <div className="text-[10px] text-white/45">Online</div>
          </div>
          <Link href="/instagram" className="text-xs text-white/60">
            Reels
          </Link>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                m.from === "user" ? "ml-auto bg-lf-red text-white" : "bg-white/10 text-white"
              }`}
            >
              {m.text.split(/(\/product\/[\w-]+|\/orders)/g).map((part, idx) =>
                part.startsWith("/") ? (
                  <Link key={idx} href={part} className="underline underline-offset-2">
                    ochish
                  </Link>
                ) : (
                  <span key={idx}>{part}</span>
                )
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 px-2 py-2">
          <div className="mb-2 flex gap-1.5 overflow-x-auto">
            {quick.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                className="shrink-0 rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/70"
              >
                {q}
              </button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Xabar..."
              className="flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm outline-none placeholder:text-white/35"
            />
            <button
              type="submit"
              className="rounded-full bg-lf-red p-2.5 text-white"
              aria-label="Yuborish"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </ReelsShell>
  );
}
