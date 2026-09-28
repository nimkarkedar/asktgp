import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "../../components/Header";
import AnswerNav from "../../components/AnswerNav";
import ShareRow from "../../components/ShareRow";
import SupportCallout from "../../components/SupportCallout";
import { AnswerBody, QuestionBox } from "../../components/AnswerBody";
import { getNeighbours, getQABySlug } from "@/lib/qa";

// One Q&A on its own page, served from storage (no new AI call).
export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const qa = await getQABySlug(slug);
  if (!qa) return { title: "asktgp" };

  const title = `${qa.question} — asktgp`;
  const firstLine = qa.long_answer.split(/\s+/).slice(0, 30).join(" ");
  const description = `${qa.short_answer} ${firstLine}…`;
  return {
    title,
    description,
    alternates: { canonical: `/q/${qa.slug}` },
    openGraph: {
      title: qa.question,
      description: qa.short_answer,
      url: `/q/${qa.slug}`,
      siteName: "asktgp",
      type: "article",
      images: [{ url: "/open_graph.png", width: 1200, height: 630, alt: "asktgp" }],
    },
    twitter: {
      card: "summary_large_image",
      title: qa.question,
      description: qa.short_answer,
      images: ["/open_graph.png"],
    },
  };
}

export default async function QuestionPage({ params }: Props) {
  const { slug } = await params;
  const qa = await getQABySlug(slug);
  if (!qa) notFound();
  const { prev, next } = await getNeighbours(qa);

  return (
    <main className="flex-1">
      <Header />
      <article className="mx-auto w-full max-w-[592px] px-4 pt-8 lg:pt-14 pb-4 lg:pb-0">
        <QuestionBox question={qa.question} />
        <AnswerBody shortAnswer={qa.short_answer} longAnswer={qa.long_answer} />
        <ShareRow title={qa.question} path={`/q/${qa.slug}`} />
        <SupportCallout />
      </article>
      <AnswerNav prev={prev} next={next} />
    </main>
  );
}
