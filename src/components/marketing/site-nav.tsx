import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b-2 border-line bg-paper/80 backdrop-blur-md">
      <Container className="flex h-[68px] items-center justify-between gap-6">
        <Link href="/" aria-label="Lumi home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-semibold text-ink-soft md:flex">
          <a className="transition-colors hover:text-ink" href="#how">
            How it works
          </a>
          <a className="transition-colors hover:text-ink" href="#features">
            Features
          </a>
          <a className="transition-colors hover:text-ink" href="#free">
            Pricing
          </a>
        </nav>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <Link href="/">
            <Button size="sm">Open Lumi</Button>
          </Link>
        </div>
      </Container>
    </header>
  );
}
