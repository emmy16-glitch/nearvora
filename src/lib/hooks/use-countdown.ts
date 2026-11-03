"use client";

import { useEffect, useState } from "react";

export function useCountdown(iso: string | null | undefined) {
  const [seconds, setSeconds] = useState(() => remaining(iso));

  useEffect(() => {
    setSeconds(remaining(iso));
    if (!iso) return;
    const timer = setInterval(() => setSeconds(remaining(iso)), 1000);
    return () => clearInterval(timer);
  }, [iso]);

  return { seconds, expired: seconds <= 0 };
}

function remaining(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000));
}

export function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}
