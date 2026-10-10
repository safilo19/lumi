"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SquaresFourIcon,
  MicrophoneIcon,
  BooksIcon,
  CaretRightIcon,
  GearSixIcon,
  SignOutIcon,
} from "@phosphor-icons/react";
import { Logo } from "@/components/brand/logo";
import { courses } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Dashboard", icon: SquaresFourIcon },
  { href: "/record", label: "New recording", icon: MicrophoneIcon },
];

export type SidebarUser = { name: string; role: string };

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("") || "NW";
}

export function AppSidebar({ user }: { user?: SidebarUser | null }) {
  const pathname = usePathname();
  const roleLabel = user?.role === "teacher" ? "CUST teacher" : "CUST student";

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r-2 border-line bg-surface/50 lg:flex">
      <div className="flex h-[64px] items-center px-6">
        <Link href="/" aria-label="Lumi home">
          <Logo />
        </Link>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-input)] px-3 py-2.5 text-[15px] font-semibold transition-colors",
                active
                  ? "bg-accent-weak font-display text-accent-weak-ink"
                  : "text-ink-soft hover:bg-surface-2 hover:text-ink",
              )}
            >
              <item.icon size={19} weight={active ? "fill" : "bold"} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 px-6">
        <div className="flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-wide text-ink-faint">
          <BooksIcon size={14} weight="bold" />
          Courses
        </div>
      </div>

      <div className="mt-2 flex flex-1 flex-col gap-0.5 overflow-y-auto px-3">
        {courses.map((course) => {
          const href = `/courses/${course.id}`;
          const active = pathname === href;
          return (
            <Link
              key={course.id}
              href={href}
              className={cn(
                "group flex items-center justify-between rounded-[var(--radius-input)] px-3 py-2 text-sm font-semibold transition-colors",
                active
                  ? "bg-surface-2 text-ink"
                  : "text-ink-soft hover:bg-surface-2 hover:text-ink",
              )}
            >
              <span className="truncate">
                <span className="font-display font-semibold text-ink">{course.code}</span>
                <span className="ml-2 font-semibold text-ink-faint">{course.name}</span>
              </span>
              <CaretRightIcon
                size={14}
                weight="bold"
                className="shrink-0 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100"
              />
            </Link>
          );
        })}
      </div>

      <div className="border-t-2 border-line p-3">
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius-input)] border-2 border-transparent px-2 py-2 transition-colors hover:border-line hover:bg-surface-2"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent font-display text-sm font-semibold text-accent-ink">
              {initials(user?.name ?? "")}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">
                {user?.name ?? "Your account"}
              </span>
              <span className="block truncate text-xs font-semibold text-ink-faint">
                {roleLabel}
              </span>
            </span>
            <GearSixIcon size={16} weight="bold" className="shrink-0 text-ink-faint" />
          </Link>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              aria-label="Sign out"
              className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-input)] border-2 border-transparent text-ink-faint transition-colors hover:border-line hover:bg-surface-2 hover:text-coral"
            >
              <SignOutIcon size={17} weight="bold" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
