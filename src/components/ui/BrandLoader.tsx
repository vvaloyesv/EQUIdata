import Image from "next/image";
import { cn } from "@/lib/cn";

type BrandLoaderSize = "sm" | "md" | "lg";

const sizeMap: Record<BrandLoaderSize, { frame: number; shell: string; mark: string }> = {
  sm: { frame: 72, shell: "min-h-32", mark: "h-28 w-28" },
  md: { frame: 104, shell: "min-h-56", mark: "h-36 w-36" },
  lg: { frame: 132, shell: "min-h-dvh", mark: "h-44 w-44" },
};

export function BrandLoader({
  label = "Preparando EQUIdata...",
  size = "md",
  fullScreen = false,
  className,
}: {
  label?: string;
  size?: BrandLoaderSize;
  fullScreen?: boolean;
  className?: string;
}) {
  const sizing = sizeMap[size];

  return (
    <div
      className={cn(
        "flex items-center justify-center bg-[var(--color-canvas)] px-6 py-10",
        fullScreen ? "min-h-dvh" : sizing.shell,
        className,
      )}
    >
      <div className="flex flex-col items-center text-center">
        <div
          className={cn(
            "brand-loader-mark relative flex items-center justify-center rounded-full",
            sizing.mark,
          )}
        >
          <span className="brand-loader-orbit brand-loader-orbit-a" />
          <span className="brand-loader-orbit brand-loader-orbit-b" />
          <span className="brand-loader-orbit brand-loader-orbit-c" />
          <div className="brand-loader-logo">
            <Image
              src="/brand/frame.png"
              alt="EQUIdata"
              width={sizing.frame}
              height={sizing.frame}
              className="drop-shadow-[0_18px_22px_rgba(25,41,98,0.16)]"
              priority={fullScreen}
            />
          </div>
        </div>

        <p className="mt-5 font-mono text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">
          {label}
        </p>
      </div>
    </div>
  );
}
