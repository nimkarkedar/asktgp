import Link from "next/link";

// After the share row on /q/{slug}: a gentle ask to support
// the project. Uses the accent (the Submit colour) as the page's one call to action.
export default function SupportCallout() {
  return (
    <aside
      aria-label="Support The Gyaan Project"
      className="mt-10 flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between lg:p-6"
    >
      <div>
        <p className="t-heading">Found this helpful?</p>
        <p className="mt-1 t-small text-ink-muted">
          The Gyaan Project has been a labour of love since 2016. Your support keeps these conversations going.
        </p>
      </div>
      <Link
        href="/donate"
        className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-accent px-5 t-heading text-white transition-[transform,opacity] duration-150 ease-out hover:opacity-90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        Support the project
        <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </Link>
    </aside>
  );
}
