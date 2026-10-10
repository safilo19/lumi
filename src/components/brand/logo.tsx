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
      {/* simple geometric mark: woven sheets */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-[60%] w-[60%]"
        strokeWidth={2}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 7.5 12 4l8 3.5-8 3.5-8-3.5Z" />
        <path d="M4 12.5 12 16l8-3.5" />
        <path d="M4 17 12 20l8-3" opacity={0.6} />
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
        Note<span className="text-accent">Weaver</span>
      </span>
    </span>
  );
}
