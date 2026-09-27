import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Header from "../components/Header";
import Asking from "./Asking";

export const metadata: Metadata = { title: "Asking… — asktgp", robots: { index: false } };

// A new question: shows the question straight away, asks, then hands over
// to the answer's permanent /q/{slug} page.
export default async function AskPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const question = (q ?? "").trim().slice(0, 300);
  if (!question) redirect("/");

  return (
    <main className="min-h-dvh">
      <Header />
      <Asking question={question} />
    </main>
  );
}
