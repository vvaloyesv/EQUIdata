"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";

/** Seis casillas de código OTP, con foco automático al escribir. */
export function OtpInput({
  value,
  onChange,
  length = 6,
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  function setDigit(i: number, d: string) {
    const digit = d.replace(/\D/g, "").slice(-1);
    const chars = value.split("");
    chars[i] = digit;
    const next = chars.join("").slice(0, length);
    onChange(next);
    if (digit && i < length - 1) refs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  }

  return (
    <div className="flex gap-2.5">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          className={cn(
            "h-14 w-12 rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-white text-center font-display text-2xl text-[var(--color-navy)] focus-ring",
            value[i] && "border-[var(--color-navy)]",
          )}
        />
      ))}
    </div>
  );
}
