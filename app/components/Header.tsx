import Link from "next/link";

// PRD §9.4: mobile — About/Support in the top corners, wordmark centred below.
// lg — About, wordmark, Support on one line.
export default function Header({ onWordmarkClick }: { onWordmarkClick?: () => void }) {
  const wordmark = (
    <span className="t-heading lowercase">
      asktgp
    </span>
  );

  return (
    <header className="px-4 lg:px-9 pt-[max(16px,env(safe-area-inset-top))] lg:pt-7">
      <div className="grid grid-cols-2 lg:grid-cols-[1fr_auto_1fr] items-start">
        <Link href="/about" className="justify-self-start t-small inline-flex items-center min-h-11 hover:opacity-60">
          About
        </Link>
        <div className="col-span-2 row-start-2 lg:col-span-1 lg:row-start-1 lg:col-start-2 flex flex-col items-center lg:pt-2">
          {onWordmarkClick ? (
            <button type="button" onClick={onWordmarkClick} aria-label="asktgp home" className="cursor-pointer">
              {wordmark}
            </button>
          ) : (
            <Link href="/" aria-label="asktgp home">{wordmark}</Link>
          )}
          <p className="mt-1.5 t-small">
            Powered by{" "}
            <a href="https://thegyaanproject.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-60">
              The Gyaan Project
            </a>{" "}
            Podcast
          </p>
        </div>
        <Link
          href="/donate"
          className="justify-self-end col-start-2 row-start-1 lg:col-start-3 t-small inline-flex items-center justify-end min-h-11 hover:opacity-60"
        >
          Support
        </Link>
      </div>
    </header>
  );
}
