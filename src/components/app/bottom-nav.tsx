"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HouseIcon,
  BooksIcon,
  MicrophoneIcon,
  CardsIcon,
  GearSixIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Home", icon: HouseIcon },
  { href: "/courses", label: "Courses", icon: BooksIcon },
  { href: "/library", label: "Library", icon: CardsIcon },
  { href: "/settings", label: "You", icon: GearSixIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-line bg-paper/90 backdrop-blur-md lg:hidden">
      <div className="relative mx-auto grid max-w-md grid-cols-5 items-center px-2 pb-[env(safe-area-inset-bottom)]">
        {tabs.slice(0, 2).map((tab) => (
          <Tab key={tab.href} tab={tab} active={pathname === tab.href} />
        ))}

        {/* raised record action in the center */}
        <div className="flex justify-center">
          <Link
            href="/record"
            aria-label="Record a lecture"
            className="-mt-7 flex h-16 w-16 items-center justify-center rounded-[22px] border-4 border-paper bg-coral text-coral-ink shadow-[0_6px_0_var(--coral-deep)] transition-transform active:translate-y-[3px]"
          >
            <MicrophoneIcon size={28} weight="fill" />
          </Link>
        </div>

        {tabs.slice(2).map((tab) => (
          <Tab key={tab.href} tab={tab} active={pathname === tab.href} />
        ))}
      </div>
    </nav>
  );
}

function Tab({
  tab,
  active,
}: {
  tab: { href: string; label: string; icon: typeof HouseIcon };
  active: boolean;
}) {
  return (
    <Link
      href={tab.href}
      className={cn(
        "flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold transition-colors",
        active ? "text-accent" : "text-ink-faint",
      )}
    >
      <tab.icon size={23} weight={active ? "fill" : "regular"} />
      {tab.label}
    </Link>
  );
}
