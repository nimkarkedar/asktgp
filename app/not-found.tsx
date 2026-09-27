import Link from "next/link";
import Header from "./components/Header";

export default function NotFound() {
  return (
    <main className="min-h-dvh">
      <Header />
      <div className="mx-auto max-w-[592px] px-4 pt-16 text-center">
        <p className="t-heading">This answer isn&apos;t here.</p>
        <p className="mt-4 t-body text-ink-muted">
          It may have been removed, or the link is incomplete.
        </p>
        <Link href="/" className="mt-8 inline-flex min-h-11 items-center underline underline-offset-2 hover:opacity-60">
          Ask your own question
        </Link>
      </div>
    </main>
  );
}
