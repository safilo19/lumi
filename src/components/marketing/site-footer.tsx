import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t-2 border-line py-10">
      <Container className="flex flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <Logo />
          <p className="text-sm font-semibold text-ink-faint">
            Made for CUST students, free forever.
          </p>
        </div>

        <nav className="flex items-center gap-6 text-sm font-semibold text-ink-soft">
          <a className="transition-colors hover:text-ink" href="#how">
            How it works
          </a>
          <a className="transition-colors hover:text-ink" href="#features">
            Features
          </a>
          <Link className="transition-colors hover:text-ink" href="/login">
            Sign in
          </Link>
        </nav>
      </Container>
    </footer>
  );
}
