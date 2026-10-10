import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-grid place-items-center rounded-[10px] bg-accent text-accent-ink shadow-sm",
        className,
      )}
      aria-hidden
    >
      {/* Lumi mark: a rising trail of light — three concave sparks */}
      <svg viewBox="0 0 24 24" className="h-[62%] w-[62%]">
        <path
          d="M10,8.3 Q10,13.5 15.2,13.5 Q10,13.5 10,18.7 Q10,13.5 4.8,13.5 Q10,13.5 10,8.3 Z"
          fill="#fffdf8"
        />
        <path
          d="M15.5,6.1 Q15.5,9 18.4,9 Q15.5,9 15.5,11.9 Q15.5,9 12.6,9 Q15.5,9 15.5,6.1 Z"
          fill="#c6f24e"
        />
        <path
          d="M18.3,3.8 Q18.3,5.3 19.8,5.3 Q18.3,5.3 18.3,6.8 Q18.3,5.3 16.8,5.3 Q18.3,5.3 18.3,3.8 Z"
          fill="#ff6b5b"
        />
      </svg>
    </span>
  );
}

export function Logo({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={cn("h-8 w-8", markClassName)} />
      <span className="font-display text-[19px] font-semibold tracking-tight text-ink">
        Lu<span className="text-accent">mi</span>
      </span>
    </span>
  );
}
