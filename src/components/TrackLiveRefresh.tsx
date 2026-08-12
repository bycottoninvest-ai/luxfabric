"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Admin status o‘zgarganda mijoz tracking sahifasini yangilash (polling). */
export function TrackLiveRefresh({ intervalMs = 20000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = window.setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, router]);

  return null;
}
