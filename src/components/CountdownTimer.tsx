"use client";

import { useEffect, useState } from "react";

export function CountdownTimer({ hours = 2 }: { hours?: number }) {
  const [left, setLeft] = useState(hours * 3600);

  useEffect(() => {
    const id = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  const h = String(Math.floor(left / 3600)).padStart(2, "0");
  const m = String(Math.floor((left % 3600) / 60)).padStart(2, "0");
  const s = String(left % 60).padStart(2, "0");

  return (
    <span className="tabular-nums">
      {h}:{m}:{s}
    </span>
  );
}
