import Image from "next/image";
import Link from "next/link";

// PRD §9.4: About, logo, Support on one line at every size, with the
// "By The Gyaan Project" line centred on its own row below. Links are 44px tall and the logo is
// nudged down 4px so both share the same centre line.
export default function Header() {
  // Logo is 83×29; shown at 36px tall.
  const wordmark = <Image src="/asktgp-logo.svg" alt="asktgp" width={103} height={36} priority className="block h-[36px] w-auto" />;

  return (
    <header className="px-4 lg:px-9 pt-[max(16px,env(safe-area-inset-top))] lg:pt-7">
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-x-2">
        <Link href="/about" className="justify-self-start t-body inline-flex items-center min-h-11 hover:text-ink-muted">
          About
        </Link>
        <div className="flex justify-center pt-1">
          <Link href="/" aria-label="asktgp home" className="hover:opacity-80">{wordmark}</Link>
        </div>
        <Link href="/donate" className="justify-self-end t-body inline-flex items-center justify-end min-h-11 hover:text-ink-muted">
          Support
        </Link>
        {/* Own full-width row: keeps it on one line on phones and leaves the
            logo column only as wide as the logo, so the logo sits dead centre. */}
        <p className="col-span-3 mt-3.5 text-center t-small">
          By{" "}
          <a href="https://thegyaanproject.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink-muted">
            The Gyaan Project
          </a>
        </p>
      </div>
    </header>
  );
}
